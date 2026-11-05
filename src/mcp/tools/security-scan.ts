import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import { runSlither, formatFindings } from "../../core/slither.js";
import { runAderyn } from "../../core/aderyn.js";
import { matchPatterns, formatMatches } from "../../core/pattern-matcher.js";
import { checkSolhintInstalled, parseSolhintOutput, formatViolations } from "../../core/solhint.js";
import { describeError } from "./tool-result.js";

export type { SlitherFinding, SlitherResult } from "../../core/slither.js";
export type { AderynFinding } from "../../core/aderyn.js";
export type { SolhintViolation } from "../../core/solhint.js";
export type { PatternMatch } from "../../core/pattern-matcher.js";

export function registerSecurityScanTools(server: McpServer): void {
  server.registerTool(
    "run_security_scan",
    {
      description:
        "PRIMARY tool for security analysis of Solidity code. Slither (90+ detectors), Aderyn " +
        "(fast Rust), Solhint (lint + security) need their CLIs installed; patterns runs 9 AST " +
        "detectors with regex fallback on inline code, no CLI needed. " +
        "Trigger: 'find vulnerabilities', 'audit my contract', 'run security scan'. " +
        "NOT for: vulnerability lookups by name or SCWE ID (use lookup_knowledge).",
      inputSchema: {
        tool: z
          .enum(["slither", "aderyn", "solhint", "patterns"])
          .describe(
            "slither: most comprehensive, 90+ vulnerability detectors (Python) | " +
              "aderyn: fast Rust-based pattern detection | " +
              "solhint: linting, style, and basic security rules (Node.js) | " +
              "patterns: AST + regex scan of inline code (requires 'code'), no CLI, approximate",
          ),
        path: z
          .string()
          .optional()
          .describe("Path to Solidity project or file (default: current directory)"),
        detectors: z
          .array(z.string())
          .optional()
          .describe('Slither detectors to run (e.g., ["reentrancy-eth"])'),
        exclude: z.array(z.string()).optional().describe("Slither detectors to exclude"),
        jsonOutput: z.boolean().optional().describe("Return raw JSON output (Slither only)"),
        outputFormat: z
          .enum(["json", "markdown"])
          .optional()
          .describe("Output format for Aderyn results"),
        files: z
          .array(z.string())
          .optional()
          .describe('Solhint files to lint (e.g., ["contracts/*.sol"])'),
        rules: z
          .record(z.string(), z.string())
          .optional()
          .describe("Solhint rule configuration overrides"),
        code: z.string().optional().describe("Solidity source code to scan (patterns only)"),
        checkIds: z
          .array(z.string())
          .optional()
          .describe("Limit checks to specific SCWE IDs (patterns only)"),
      },
    },
    async ({ tool, path, detectors, exclude, jsonOutput, outputFormat, files, code, checkIds }) => {
      switch (tool) {
        case "patterns": {
          if (!code) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: '❌ **Missing Parameter**\n\n`code` is required when tool is "patterns".',
                },
              ],
              isError: true,
            };
          }
          try {
            return {
              content: [
                { type: "text" as const, text: formatMatches(matchPatterns(code, checkIds)) },
              ],
              isError: false,
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error scanning vulnerability patterns: ${describeError(error)}`,
                },
              ],
              isError: true,
            };
          }
        }

        case "slither": {
          const result = runSlither(path, detectors, exclude);
          if (!result.success) {
            return {
              content: [{ type: "text" as const, text: result.error || "Analysis failed" }],
              isError: true,
            };
          }
          if (jsonOutput) {
            return {
              content: [{ type: "text" as const, text: JSON.stringify(result.findings, null, 2) }],
              isError: false,
            };
          }
          return {
            content: [{ type: "text" as const, text: formatFindings(result.findings) }],
            isError: false,
          };
        }

        case "aderyn": {
          try {
            const result = runAderyn(path, outputFormat ?? "json");
            return {
              content: [{ type: "text" as const, text: result.text }],
              ...(result.isError ? { isError: true } : {}),
            };
          } catch (error) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Error running Aderyn analysis: ${describeError(error)}`,
                },
              ],
              isError: true,
            };
          }
        }

        case "solhint": {
          if (!checkSolhintInstalled()) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "Error: Solhint is not installed. Install it with: pnpm add -g solhint",
                },
              ],
              isError: true,
            };
          }
          try {
            const fileArgs = files && files.length > 0 ? files.join(" ") : "**/*.sol";
            const command = `solhint -f json ${fileArgs}`;
            const output = execSync(command, {
              encoding: "utf-8",
              stdio: ["pipe", "pipe", "pipe"],
            });
            const violations = parseSolhintOutput(output);
            const formatted = formatViolations(violations);
            return {
              content: [{ type: "text" as const, text: formatted }],
              isError: false,
            };
          } catch (error) {
            const errorMessage = describeError(error);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Solhint execution error: ${errorMessage}`,
                },
              ],
              isError: true,
            };
          }
        }
      }
    },
  );
}

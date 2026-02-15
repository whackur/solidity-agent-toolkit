import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import { runSlither, formatFindings } from "../../core/slither.js";
import { runAderyn } from "../../core/aderyn.js";
import { checkSolhintInstalled, parseSolhintOutput, formatViolations } from "../../core/solhint.js";

export type { SlitherFinding, SlitherResult } from "../../core/slither.js";
export type { AderynFinding } from "../../core/aderyn.js";
export type { SolhintViolation } from "../../core/solhint.js";

export function registerSecurityScanTools(server: McpServer): void {
  server.tool(
    "run_security_scan",
    "Run security analysis on Solidity contracts using Slither, Aderyn, or Solhint. " +
      "Select the tool parameter to choose which analyzer to run.",
    {
      tool: z.enum(["slither", "aderyn", "solhint"]).describe("Security tool to run"),
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
    },
    async ({ tool, path, detectors, exclude, jsonOutput, outputFormat, files }) => {
      switch (tool) {
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
                  text: `Error running Aderyn analysis: ${error instanceof Error ? error.message : String(error)}`,
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
            const errorMessage = error instanceof Error ? error.message : String(error);
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

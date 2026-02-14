import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";

export interface SolhintViolation {
  ruleId: string;
  severity: "error" | "warning";
  message: string;
  line: number;
  column: number;
  file: string;
  fix?: string;
}

export interface SolhintRule {
  name: string;
  description: string;
  category?: string;
}

export const SOLHINT_RULES: SolhintRule[] = [
  {
    name: "no-unused-vars",
    description: "Disallow unused variables",
    category: "Best Practices",
  },
  {
    name: "max-line-length",
    description: "Maximum line length",
    category: "Style",
  },
  {
    name: "no-empty-blocks",
    description: "Disallow empty blocks",
    category: "Best Practices",
  },
  {
    name: "no-constant-functions",
    description: "Disallow constant functions",
    category: "Best Practices",
  },
  {
    name: "no-global-import",
    description: "Disallow global imports",
    category: "Best Practices",
  },
  {
    name: "no-inline-assembly",
    description: "Disallow inline assembly",
    category: "Security",
  },
  {
    name: "no-named-parameters",
    description: "Disallow named parameters",
    category: "Style",
  },
  {
    name: "no-restricted-names",
    description: "Disallow restricted names",
    category: "Best Practices",
  },
  {
    name: "no-shadowing",
    description: "Disallow variable shadowing",
    category: "Best Practices",
  },
  {
    name: "no-state-functions",
    description: "Disallow state functions",
    category: "Best Practices",
  },
  {
    name: "no-tx-origin",
    description: "Disallow tx.origin usage",
    category: "Security",
  },
  {
    name: "no-unreachable-code",
    description: "Disallow unreachable code",
    category: "Best Practices",
  },
  {
    name: "ordering",
    description: "Enforce code ordering",
    category: "Style",
  },
  {
    name: "quotes",
    description: "Enforce quote style",
    category: "Style",
  },
  {
    name: "reason-string",
    description: "Require reason strings in require/revert",
    category: "Best Practices",
  },
  {
    name: "separate-by-one-line-in-contract",
    description: "Separate contract elements by one line",
    category: "Style",
  },
  {
    name: "two-lines-top-level-separator",
    description: "Require two lines between top-level elements",
    category: "Style",
  },
  {
    name: "var-name-mixedcase",
    description: "Enforce variable naming convention",
    category: "Style",
  },
  {
    name: "visibility-modifier-order",
    description: "Enforce visibility modifier order",
    category: "Style",
  },
  {
    name: "func-name-mixedcase",
    description: "Enforce function naming convention",
    category: "Style",
  },
  {
    name: "contract-name-camelcase",
    description: "Enforce contract naming convention",
    category: "Style",
  },
  {
    name: "const-name-snakecase",
    description: "Enforce constant naming convention",
    category: "Style",
  },
  {
    name: "event-name-camelcase",
    description: "Enforce event naming convention",
    category: "Style",
  },
  {
    name: "modifier-name-mixedcase",
    description: "Enforce modifier naming convention",
    category: "Style",
  },
  {
    name: "no-console",
    description: "Disallow console usage",
    category: "Best Practices",
  },
];

export function checkSolhintInstalled(): boolean {
  try {
    execSync("solhint --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function parseSolhintOutput(jsonOutput: string): SolhintViolation[] {
  try {
    const parsed = JSON.parse(jsonOutput);

    // Handle both array and object responses
    const reports = Array.isArray(parsed) ? parsed : [parsed];

    const violations: SolhintViolation[] = [];

    for (const report of reports) {
      if (report.reports && Array.isArray(report.reports)) {
        for (const violation of report.reports) {
          violations.push({
            ruleId: violation.ruleId || "unknown",
            severity: violation.severity || "warning",
            message: violation.message || "",
            line: violation.line || 0,
            column: violation.column || 0,
            file: report.file || "unknown",
            fix: violation.fix,
          });
        }
      } else if (report.file && report.reports === undefined) {
        violations.push({
          ruleId: report.ruleId || "unknown",
          severity: report.severity || "warning",
          message: report.message || "",
          line: report.line || 0,
          column: report.column || 0,
          file: report.file,
          fix: report.fix,
        });
      }
    }

    return violations.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      if (a.line !== b.line) return a.line - b.line;
      return a.column - b.column;
    });
  } catch (error) {
    throw new Error(`Failed to parse solhint output: ${error}`);
  }
}

export function formatViolations(violations: SolhintViolation[]): string {
  if (violations.length === 0) {
    return "No linting violations found.";
  }

  const header = `Found ${violations.length} linting violation(s):\n`;
  const grouped = violations.reduce(
    (acc, v) => {
      if (!acc[v.file]) acc[v.file] = [];
      acc[v.file].push(v);
      return acc;
    },
    {} as Record<string, SolhintViolation[]>,
  );

  const body = Object.entries(grouped)
    .map(([file, fileViolations]) => {
      const fileHeader = `\n${file}:`;
      const violations = fileViolations
        .map(
          (v, i) =>
            `  ${i + 1}. [${v.severity.toUpperCase()}] ${v.ruleId}\n` +
            `     Line ${v.line}:${v.column}: ${v.message}`,
        )
        .join("\n");
      return fileHeader + "\n" + violations;
    })
    .join("\n");

  return header + body;
}

export function registerSolhintTools(server: McpServer): void {
  server.tool(
    "run_solhint",
    "Run Solhint linter on Solidity files and return violations",
    {
      files: z
        .array(z.string())
        .optional()
        .describe('Solidity files to lint (e.g., ["contracts/*.sol"])'),
      rules: z
        .record(z.string(), z.string())
        .optional()
        .describe("Optional rule configuration overrides"),
    },
    async ({ files }) => {
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
    },
  );

  server.tool(
    "list_solhint_rules",
    "List all available Solhint rules with descriptions",
    {},
    async () => {
      const grouped = SOLHINT_RULES.reduce(
        (acc, rule) => {
          const category = rule.category || "Other";
          if (!acc[category]) acc[category] = [];
          acc[category].push(rule);
          return acc;
        },
        {} as Record<string, SolhintRule[]>,
      );

      const formatted = Object.entries(grouped)
        .map(([category, rules]) => {
          const header = `\n${category}:`;
          const rulesList = rules
            .map((r, i) => `  ${i + 1}. ${r.name}: ${r.description}`)
            .join("\n");
          return header + "\n" + rulesList;
        })
        .join("\n");

      const header = `Available Solhint Rules (${SOLHINT_RULES.length} total):`;
      return {
        content: [{ type: "text" as const, text: header + formatted }],
        isError: false,
      };
    },
  );
}

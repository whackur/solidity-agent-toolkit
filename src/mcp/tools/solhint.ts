import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import {
  checkSolhintInstalled,
  parseSolhintOutput,
  formatViolations,
  SOLHINT_RULES,
} from "../../core/solhint.js";

export type { SolhintViolation, SolhintRule } from "../../core/solhint.js";
export {
  checkSolhintInstalled,
  parseSolhintOutput,
  formatViolations,
  SOLHINT_RULES,
} from "../../core/solhint.js";

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
        {} as Record<string, typeof SOLHINT_RULES>,
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

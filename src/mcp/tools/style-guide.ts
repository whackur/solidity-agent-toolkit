import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import { checkForgeInstalled } from "../../core/compile.js";
import { checkAllRules, formatStyleViolations } from "../../knowledge/style-rules.js";

export function registerStyleGuideTools(server: McpServer): void {
  server.registerTool(
    "check_code_style",
    {
      description:
        "Check Solidity code against the official Solidity Style Guide (12 rules), or auto-format using forge fmt. " +
        "Default: report style violations (naming, ordering, spacing). No external tools required. " +
        "Set fix=true to auto-format the code (requires Foundry CLI for forge fmt). " +
        "Use when: 'check code style', 'format my contract', 'fix naming conventions'.",
      inputSchema: {
        code: z.string().describe("Solidity source code to check or format"),
        fix: z
          .boolean()
          .optional()
          .describe("If true, format the code using forge fmt instead of checking style rules"),
      },
    },
    async ({ code, fix }) => {
      if (fix) {
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text:
                  "forge fmt is not available. Install Foundry to use code formatting:\n\n" +
                  "```bash\ncurl -L https://foundry.paradigm.xyz | bash\nfoundryup\n```",
              },
            ],
            isError: true,
          };
        }

        try {
          const formatted = execSync("forge fmt --raw -", {
            input: code,
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
          });

          return {
            content: [{ type: "text" as const, text: formatted }],
            isError: false,
          };
        } catch (error: unknown) {
          const execErr = error as Error & { stderr?: string };
          const stderr = execErr.stderr || "";
          return {
            content: [
              {
                type: "text" as const,
                text: `forge fmt error: ${stderr || execErr.message || String(error)}`,
              },
            ],
            isError: true,
          };
        }
      }

      try {
        const violations = checkAllRules(code);
        const formatted = formatStyleViolations(violations);

        return {
          content: [{ type: "text" as const, text: formatted }],
          isError: false,
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Style check error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

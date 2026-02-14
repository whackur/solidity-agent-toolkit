import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import { checkAllRules, formatStyleViolations, STYLE_RULES } from "../knowledge/style-rules.js";

function checkForgeInstalled(): boolean {
  try {
    execSync("forge --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function registerStyleGuideTools(server: McpServer): void {
  server.registerTool(
    "check_style",
    {
      description:
        "Check Solidity code against the official Solidity Style Guide. " +
        "Returns style violations with line numbers and fix suggestions. " +
        `Checks ${STYLE_RULES.length} rules including indentation, naming conventions, function ordering, and NatSpec.`,
      inputSchema: z.object({
        code: z.string().describe("Solidity source code to check"),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ code }) => {
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

  server.registerTool(
    "format_code",
    {
      description:
        "Format Solidity code using forge fmt. Requires Foundry to be installed. " +
        "Writes code to a temp file, formats it, and returns the result.",
      inputSchema: z.object({
        code: z.string().describe("Solidity source code to format"),
      }),
      annotations: { idempotentHint: true },
    },
    async ({ code }) => {
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
      } catch (error: any) {
        const stderr = error.stderr || "";
        return {
          content: [
            {
              type: "text" as const,
              text: `forge fmt error: ${stderr || error.message || String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

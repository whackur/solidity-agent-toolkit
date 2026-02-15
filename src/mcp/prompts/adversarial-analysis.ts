import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildAdversarialPrompt } from "./adversarial-analysis-logic.js";

export function registerAdversarialPrompts(server: McpServer): void {
  server.prompt(
    "adversarial_analysis",
    "Guided adversarial scenario analysis for Solidity contracts — identifies attack vectors from an attacker's perspective",
    {
      contractCode: z.string().describe("The Solidity contract code to analyze"),
      focusCategory: z
        .string()
        .optional()
        .describe(
          "Optional: focus on a specific attack category (e.g., 'reentrancy', 'flash-loan')",
        ),
    },
    async ({ contractCode, focusCategory }) => {
      const { system, user } = buildAdversarialPrompt(contractCode, focusCategory);
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `SYSTEM INSTRUCTIONS:\n${system}`,
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: user,
            },
          },
        ],
      };
    },
  );
}

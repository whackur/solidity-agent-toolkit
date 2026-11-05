import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { systemUserPrompt } from "./prompt-messages.js";
import { buildAdversarialPrompt } from "./adversarial-analysis-logic.js";

export function registerAdversarialPrompts(server: McpServer): void {
  server.registerPrompt(
    "adversarial_analysis",
    {
      description:
        "Generate an attacker-perspective threat analysis for a Solidity contract. " +
        "Maps detected contract features to 17 real-world attack scenarios with concrete attack steps. " +
        "Optionally focus on a specific category (e.g., reentrancy, flash-loan, mev-frontrunning). " +
        "Use when: 'think like an attacker', 'threat model this contract', 'what could go wrong?'.",
      argsSchema: {
        contractCode: z.string().describe("The Solidity contract code to analyze"),
        focusCategory: z
          .string()
          .optional()
          .describe(
            "Optional: focus on a specific attack category (e.g., 'reentrancy', 'flash-loan')",
          ),
      },
    },
    async ({ contractCode, focusCategory }) => {
      const { system, user } = buildAdversarialPrompt(contractCode, focusCategory);
      return systemUserPrompt(system, user);
    },
  );
}

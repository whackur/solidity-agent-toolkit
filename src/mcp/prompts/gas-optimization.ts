import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { loadGuide } from "../../knowledge/guide-loader.js";
import { userPrompt } from "./prompt-messages.js";

function buildGasOptimizationPrompt(
  code: string,
  storageLayout: string | undefined,
  guide: string,
): string {
  let prompt = `You are reviewing Solidity code for gas optimization. Use the following methodology guide as the source of optimization advice, and recommend changes only when they fit the code and measured costs.

### Gas Optimization Guide

${guide}

### Contract Code

\`\`\`solidity
${code}
\`\`\`
`;

  if (storageLayout) {
    prompt += `
### Provided Storage Layout

\`\`\`json
${storageLayout}
\`\`\`

Use this layout to identify actual slot boundaries and packing opportunities. Do not recommend reordering storage in an upgradeable contract without a safe, verified migration.
`;
  }

  return `${prompt}
### Review Instructions

- Apply the guide's measure-first workflow; distinguish measured results from estimates and request a baseline when none is provided.
- Review relevant optimization candidates without treating them as mandatory changes.
- Preserve behavior, security invariants, and compatibility. Explain tradeoffs and evidence for each recommendation.
- If storage layout is provided, describe slot usage and any safe packing opportunity.
`;
}

export function registerGasOptimizationPrompts(server: McpServer): void {
  server.registerPrompt(
    "optimize_gas",
    {
      description:
        "Generate a measure-first gas optimization analysis for Solidity code using the gas guide. " +
        "Optionally accepts storage layout JSON for slot-level analysis. " +
        "Use when: 'optimize gas', 'reduce gas costs', 'how to make this cheaper'.",
      argsSchema: {
        code: z.string().describe("The Solidity contract code to analyze"),
        storageLayout: z
          .string()
          .optional()
          .describe("Optional JSON storage layout for packing analysis"),
      },
    },
    async ({ code, storageLayout }) => {
      const guide = loadGuide("gas-optimization");
      if (!guide.success || guide.content === undefined) {
        throw new Error(guide.error ?? 'The "gas-optimization" guide is unavailable');
      }
      return userPrompt(buildGasOptimizationPrompt(code, storageLayout, guide.content));
    },
  );
}

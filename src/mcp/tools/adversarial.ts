import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  analyzeAdversarialScenarios,
  formatAdversarialAnalysis,
} from "../../core/adversarial-analysis.js";

export type {
  DetectedFeature,
  ScenarioMatch,
  AdversarialAnalysisResult,
} from "../../core/adversarial-analysis.js";
export { analyzeAdversarialScenarios } from "../../core/adversarial-analysis.js";

export function registerAdversarialTools(server: McpServer): void {
  server.tool(
    "analyze_adversarial_scenarios",
    "Analyze Solidity contract code to identify applicable adversarial attack scenarios based on detected contract features",
    {
      code: z.string().describe("Solidity contract code to analyze for adversarial scenarios"),
      categories: z
        .array(z.string())
        .optional()
        .describe(
          "Optional: filter by specific attack categories (e.g., 'reentrancy', 'flash-loan')",
        ),
    },
    async ({ code, categories }) => {
      const result = analyzeAdversarialScenarios(code);

      let filtered = result;
      if (categories && categories.length > 0) {
        const categorySet = new Set(categories.map((c) => c.toLowerCase()));
        filtered = {
          ...result,
          matchedScenarios: result.matchedScenarios.filter((m) =>
            categorySet.has(m.scenario.category.toLowerCase()),
          ),
        };
      }

      const formatted = formatAdversarialAnalysis(filtered);
      return {
        content: [{ type: "text" as const, text: formatted }],
        isError: false,
      };
    },
  );
}

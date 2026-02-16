import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  analyzeAdversarialScenarios,
  formatAdversarialAnalysis,
} from "../../core/adversarial-analysis.js";
import { analyzeProxySafety, formatProxySafetyResult } from "../../core/proxy-safety.js";
import { checkERCCompliance, formatComplianceResult } from "../../core/erc-compliance.js";
import {
  analyzeAccessControl,
  formatAccessControlMatrix,
} from "../../core/access-control-matrix.js";
import { extractDependencies, formatDependencyGraph } from "../../core/dependency-graph.js";

export type {
  DetectedFeature,
  ScenarioMatch,
  AdversarialAnalysisResult,
} from "../../core/adversarial-analysis.js";
export type { ProxySafetyFinding, ProxySafetyResult } from "../../core/proxy-safety.js";
export type { ComplianceResult } from "../../core/erc-compliance.js";
export type { FunctionAccessEntry, AccessControlMatrix } from "../../core/access-control-matrix.js";
export type {
  ImportDependency,
  InheritanceDependency,
  LibraryUsage,
  ContractInfo,
  AssociationDependency,
  DependencyGraph,
} from "../../core/dependency-graph.js";

export function registerContractAnalysisTools(server: McpServer): void {
  server.registerTool(
    "analyze_contract",
    {
      description:
        "Analyze Solidity contract code for adversarial scenarios, proxy/upgrade safety, " +
        "ERC compliance, access control patterns, or dependency graphs.",
      inputSchema: {
        analysis: z
          .enum(["adversarial", "proxy_safety", "erc_compliance", "access_control", "dependencies"])
          .describe("Type of analysis to perform"),
        code: z.string().describe("Solidity source code to analyze"),
        categories: z
          .array(z.string())
          .optional()
          .describe("Filter by attack categories (adversarial only)"),
        standard: z
          .string()
          .optional()
          .describe("ERC standard to check against (erc_compliance only, e.g., ERC20)"),
      },
    },
    async ({ analysis, code, categories, standard }) => {
      switch (analysis) {
        case "adversarial": {
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
        }

        case "proxy_safety": {
          const result = analyzeProxySafety(code);
          return {
            content: [{ type: "text" as const, text: formatProxySafetyResult(result) }],
            isError: false,
          };
        }

        case "erc_compliance": {
          if (!standard) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "standard parameter is required for erc_compliance analysis",
                },
              ],
              isError: true,
            };
          }
          const result = checkERCCompliance(code, standard);
          const formatted = formatComplianceResult(result);
          return {
            content: [{ type: "text" as const, text: formatted }],
            isError: false,
          };
        }

        case "access_control": {
          const result = analyzeAccessControl(code);
          return {
            content: [{ type: "text" as const, text: formatAccessControlMatrix(result) }],
            isError: false,
          };
        }

        case "dependencies": {
          const graph = extractDependencies(code);
          return {
            content: [{ type: "text" as const, text: formatDependencyGraph(graph) }],
            isError: false,
          };
        }
      }
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
} from "../../core/compile.js";
import { runGasSnapshot, formatGasSnapshot } from "../../core/gas-snapshot.js";
import { runGasReport, formatGasEstimates } from "../../core/gas-report.js";

export type { GasSnapshot } from "../../core/gas-snapshot.js";
export type { GasEstimate } from "../../core/gas-report.js";

const AnalyzeGasSchema = z.object({
  mode: z
    .enum(["snapshot", "report"])
    .default("report")
    .describe("Analysis mode: snapshot for gas snapshots, report for function-level gas estimates"),
  contractName: z
    .string()
    .optional()
    .describe("Contract name to filter gas report (report mode only)"),
  functionName: z
    .string()
    .optional()
    .describe("Function name to filter gas report (report mode only)"),
  compare: z.boolean().optional().describe("Compare with previous snapshot (snapshot mode only)"),
});

export function registerGasTools(server: McpServer): void {
  server.registerTool(
    "analyze_gas",
    {
      description:
        "Analyze gas consumption of Solidity contracts. Requires Foundry CLI. " +
        "'report' mode (default): run tests and show per-function gas estimates (min/avg/median/max). " +
        "'snapshot' mode: generate gas snapshot, optionally compare with previous snapshot to detect regressions. " +
        "Use when: 'how much gas does this use?', 'gas report', 'compare gas usage', 'optimize gas'.",
      inputSchema: AnalyzeGasSchema.shape,
    },
    async ({ mode, contractName, functionName, compare }) => {
      try {
        if (!checkForgeInstalled()) {
          return {
            content: [{ type: "text" as const, text: FORGE_INSTALL_INSTRUCTIONS }],
            isError: true,
          };
        }

        if (!isFoundryProject()) {
          return {
            content: [
              {
                type: "text" as const,
                text: "❌ **Not a Foundry Project**\n\nNo `foundry.toml` found in the current directory.\n\nTo initialize a Foundry project:\n```bash\nforge init\n```",
              },
            ],
            isError: true,
          };
        }

        if (mode === "snapshot") {
          const result = runGasSnapshot(compare);
          if (!result.success) {
            return {
              content: [
                { type: "text" as const, text: `❌ **Gas Snapshot Error**\n\n${result.error}` },
              ],
              isError: true,
            };
          }
          const formatted = formatGasSnapshot(result.snapshots, result.compare);
          return { content: [{ type: "text" as const, text: formatted }] };
        }

        const result = runGasReport(contractName, functionName);
        if (!result.success) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ **Gas Report Error**\n\n${result.error}`,
              },
            ],
            isError: true,
          };
        }
        const formatted = formatGasEstimates(result.estimates);
        return { content: [{ type: "text" as const, text: formatted }] };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error analyzing gas: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

// Backward compatibility alias
export { registerGasTools as registerGasAnalysisTools };

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
} from "../../core/compile.js";
import {
  parseGasSnapshot,
  parseGasSnapshotDiff,
  formatGasSnapshot,
} from "../../core/gas-snapshot.js";
import { parseGasReport, formatGasEstimates } from "../../core/gas-report.js";

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
        "Analyze gas usage of Solidity contracts. Use 'snapshot' mode for gas snapshots, " +
        "or 'report' mode for function-level gas estimates.",
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
          return handleSnapshot(compare);
        }

        return handleReport(contractName, functionName);
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

function handleSnapshot(compare?: boolean) {
  const command = compare ? "forge snapshot --diff" : "forge snapshot";

  let output: string;
  try {
    output = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error: unknown) {
    const execErr = error as Error & { stdout?: string; stderr?: string };
    output = execErr.stdout || "";
    if (!output && execErr.stderr) {
      return {
        content: [
          { type: "text" as const, text: `❌ **Gas Snapshot Error**\n\n${execErr.stderr}` },
        ],
        isError: true,
      };
    }
  }

  const snapshots = compare ? parseGasSnapshotDiff(output) : parseGasSnapshot(output);
  const formatted = formatGasSnapshot(snapshots, compare || false);
  return { content: [{ type: "text" as const, text: formatted }] };
}

function handleReport(contractName?: string, functionName?: string) {
  let output: string;
  try {
    output = execSync("forge test --gas-report", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (error: unknown) {
    const execErr = error as Error & { stdout?: string; stderr?: string };
    output = execErr.stdout || "";
    if (!output) {
      return {
        content: [
          {
            type: "text" as const,
            text: `❌ **Gas Report Error**\n\n${execErr.stderr || execErr.message}`,
          },
        ],
        isError: true,
      };
    }
  }

  const estimates = parseGasReport(output, contractName, functionName);
  const formatted = formatGasEstimates(estimates);
  return { content: [{ type: "text" as const, text: formatted }] };
}

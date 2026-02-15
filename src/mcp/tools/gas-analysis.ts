import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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
import {
  parseStorageLayout,
  formatStorageLayout,
  parseGasReport,
  formatGasEstimates,
} from "../../core/gas-report.js";

export type { GasSnapshot } from "../../core/gas-snapshot.js";
export type { StorageSlot, GasEstimate } from "../../core/gas-report.js";

const GasSnapshotSchema = z.object({
  compare: z.boolean().optional().describe("If true, compare with previous snapshot and show diff"),
});

const InspectStorageSchema = z.object({
  contractName: z.string().describe('Contract name to inspect storage layout (e.g., "MyContract")'),
});

const EstimateGasSchema = z.object({
  contractName: z.string().optional().describe("Optional contract name to filter gas report"),
  functionName: z.string().optional().describe("Optional function name to filter gas report"),
});

export function registerGasAnalysisTools(server: McpServer): void {
  server.tool(
    "gas_snapshot",
    "Generate gas usage snapshot for all test functions using forge snapshot. Optionally compare with previous snapshot to show gas usage changes.",
    GasSnapshotSchema.shape,
    async ({ compare }) => {
      try {
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text: FORGE_INSTALL_INSTRUCTIONS,
              },
            ],
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

        const command = compare ? "forge snapshot --diff" : "forge snapshot";

        let output: string;
        try {
          output = execSync(command, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024,
          });
        } catch (error: any) {
          output = error.stdout || "";
          if (!output && error.stderr) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Gas Snapshot Error**\n\n${error.stderr}`,
                },
              ],
              isError: true,
            };
          }
        }

        const snapshots = compare ? parseGasSnapshotDiff(output) : parseGasSnapshot(output);
        const formatted = formatGasSnapshot(snapshots, compare || false);

        return {
          content: [
            {
              type: "text" as const,
              text: formatted,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error generating gas snapshot: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "inspect_storage",
    "Inspect storage layout of a Solidity contract using forge inspect. Shows how state variables are packed into storage slots and provides optimization hints.",
    InspectStorageSchema.shape,
    async ({ contractName }) => {
      try {
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text: FORGE_INSTALL_INSTRUCTIONS,
              },
            ],
            isError: true,
          };
        }

        if (!isFoundryProject()) {
          return {
            content: [
              {
                type: "text" as const,
                text: "❌ **Not a Foundry Project**\n\nNo `foundry.toml` found in the current directory.",
              },
            ],
            isError: true,
          };
        }

        const output = execSync(`forge inspect ${contractName} storage`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });

        const slots = parseStorageLayout(output);
        const formatted = formatStorageLayout(slots, contractName);

        return {
          content: [
            {
              type: "text" as const,
              text: formatted,
            },
          ],
        };
      } catch (error: any) {
        const errorMessage = error.stderr || error.message || String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ **Error Inspecting Storage**\n\n${errorMessage}\n\nMake sure the contract is compiled first:\n\`\`\`bash\nforge build\n\`\`\``,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "estimate_gas",
    "Get gas usage estimates for contract functions from forge test gas report. Shows deployment cost and per-function gas usage statistics.",
    EstimateGasSchema.shape,
    async ({ contractName, functionName }) => {
      try {
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text: FORGE_INSTALL_INSTRUCTIONS,
              },
            ],
            isError: true,
          };
        }

        if (!isFoundryProject()) {
          return {
            content: [
              {
                type: "text" as const,
                text: "❌ **Not a Foundry Project**\n\nNo `foundry.toml` found in the current directory.",
              },
            ],
            isError: true,
          };
        }

        let output: string;
        try {
          output = execSync("forge test --gas-report", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024,
          });
        } catch (error: any) {
          output = error.stdout || "";
          if (!output) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Gas Report Error**\n\n${error.stderr || error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        const estimates = parseGasReport(output, contractName, functionName);
        const formatted = formatGasEstimates(estimates);

        return {
          content: [
            {
              type: "text" as const,
              text: formatted,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error estimating gas: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
} from "../../core/compile.js";
import {
  parseStorageLayout,
  formatStorageLayout,
  parseGasReport,
  formatGasEstimates,
} from "../../core/gas-report.js";

export type { StorageSlot, GasEstimate } from "../../core/gas-report.js";

const InspectStorageSchema = z.object({
  contractName: z.string().describe('Contract name to inspect storage layout (e.g., "MyContract")'),
});

const EstimateGasSchema = z.object({
  contractName: z.string().optional().describe("Optional contract name to filter gas report"),
  functionName: z.string().optional().describe("Optional function name to filter gas report"),
});

export function registerGasInspectionTools(server: McpServer): void {
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
      } catch (error: unknown) {
        const execErr = error as Error & { stderr?: string };
        const errorMessage = execErr.stderr || execErr.message || String(error);
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

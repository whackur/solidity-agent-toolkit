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

export type { GasSnapshot } from "../../core/gas-snapshot.js";

const GasSnapshotSchema = z.object({
  compare: z.boolean().optional().describe("If true, compare with previous snapshot and show diff"),
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
        } catch (error: unknown) {
          const execErr = error as Error & { stdout?: string; stderr?: string };
          output = execErr.stdout || "";
          if (!output && execErr.stderr) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Gas Snapshot Error**\n\n${execErr.stderr}`,
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
}

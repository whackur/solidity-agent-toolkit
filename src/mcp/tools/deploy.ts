import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import { existsSync } from "fs";
import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
} from "../../core/compile.js";
import {
  validateNoBroadcast,
  parseDryRunOutput,
  formatDryRunResult,
  findLatestBroadcastRun,
  parseDeploymentStatus,
  formatDeploymentStatus,
} from "../../core/deploy.js";

export type { DryRunResult, DeploymentStatus } from "../../core/deploy.js";

const DryRunDeploySchema = z.object({
  scriptPath: z.string().describe('Path to the deployment script (e.g., "script/Deploy.s.sol")'),
  rpcUrl: z
    .string()
    .optional()
    .describe('RPC URL to fork from (e.g., "http://localhost:8545" or mainnet URL)'),
  forkBlockNumber: z.number().optional().describe("Optional block number to fork from"),
});

const CheckDeploymentStatusSchema = z.object({
  broadcastDir: z
    .string()
    .optional()
    .describe('Path to broadcast directory (default: "broadcast/")'),
});

export function registerDeployTools(server: McpServer): void {
  server.tool(
    "dry_run_deploy",
    "Simulate a deployment script using forge script (DRY-RUN ONLY - no actual transactions). " +
      "Returns gas estimates, contract addresses, and transaction details. " +
      "SAFETY: This tool will NEVER broadcast transactions.",
    DryRunDeploySchema.shape,
    async ({ scriptPath, rpcUrl, forkBlockNumber }) => {
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

        if (!existsSync(scriptPath)) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ **Script Not Found**\n\nThe script file \`${scriptPath}\` does not exist.`,
              },
            ],
            isError: true,
          };
        }

        let command = `forge script ${scriptPath}`;

        if (rpcUrl) {
          command += ` --fork-url ${rpcUrl}`;
        } else {
          command += " --fork-url http://localhost:8545";
        }

        if (forkBlockNumber) {
          command += ` --fork-block-number ${forkBlockNumber}`;
        }

        command += " -vvv";

        // CRITICAL SAFETY CHECK — prevents --broadcast from ever being sent
        validateNoBroadcast(command);

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
          if (!output) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Simulation Error**\n\n${execErr.message}\n\n${execErr.stderr || ""}`,
                },
              ],
              isError: true,
            };
          }
        }

        const result = parseDryRunOutput(output);
        const formattedResult = formatDryRunResult(result);

        return {
          content: [
            {
              type: "text" as const,
              text: formattedResult,
            },
          ],
        };
      } catch (error) {
        if (error instanceof Error && error.message.includes("SAFETY VIOLATION")) {
          return {
            content: [
              {
                type: "text" as const,
                text: `🚨 **${error.message}**`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Error during deployment simulation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "check_deployment_status",
    "Check the status of previous deployments by reading broadcast files. " +
      "Returns transaction hashes, contract addresses, gas used, and success/failure status.",
    CheckDeploymentStatusSchema.shape,
    async ({ broadcastDir = "broadcast" }) => {
      try {
        const latestRun = findLatestBroadcastRun(broadcastDir);

        if (!latestRun) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ **No Broadcast Files Found**\n\nNo deployment broadcast files found in \`${broadcastDir}/\`.\n\nBroadcast files are created when you run \`forge script\` with the \`--broadcast\` flag.`,
              },
            ],
            isError: false,
          };
        }

        const status = parseDeploymentStatus(latestRun);
        const formattedStatus = formatDeploymentStatus(status);

        return {
          content: [
            {
              type: "text" as const,
              text: `**Latest Broadcast:** \`${latestRun}\`\n\n${formattedStatus}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error reading deployment status: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { handleSimulate, handleStatus } from "./deploy-handlers.js";

export type { DryRunResult, DeploymentStatus } from "../../core/deploy.js";

const ManageDeploymentSchema = z.object({
  action: z
    .enum(["simulate", "status"])
    .describe("Action: simulate a deployment script or check previous deployments"),
  scriptPath: z.string().optional().describe("Path to deployment script (required for simulate)"),
  rpcUrl: z.string().optional().describe("RPC URL to fork from (simulate only)"),
  forkBlockNumber: z.number().optional().describe("Block number to fork from (simulate only)"),
  broadcastDir: z
    .string()
    .optional()
    .describe("Broadcast directory path (status only, default: broadcast/)"),
});

export function registerDeployTools(server: McpServer): void {
  server.registerTool(
    "manage_deployment",
    {
      description:
        "Manage Solidity contract deployments safely. Requires Foundry CLI. " +
        "'simulate': dry-run a deployment script against a forked network — NEVER broadcasts a real transaction. " +
        "'status': parse previous broadcast logs to check deployment results. " +
        "Use when: 'deploy my contract', 'simulate deployment', 'check deployment status', 'dry run'.",
      inputSchema: ManageDeploymentSchema.shape,
    },
    async ({ action, scriptPath, rpcUrl, forkBlockNumber, broadcastDir }) => {
      try {
        if (action === "simulate") {
          if (!scriptPath) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "❌ **Missing Parameter**\n\n`scriptPath` is required for simulate action.",
                },
              ],
              isError: true,
            };
          }
          return handleSimulate(scriptPath, rpcUrl, forkBlockNumber);
        }

        return handleStatus(broadcastDir || "broadcast");
      } catch (error) {
        if (error instanceof Error && error.message.includes("SAFETY VIOLATION")) {
          return {
            content: [{ type: "text" as const, text: `🚨 **${error.message}**` }],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Error managing deployment: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

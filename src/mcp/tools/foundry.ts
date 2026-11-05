import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  handleBuild,
  handleInspect,
  handleGasReport,
  handleGasSnapshot,
} from "./foundry-build-handlers.js";
import { handleTest } from "./foundry-test-handlers.js";
import { handleSimulate, handleStatus } from "./deploy-handlers.js";
import { describeError, errorResult, type ToolResult } from "./tool-result.js";

export type { DryRunResult, DeploymentStatus } from "../../core/deploy.js";
export type { GasSnapshot } from "../../core/gas-snapshot.js";
export type { GasEstimate } from "../../core/gas-report.js";

const RunFoundrySchema = z.object({
  action: z
    .enum([
      "build",
      "inspect",
      "test",
      "gas_report",
      "gas_snapshot",
      "deploy_simulate",
      "deploy_status",
    ])
    .describe(
      "build: forge build, report errors/warnings | inspect: ABI/bytecode/storage layout | " +
        "test: forge test (all, filtered, or single) | gas_report: per-function gas estimates | " +
        "gas_snapshot: forge snapshot, optional compare | deploy_simulate: dry-run a script on a fork " +
        "(never broadcasts) | deploy_status: parse previous broadcast logs",
    ),
  path: z.string().optional().describe("build: path to specific contract or directory"),
  contractName: z
    .string()
    .optional()
    .describe("inspect (required) / build / gas_report: contract name"),
  inspect: z.enum(["abi", "bytecode", "storage"]).optional().describe("inspect: what to inspect"),
  testFilter: z.string().optional().describe("test: test name filter (regex pattern)"),
  verbosity: z.number().min(0).max(5).optional().describe("test: verbosity level (0-5)"),
  fuzz: z.boolean().optional().describe("test: enable fuzzing with 1000 runs"),
  testContract: z
    .string()
    .optional()
    .describe("test: run a specific test contract (requires testFunction)"),
  testFunction: z
    .string()
    .optional()
    .describe("test: run a specific test function (requires testContract)"),
  functionName: z.string().optional().describe("gas_report: function name filter"),
  compare: z.boolean().optional().describe("gas_snapshot: compare with previous snapshot"),
  scriptPath: z.string().optional().describe("deploy_simulate (required): deployment script path"),
  rpcUrl: z.string().optional().describe("deploy_simulate: RPC URL to fork from"),
  forkBlockNumber: z.number().optional().describe("deploy_simulate: block number to fork from"),
  broadcastDir: z
    .string()
    .optional()
    .describe("deploy_status: broadcast directory (default: broadcast/)"),
});

type RunFoundryArgs = z.infer<typeof RunFoundrySchema>;

function runDeploy(fn: () => ToolResult): ToolResult {
  try {
    return fn();
  } catch (error) {
    if (error instanceof Error && error.message.includes("SAFETY VIOLATION")) {
      return errorResult(`🚨 **${error.message}**`);
    }
    return errorResult(`Error managing deployment: ${describeError(error)}`);
  }
}

function dispatchFoundry(args: RunFoundryArgs): ToolResult {
  switch (args.action) {
    case "build":
      return handleBuild(args.path, args.contractName);
    case "inspect":
      return handleInspect(args.contractName, args.inspect);
    case "test":
      return handleTest(args);
    case "gas_report":
      return handleGasReport(args.contractName, args.functionName);
    case "gas_snapshot":
      return handleGasSnapshot(args.compare);
    case "deploy_simulate": {
      const { scriptPath } = args;
      if (!scriptPath) {
        return errorResult(
          "❌ **Missing Parameter**\n\n`scriptPath` is required for deploy_simulate action.",
        );
      }
      return runDeploy(() => handleSimulate(scriptPath, args.rpcUrl, args.forkBlockNumber));
    }
    case "deploy_status":
      return runDeploy(() => handleStatus(args.broadcastDir || "broadcast"));
  }
}

export function registerFoundryTools(server: McpServer): void {
  server.registerTool(
    "run_foundry",
    {
      description:
        "Build, inspect, test, gas-profile, and safely simulate deployments of Solidity projects " +
        "via Foundry (forge). Requires Foundry CLI and, except for test, a foundry.toml project. " +
        "Deploy simulation forks a network and NEVER broadcasts. " +
        "Trigger: 'compile my contract', 'show ABI', 'run tests', 'gas report', " +
        "'compare gas snapshot', 'simulate deployment', 'check deployment status'.",
      inputSchema: RunFoundrySchema.shape,
    },
    async (args) => dispatchFoundry(args),
  );
}

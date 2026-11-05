import { execSync } from "child_process";
import { existsSync } from "fs";
import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
  NOT_FOUNDRY_PROJECT_MESSAGE,
} from "../../core/compile.js";
import {
  validateNoBroadcast,
  parseDryRunOutput,
  formatDryRunResult,
  findLatestBroadcastRun,
  parseDeploymentStatus,
  formatDeploymentStatus,
} from "../../core/deploy.js";
import { errorResult, type ToolResult } from "./tool-result.js";

function checkPrerequisites(): ToolResult | null {
  if (!checkForgeInstalled()) return errorResult(FORGE_INSTALL_INSTRUCTIONS);
  if (!isFoundryProject()) return errorResult(NOT_FOUNDRY_PROJECT_MESSAGE);
  return null;
}

export function handleSimulate(
  scriptPath: string,
  rpcUrl?: string,
  forkBlockNumber?: number,
): ToolResult {
  const prereqError = checkPrerequisites();
  if (prereqError) return prereqError;

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
  command += ` --fork-url ${rpcUrl || "http://localhost:8545"}`;
  if (forkBlockNumber) {
    command += ` --fork-block-number ${forkBlockNumber}`;
  }
  command += " -vvv";

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
  return { content: [{ type: "text" as const, text: formattedResult }] };
}

export function handleStatus(broadcastDir: string): ToolResult {
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
}

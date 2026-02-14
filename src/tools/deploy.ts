import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

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

export interface DryRunResult {
  success: boolean;
  transactions: {
    contractName?: string;
    address?: string;
    gasEstimate: number;
    calldata: string;
  }[];
  gasEstimate: number;
  errors?: string[];
}

export interface DeploymentStatus {
  chainId: number;
  transactions: {
    hash: string;
    contractName: string;
    address: string;
    status: "success" | "failed";
    gasUsed: number;
  }[];
}

/**
 * Check if forge is installed on the system
 */
function checkForgeInstalled(): boolean {
  try {
    execSync("forge --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get installation instructions for forge
 */
function getForgeInstallInstructions(): string {
  return `Forge is not installed. Please install Foundry:

**Installation:**
\`\`\`bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
\`\`\`

**Verify installation:**
\`\`\`bash
forge --version
\`\`\`

For more information, visit: https://book.getfoundry.sh/getting-started/installation`;
}

/**
 * Check if current directory is a Foundry project
 */
function isFoundryProject(): boolean {
  return existsSync("foundry.toml");
}

/**
 * CRITICAL SAFETY CHECK: Ensure --broadcast is NOT in the command
 */
function validateNoBroadcast(command: string): void {
  if (command.includes("--broadcast")) {
    throw new Error(
      "SAFETY VIOLATION: --broadcast flag detected. This tool only supports dry-run simulations. " +
        "Remove --broadcast to proceed with simulation only.",
    );
  }
}

/**
 * Parse forge script verbose output for dry-run results
 */
function parseDryRunOutput(output: string): DryRunResult {
  const result: DryRunResult = {
    success: false,
    transactions: [],
    gasEstimate: 0,
    errors: [],
  };

  const lines = output.split("\n");
  let currentTx: any = {};
  let totalGas = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for success indicators
    if (line.includes("Script ran successfully") || line.includes("SIMULATION COMPLETE")) {
      result.success = true;
    }

    // Check for errors
    if (line.includes("Error:") || line.includes("error:") || line.includes("failed")) {
      const errorLine = line.trim();
      if (errorLine && !errorLine.includes("== Logs ==")) {
        result.errors?.push(errorLine);
      }
    }

    // Parse contract deployments
    // Pattern: "Contract deployed at: 0x..."
    if (line.includes("deployed") || line.includes("Deployed")) {
      const addressMatch = line.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        currentTx.address = addressMatch[0];
      }
    }

    // Parse contract names from CREATE operations
    // Pattern: "CREATE" or "Contract: ContractName"
    if (line.includes("CREATE") || line.includes("Contract:")) {
      const nameMatch = line.match(/Contract:\s*(\w+)/) || line.match(/CREATE\s+(\w+)/);
      if (nameMatch) {
        currentTx.contractName = nameMatch[1];
      }
    }

    // Parse gas estimates
    // Pattern: "gas: 123456" or "(gas: 123456)"
    const gasMatch = line.match(/gas:\s*(\d+)/i);
    if (gasMatch) {
      const gas = parseInt(gasMatch[1], 10);
      currentTx.gasEstimate = gas;
      totalGas += gas;
    }

    // Parse calldata
    // Pattern: "calldata: 0x..." or "data: 0x..."
    const calldataMatch = line.match(/(?:calldata|data):\s*(0x[a-fA-F0-9]+)/i);
    if (calldataMatch) {
      currentTx.calldata = calldataMatch[1];
    }

    // When we have enough info for a transaction, save it
    if (currentTx.address || currentTx.calldata) {
      // Check if this is a complete transaction
      if (currentTx.gasEstimate || currentTx.calldata) {
        result.transactions.push({
          contractName: currentTx.contractName,
          address: currentTx.address,
          gasEstimate: currentTx.gasEstimate || 0,
          calldata: currentTx.calldata || "0x",
        });
        currentTx = {};
      }
    }
  }

  result.gasEstimate = totalGas;

  // If no explicit success marker but no errors and has transactions, consider it successful
  if (!result.success && result.errors?.length === 0 && result.transactions.length > 0) {
    result.success = true;
  }

  // If we have errors, mark as failed
  if (result.errors && result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

/**
 * Find the latest broadcast run JSON file
 */
function findLatestBroadcastRun(broadcastDir: string): string | null {
  if (!existsSync(broadcastDir)) {
    return null;
  }

  // Look for chain directories (numeric)
  const chainDirs = readdirSync(broadcastDir).filter((dir) => {
    const fullPath = join(broadcastDir, dir);
    return statSync(fullPath).isDirectory() && /^\d+$/.test(dir);
  });

  if (chainDirs.length === 0) {
    return null;
  }

  // Check each chain directory for run-latest.json
  for (const chainDir of chainDirs) {
    const latestPath = join(broadcastDir, chainDir, "run-latest.json");
    if (existsSync(latestPath)) {
      return latestPath;
    }

    // If no run-latest.json, find the most recent timestamped run
    const chainPath = join(broadcastDir, chainDir);
    const runFiles = readdirSync(chainPath)
      .filter((file) => file.endsWith(".json") && file !== "run-latest.json")
      .map((file) => ({
        file,
        path: join(chainPath, file),
        mtime: statSync(join(chainPath, file)).mtime,
      }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

    if (runFiles.length > 0) {
      return runFiles[0].path;
    }
  }

  return null;
}

/**
 * Parse broadcast JSON file for deployment status
 */
function parseDeploymentStatus(broadcastPath: string): DeploymentStatus {
  const content = readFileSync(broadcastPath, "utf-8");
  const data = JSON.parse(content);

  const status: DeploymentStatus = {
    chainId: data.chain || 0,
    transactions: [],
  };

  // Parse transactions from broadcast file
  if (data.transactions && Array.isArray(data.transactions)) {
    for (const tx of data.transactions) {
      status.transactions.push({
        hash: tx.hash || tx.transactionHash || "",
        contractName: tx.contractName || tx.contract || "Unknown",
        address: tx.contractAddress || tx.address || "",
        status:
          tx.status === "0x1" || tx.status === 1 || tx.status === "success" ? "success" : "failed",
        gasUsed: parseInt(tx.gasUsed || tx.gas || "0", 10),
      });
    }
  }

  // Alternative format: receipts array
  if (data.receipts && Array.isArray(data.receipts)) {
    for (const receipt of data.receipts) {
      status.transactions.push({
        hash: receipt.transactionHash || "",
        contractName: receipt.contractName || "Unknown",
        address: receipt.contractAddress || "",
        status: receipt.status === "0x1" || receipt.status === 1 ? "success" : "failed",
        gasUsed: parseInt(receipt.gasUsed || "0", 10),
      });
    }
  }

  return status;
}

/**
 * Format dry-run result for display
 */
function formatDryRunResult(result: DryRunResult): string {
  let output = "";

  if (result.success) {
    output += "✅ **Deployment Simulation Successful**\n\n";
  } else {
    output += "❌ **Deployment Simulation Failed**\n\n";
  }

  if (result.transactions.length > 0) {
    output += `**Transactions (${result.transactions.length}):**\n\n`;
    for (let i = 0; i < result.transactions.length; i++) {
      const tx = result.transactions[i];
      output += `**Transaction ${i + 1}:**\n`;
      if (tx.contractName) {
        output += `- Contract: ${tx.contractName}\n`;
      }
      if (tx.address) {
        output += `- Address: ${tx.address}\n`;
      }
      output += `- Gas Estimate: ${tx.gasEstimate.toLocaleString()}\n`;
      if (tx.calldata && tx.calldata !== "0x") {
        output += `- Calldata: ${tx.calldata.substring(0, 66)}${tx.calldata.length > 66 ? "..." : ""}\n`;
      }
      output += "\n";
    }
  }

  output += `**Total Gas Estimate:** ${result.gasEstimate.toLocaleString()}\n\n`;

  if (result.errors && result.errors.length > 0) {
    output += `**Errors (${result.errors.length}):**\n`;
    for (const error of result.errors) {
      output += `- ${error}\n`;
    }
    output += "\n";
  }

  output += "⚠️  **Note:** This was a simulation only. No transactions were broadcast.\n";

  return output;
}

/**
 * Format deployment status for display
 */
function formatDeploymentStatus(status: DeploymentStatus): string {
  let output = "";

  output += `**Deployment Status**\n\n`;
  output += `**Chain ID:** ${status.chainId}\n\n`;

  if (status.transactions.length === 0) {
    output += "No transactions found in broadcast file.\n";
    return output;
  }

  output += `**Transactions (${status.transactions.length}):**\n\n`;

  for (let i = 0; i < status.transactions.length; i++) {
    const tx = status.transactions[i];
    const statusIcon = tx.status === "success" ? "✅" : "❌";
    output += `${statusIcon} **Transaction ${i + 1}:** ${tx.status.toUpperCase()}\n`;
    output += `- Contract: ${tx.contractName}\n`;
    output += `- Address: ${tx.address}\n`;
    output += `- Hash: ${tx.hash}\n`;
    output += `- Gas Used: ${tx.gasUsed.toLocaleString()}\n`;
    output += "\n";
  }

  return output;
}

export function registerDeployTools(server: McpServer): void {
  server.registerTool(
    "dry_run_deploy",
    {
      description:
        "Simulate a deployment script using forge script (DRY-RUN ONLY - no actual transactions). " +
        "Returns gas estimates, contract addresses, and transaction details. " +
        "SAFETY: This tool will NEVER broadcast transactions.",
      inputSchema: DryRunDeploySchema,
      annotations: { readOnlyHint: true },
    },
    async ({ scriptPath, rpcUrl, forkBlockNumber }) => {
      try {
        // Check if forge is installed
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text: getForgeInstallInstructions(),
              },
            ],
            isError: true,
          };
        }

        // Check if this is a Foundry project
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

        // Check if script exists
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

        // Build forge script command (DRY-RUN ONLY)
        let command = `forge script ${scriptPath}`;

        // Add RPC URL (required for simulation)
        if (rpcUrl) {
          command += ` --fork-url ${rpcUrl}`;
        } else {
          // Default to localhost if not provided
          command += " --fork-url http://localhost:8545";
        }

        // Add fork block number if specified
        if (forkBlockNumber) {
          command += ` --fork-block-number ${forkBlockNumber}`;
        }

        // Add verbose output for parsing
        command += " -vvv";

        // CRITICAL SAFETY CHECK
        validateNoBroadcast(command);

        // Execute simulation
        let output: string;
        try {
          output = execSync(command, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          });
        } catch (error: any) {
          // Script might fail but still produce output
          output = error.stdout || "";
          if (!output) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Simulation Error**\n\n${error.message}\n\n${error.stderr || ""}`,
                },
              ],
              isError: true,
            };
          }
        }

        // Parse and format results
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
        // Check if this is a safety violation
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

  server.registerTool(
    "check_deployment_status",
    {
      description:
        "Check the status of previous deployments by reading broadcast files. " +
        "Returns transaction hashes, contract addresses, gas used, and success/failure status.",
      inputSchema: CheckDeploymentStatusSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ broadcastDir = "broadcast" }) => {
      try {
        // Find latest broadcast run
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

        // Parse deployment status
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

import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

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

export function validateNoBroadcast(command: string): void {
  if (command.includes("--broadcast")) {
    throw new Error(
      "SAFETY VIOLATION: --broadcast flag detected. This tool only supports dry-run simulations. " +
        "Remove --broadcast to proceed with simulation only.",
    );
  }
}

export function parseDryRunOutput(output: string): DryRunResult {
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

    if (line.includes("Script ran successfully") || line.includes("SIMULATION COMPLETE")) {
      result.success = true;
    }

    if (line.includes("Error:") || line.includes("error:") || line.includes("failed")) {
      const errorLine = line.trim();
      if (errorLine && !errorLine.includes("== Logs ==")) {
        result.errors?.push(errorLine);
      }
    }

    if (line.includes("deployed") || line.includes("Deployed")) {
      const addressMatch = line.match(/0x[a-fA-F0-9]{40}/);
      if (addressMatch) {
        currentTx.address = addressMatch[0];
      }
    }

    if (line.includes("CREATE") || line.includes("Contract:")) {
      const nameMatch = line.match(/Contract:\s*(\w+)/) || line.match(/CREATE\s+(\w+)/);
      if (nameMatch) {
        currentTx.contractName = nameMatch[1];
      }
    }

    const gasMatch = line.match(/gas:\s*(\d+)/i);
    if (gasMatch) {
      const gas = parseInt(gasMatch[1], 10);
      currentTx.gasEstimate = gas;
      totalGas += gas;
    }

    const calldataMatch = line.match(/(?:calldata|data):\s*(0x[a-fA-F0-9]+)/i);
    if (calldataMatch) {
      currentTx.calldata = calldataMatch[1];
    }

    if (currentTx.address || currentTx.calldata) {
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

  if (!result.success && result.errors?.length === 0 && result.transactions.length > 0) {
    result.success = true;
  }

  if (result.errors && result.errors.length > 0) {
    result.success = false;
  }

  return result;
}

export function findLatestBroadcastRun(broadcastDir: string): string | null {
  if (!existsSync(broadcastDir)) {
    return null;
  }

  const chainDirs = readdirSync(broadcastDir).filter((dir) => {
    const fullPath = join(broadcastDir, dir);
    return statSync(fullPath).isDirectory() && /^\d+$/.test(dir);
  });

  if (chainDirs.length === 0) {
    return null;
  }

  for (const chainDir of chainDirs) {
    const latestPath = join(broadcastDir, chainDir, "run-latest.json");
    if (existsSync(latestPath)) {
      return latestPath;
    }

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

export function parseDeploymentStatus(broadcastPath: string): DeploymentStatus {
  const content = readFileSync(broadcastPath, "utf-8");
  const data = JSON.parse(content);

  const status: DeploymentStatus = {
    chainId: data.chain || 0,
    transactions: [],
  };

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

export function formatDryRunResult(result: DryRunResult): string {
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

export function formatDeploymentStatus(status: DeploymentStatus): string {
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

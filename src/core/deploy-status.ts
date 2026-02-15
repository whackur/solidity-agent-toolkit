import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";

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

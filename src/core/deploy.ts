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

export {
  type DeploymentStatus,
  findLatestBroadcastRun,
  parseDeploymentStatus,
  formatDeploymentStatus,
} from "./deploy-status.js";

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
  let currentTx: {
    contractName?: string;
    address?: string;
    gasEstimate?: number;
    calldata?: string;
  } = {};
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

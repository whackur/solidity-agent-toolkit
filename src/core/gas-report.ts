// Re-export storage layout types and functions for backward compatibility
export type { StorageSlot } from "./storage-layout.js";
export { parseStorageLayout, formatStorageLayout } from "./storage-layout.js";

export interface GasEstimate {
  contract: string;
  deployment?: {
    min: number;
    avg: number;
    median: number;
    max: number;
  };
  functions: {
    name: string;
    min: number;
    avg: number;
    median: number;
    max: number;
    calls: number;
  }[];
}

export function parseGasReport(
  output: string,
  contractFilter?: string,
  functionFilter?: string,
): GasEstimate[] {
  const estimates: GasEstimate[] = [];
  const lines = output.split("\n");

  let currentContract: string | null = null;
  let currentEstimate: GasEstimate | null = null;
  let inGasReport = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("gas report") || line.includes("Gas Report")) {
      inGasReport = true;
      continue;
    }

    if (!inGasReport) continue;

    const contractMatch = line.match(/^\s*\|\s*([A-Z][a-zA-Z0-9_]+)\s*\|/);
    if (contractMatch && !line.includes("Function") && !line.includes("Deployment")) {
      currentContract = contractMatch[1];
      if (!contractFilter || currentContract === contractFilter) {
        currentEstimate = {
          contract: currentContract,
          functions: [],
        };
        estimates.push(currentEstimate);
      } else {
        currentEstimate = null;
      }
      continue;
    }

    const deployMatch = line.match(/\|\s*Deployment Cost\s*\|\s*Deployment Size\s*\|/);
    if (deployMatch && currentEstimate) {
      const nextLine = lines[i + 1];
      const costMatch = nextLine?.match(/\|\s*(\d+)\s*\|\s*(\d+)\s*\|/);
      if (costMatch) {
        const cost = parseInt(costMatch[1], 10);
        currentEstimate.deployment = {
          min: cost,
          avg: cost,
          median: cost,
          max: cost,
        };
      }
      continue;
    }

    const funcMatch = line.match(
      /\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/,
    );
    if (funcMatch && currentEstimate) {
      const [, name, min, avg, median, max, calls] = funcMatch;
      if (!functionFilter || name === functionFilter) {
        currentEstimate.functions.push({
          name,
          min: parseInt(min, 10),
          avg: parseInt(avg, 10),
          median: parseInt(median, 10),
          max: parseInt(max, 10),
          calls: parseInt(calls, 10),
        });
      }
    }
  }

  return estimates;
}

export function formatGasEstimates(estimates: GasEstimate[]): string {
  if (estimates.length === 0) {
    return "⚠️  **No gas estimates found**\n\nRun tests with gas reporting:\n```bash\nforge test --gas-report\n```";
  }

  let output = "⛽ **Gas Estimates**\n\n";

  for (const estimate of estimates) {
    output += `**${estimate.contract}**\n\n`;

    if (estimate.deployment) {
      output += `**Deployment Cost:** ${estimate.deployment.avg.toLocaleString()} gas\n\n`;
    }

    if (estimate.functions.length > 0) {
      output += "| Function | Min | Avg | Median | Max | Calls |\n";
      output += "|----------|-----|-----|--------|-----|-------|\n";

      for (const func of estimate.functions) {
        output += `| ${func.name} | ${func.min.toLocaleString()} | ${func.avg.toLocaleString()} | ${func.median.toLocaleString()} | ${func.max.toLocaleString()} | ${func.calls} |\n`;
      }
      output += "\n";

      const highGasFunctions = estimate.functions.filter((f) => f.avg > 100000);
      if (highGasFunctions.length > 0) {
        output += "⚠️  **High gas functions (>100k avg):**\n";
        for (const func of highGasFunctions) {
          output += `- \`${func.name}\`: ${func.avg.toLocaleString()} gas\n`;
        }
        output += "\n";
      }
    }
  }

  return output;
}

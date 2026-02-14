import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import { existsSync } from "fs";

const GasSnapshotSchema = z.object({
  compare: z.boolean().optional().describe("If true, compare with previous snapshot and show diff"),
});

const InspectStorageSchema = z.object({
  contractName: z.string().describe('Contract name to inspect storage layout (e.g., "MyContract")'),
});

const EstimateGasSchema = z.object({
  contractName: z.string().optional().describe("Optional contract name to filter gas report"),
  functionName: z.string().optional().describe("Optional function name to filter gas report"),
});

export interface GasSnapshot {
  testName: string;
  gasUsed: number;
  contract: string;
}

export interface StorageSlot {
  slot: number;
  offset: number;
  type: string;
  variable: string;
  bytes: number;
}

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
 * Check if current directory is a Foundry project
 */
function isFoundryProject(): boolean {
  return existsSync("foundry.toml");
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
 * Parse forge snapshot output
 * Format: "TestContract:testFunction() (gas: 12345)"
 */
function parseGasSnapshot(output: string): GasSnapshot[] {
  const snapshots: GasSnapshot[] = [];
  const lines = output.trim().split("\n");

  for (const line of lines) {
    // Match pattern: "ContractName:testName() (gas: 12345)"
    const match = line.match(/^(.+?):(.+?)\s+\(gas:\s*(\d+)\)/);
    if (match) {
      const [, contract, testName, gasUsed] = match;
      snapshots.push({
        contract: contract.trim(),
        testName: testName.trim(),
        gasUsed: parseInt(gasUsed, 10),
      });
    }
  }

  return snapshots;
}

/**
 * Parse forge snapshot diff output
 * Format: "TestContract:testFunction() (gas: 12345) (gas: -100 (-0.81%))"
 */
function parseGasSnapshotDiff(
  output: string,
): Array<GasSnapshot & { diff?: number; diffPercent?: number }> {
  const snapshots: Array<GasSnapshot & { diff?: number; diffPercent?: number }> = [];
  const lines = output.trim().split("\n");

  for (const line of lines) {
    // Match pattern with diff: "ContractName:testName() (gas: 12345) (gas: -100 (-0.81%))"
    const matchWithDiff = line.match(
      /^(.+?):(.+?)\s+\(gas:\s*(\d+)\)\s+\(gas:\s*([+-]?\d+)\s+\(([+-]?[\d.]+)%\)\)/,
    );
    if (matchWithDiff) {
      const [, contract, testName, gasUsed, diff, diffPercent] = matchWithDiff;
      snapshots.push({
        contract: contract.trim(),
        testName: testName.trim(),
        gasUsed: parseInt(gasUsed, 10),
        diff: parseInt(diff, 10),
        diffPercent: parseFloat(diffPercent),
      });
      continue;
    }

    // Match pattern without diff: "ContractName:testName() (gas: 12345)"
    const match = line.match(/^(.+?):(.+?)\s+\(gas:\s*(\d+)\)/);
    if (match) {
      const [, contract, testName, gasUsed] = match;
      snapshots.push({
        contract: contract.trim(),
        testName: testName.trim(),
        gasUsed: parseInt(gasUsed, 10),
      });
    }
  }

  return snapshots;
}

/**
 * Format gas snapshot results
 */
function formatGasSnapshot(
  snapshots: Array<GasSnapshot & { diff?: number; diffPercent?: number }>,
  compare: boolean,
): string {
  if (snapshots.length === 0) {
    return "⚠️  **No gas snapshots found**\n\nRun tests to generate gas snapshots:\n```bash\nforge test\n```";
  }

  let output = compare ? "📊 **Gas Snapshot Comparison**\n\n" : "📊 **Gas Snapshot**\n\n";

  // Group by contract
  const byContract = new Map<
    string,
    Array<GasSnapshot & { diff?: number; diffPercent?: number }>
  >();
  for (const snapshot of snapshots) {
    if (!byContract.has(snapshot.contract)) {
      byContract.set(snapshot.contract, []);
    }
    byContract.get(snapshot.contract)!.push(snapshot);
  }

  for (const [contract, tests] of byContract) {
    output += `**${contract}**\n\n`;
    output += "| Test Function | Gas Used |";
    if (compare) {
      output += " Diff | Change % |\n";
      output += "|---------------|----------|------|----------|\n";
    } else {
      output += "\n";
      output += "|---------------|----------|\n";
    }

    for (const test of tests) {
      const gasFormatted = test.gasUsed.toLocaleString();
      output += `| ${test.testName} | ${gasFormatted} |`;

      if (compare && test.diff !== undefined) {
        const diffSign = test.diff > 0 ? "+" : "";
        const diffFormatted = `${diffSign}${test.diff.toLocaleString()}`;
        const percentFormatted = `${diffSign}${test.diffPercent?.toFixed(2)}%`;
        const emoji = test.diff > 0 ? "🔴" : test.diff < 0 ? "🟢" : "⚪";
        output += ` ${emoji} ${diffFormatted} | ${percentFormatted} |\n`;
      } else if (compare) {
        output += " - | - |\n";
      } else {
        output += "\n";
      }
    }
    output += "\n";
  }

  // Summary statistics
  const totalGas = snapshots.reduce((sum, s) => sum + s.gasUsed, 0);
  const avgGas = Math.round(totalGas / snapshots.length);
  const maxGas = Math.max(...snapshots.map((s) => s.gasUsed));
  const minGas = Math.min(...snapshots.map((s) => s.gasUsed));

  output += "**Summary:**\n";
  output += `- Total tests: ${snapshots.length}\n`;
  output += `- Average gas: ${avgGas.toLocaleString()}\n`;
  output += `- Min gas: ${minGas.toLocaleString()}\n`;
  output += `- Max gas: ${maxGas.toLocaleString()}\n`;

  if (compare) {
    const withDiff = snapshots.filter((s) => s.diff !== undefined);
    if (withDiff.length > 0) {
      const totalDiff = withDiff.reduce((sum, s) => sum + (s.diff || 0), 0);
      const avgDiff = Math.round(totalDiff / withDiff.length);
      output += `\n**Changes:**\n`;
      output += `- Tests changed: ${withDiff.length}\n`;
      output += `- Average diff: ${avgDiff > 0 ? "+" : ""}${avgDiff.toLocaleString()}\n`;
    }
  }

  return output;
}

/**
 * Parse forge inspect storage output
 */
function parseStorageLayout(output: string): StorageSlot[] {
  try {
    const data = JSON.parse(output);
    const slots: StorageSlot[] = [];

    if (!data.storage || !Array.isArray(data.storage)) {
      return slots;
    }

    for (const item of data.storage) {
      slots.push({
        slot: parseInt(item.slot, 10),
        offset: item.offset || 0,
        type: item.type || "unknown",
        variable: item.label || item.name || "unknown",
        bytes: item.numberOfBytes ? parseInt(item.numberOfBytes, 10) : 0,
      });
    }

    return slots;
  } catch (error) {
    throw new Error(
      `Failed to parse storage layout: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

/**
 * Format storage layout with packing analysis
 */
function formatStorageLayout(slots: StorageSlot[], contractName: string): string {
  if (slots.length === 0) {
    return `⚠️  **No storage variables found in ${contractName}**\n\nThe contract may not have any state variables.`;
  }

  let output = `🗄️  **Storage Layout for ${contractName}**\n\n`;

  // Group by slot
  const bySlot = new Map<number, StorageSlot[]>();
  for (const slot of slots) {
    if (!bySlot.has(slot.slot)) {
      bySlot.set(slot.slot, []);
    }
    bySlot.get(slot.slot)!.push(slot);
  }

  output += "| Slot | Offset | Bytes | Type | Variable |\n";
  output += "|------|--------|-------|------|----------|\n";

  for (const [, variables] of Array.from(bySlot.entries()).sort((a, b) => a[0] - b[0])) {
    for (const variable of variables) {
      output += `| ${variable.slot} | ${variable.offset} | ${variable.bytes} | \`${variable.type}\` | \`${variable.variable}\` |\n`;
    }
  }

  output += "\n**Storage Packing Analysis:**\n\n";

  // Analyze packing efficiency
  const packedSlots = Array.from(bySlot.entries()).filter(([, vars]) => vars.length > 1);
  const unpackedSlots = Array.from(bySlot.entries()).filter(([, vars]) => vars.length === 1);

  if (packedSlots.length > 0) {
    output += `✅ **Well-packed slots (${packedSlots.length}):**\n`;
    for (const [slotNum, variables] of packedSlots) {
      const totalBytes = variables.reduce((sum, v) => sum + v.bytes, 0);
      const varNames = variables.map((v) => v.variable).join(", ");
      output += `- Slot ${slotNum}: ${variables.length} variables (${totalBytes}/32 bytes) - ${varNames}\n`;
    }
    output += "\n";
  }

  // Check for optimization opportunities
  const optimizationHints: string[] = [];

  // Check for single large variables that could be packed
  for (const [slotNum, variables] of unpackedSlots) {
    if (variables.length === 1 && variables[0].bytes < 32) {
      const variable = variables[0];
      optimizationHints.push(
        `Slot ${slotNum}: \`${variable.variable}\` (${variable.bytes} bytes) could be packed with other small variables`,
      );
    }
  }

  // Check for bool/uint8 that could be packed
  const smallTypes = slots.filter((s) => s.bytes <= 8);
  if (smallTypes.length >= 2) {
    const unpackedSmall = smallTypes.filter((s) => {
      const slotVars = bySlot.get(s.slot) || [];
      return slotVars.length === 1;
    });

    if (unpackedSmall.length >= 2) {
      optimizationHints.push(
        `Consider grouping small variables (${unpackedSmall.map((s) => s.variable).join(", ")}) together to save storage slots`,
      );
    }
  }

  if (optimizationHints.length > 0) {
    output += "💡 **Optimization Hints:**\n";
    for (const hint of optimizationHints) {
      output += `- ${hint}\n`;
    }
    output += "\n";
  } else {
    output += "✅ **Storage layout is well-optimized!**\n\n";
  }

  output += "**Summary:**\n";
  output += `- Total storage slots used: ${bySlot.size}\n`;
  output += `- Total variables: ${slots.length}\n`;
  output += `- Packed slots: ${packedSlots.length}\n`;
  output += `- Storage cost: ~${bySlot.size * 20000} gas for initialization\n`;

  return output;
}

/**
 * Parse forge test gas report
 */
function parseGasReport(
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

    // Detect gas report section
    if (line.includes("gas report") || line.includes("Gas Report")) {
      inGasReport = true;
      continue;
    }

    if (!inGasReport) continue;

    // Detect contract name (usually in a header row)
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

    // Parse deployment cost
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

    // Parse function gas usage
    // Format: | functionName | min | avg | median | max | calls |
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

/**
 * Format gas estimates
 */
function formatGasEstimates(estimates: GasEstimate[]): string {
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

      // Add insights
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

export function registerGasAnalysisTools(server: McpServer): void {
  server.registerTool(
    "gas_snapshot",
    {
      description:
        "Generate gas usage snapshot for all test functions using forge snapshot. Optionally compare with previous snapshot to show gas usage changes.",
      inputSchema: GasSnapshotSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ compare }) => {
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
                text: "❌ **Not a Foundry Project**\n\nNo `foundry.toml` found in the current directory.\n\nTo initialize a Foundry project:\n```bash\nforge init\n```",
              },
            ],
            isError: true,
          };
        }

        // Build command
        const command = compare ? "forge snapshot --diff" : "forge snapshot";

        // Execute snapshot
        let output: string;
        try {
          output = execSync(command, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024,
          });
        } catch (error: any) {
          // forge snapshot may return non-zero on diff changes
          output = error.stdout || "";
          if (!output && error.stderr) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Gas Snapshot Error**\n\n${error.stderr}`,
                },
              ],
              isError: true,
            };
          }
        }

        // Parse results
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

  server.registerTool(
    "inspect_storage",
    {
      description:
        "Inspect storage layout of a Solidity contract using forge inspect. Shows how state variables are packed into storage slots and provides optimization hints.",
      inputSchema: InspectStorageSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ contractName }) => {
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

        // Execute forge inspect
        const output = execSync(`forge inspect ${contractName} storage`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });

        // Parse storage layout
        const slots = parseStorageLayout(output);
        const formatted = formatStorageLayout(slots, contractName);

        return {
          content: [
            {
              type: "text" as const,
              text: formatted,
            },
          ],
        };
      } catch (error: any) {
        const errorMessage = error.stderr || error.message || String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ **Error Inspecting Storage**\n\n${errorMessage}\n\nMake sure the contract is compiled first:\n\`\`\`bash\nforge build\n\`\`\``,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.registerTool(
    "estimate_gas",
    {
      description:
        "Get gas usage estimates for contract functions from forge test gas report. Shows deployment cost and per-function gas usage statistics.",
      inputSchema: EstimateGasSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ contractName, functionName }) => {
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

        // Execute forge test with gas report
        let output: string;
        try {
          output = execSync("forge test --gas-report", {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024,
          });
        } catch (error: any) {
          // Tests may fail but still produce gas report
          output = error.stdout || "";
          if (!output) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Gas Report Error**\n\n${error.stderr || error.message}`,
                },
              ],
              isError: true,
            };
          }
        }

        // Parse gas report
        const estimates = parseGasReport(output, contractName, functionName);
        const formatted = formatGasEstimates(estimates);

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
              text: `Error estimating gas: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

import { execSync } from "child_process";

export interface GasSnapshot {
  testName: string;
  gasUsed: number;
  contract: string;
}

export interface GasSnapshotWithDiff extends GasSnapshot {
  diff?: number;
  diffPercent?: number;
}

export function parseGasSnapshot(output: string): GasSnapshot[] {
  const snapshots: GasSnapshot[] = [];
  const lines = output.trim().split("\n");

  for (const line of lines) {
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

export function parseGasSnapshotDiff(output: string): GasSnapshotWithDiff[] {
  const snapshots: GasSnapshotWithDiff[] = [];
  const lines = output.trim().split("\n");

  for (const line of lines) {
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

export function formatGasSnapshot(snapshots: GasSnapshotWithDiff[], compare: boolean): string {
  if (snapshots.length === 0) {
    return "⚠️  **No gas snapshots found**\n\nRun tests to generate gas snapshots:\n```bash\nforge test\n```";
  }

  let output = compare ? "📊 **Gas Snapshot Comparison**\n\n" : "📊 **Gas Snapshot**\n\n";

  const byContract = new Map<string, GasSnapshotWithDiff[]>();
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

export interface GasSnapshotRunResult {
  success: boolean;
  snapshots: GasSnapshotWithDiff[];
  compare: boolean;
  error?: string;
}

export function runGasSnapshot(compare?: boolean): GasSnapshotRunResult {
  const command = compare ? "forge snapshot --diff" : "forge snapshot";

  try {
    const output = execSync(command, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
      maxBuffer: 10 * 1024 * 1024,
    });
    const snapshots = compare ? parseGasSnapshotDiff(output) : parseGasSnapshot(output);
    return { success: true, snapshots, compare: compare || false };
  } catch (error: unknown) {
    const execErr = error as Error & { stdout?: string; stderr?: string };
    const stdout = execErr.stdout || "";
    if (stdout) {
      const snapshots = compare ? parseGasSnapshotDiff(stdout) : parseGasSnapshot(stdout);
      return { success: true, snapshots, compare: compare || false };
    }
    return {
      success: false,
      snapshots: [],
      compare: compare || false,
      error: execErr.stderr || execErr.message || String(error),
    };
  }
}

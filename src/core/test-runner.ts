import { execSync } from "child_process";

export interface TestOptions {
  testFilter?: string;
  verbosity?: number;
  fuzz?: boolean;
}

export interface SingleTestOptions {
  testContract: string;
  testFunction: string;
  verbosity?: number;
}

export interface TestResult {
  totalTests: number;
  passed: number;
  failed: number;
  failedTests: FailedTest[];
  gasUsage?: GasUsage;
}

export interface FailedTest {
  name: string;
  contract: string;
  error: string;
}

export interface GasUsage {
  min: number;
  max: number;
  avg: number;
}

export interface SingleTestResult {
  testName: string;
  contract: string;
  status: "pass" | "fail";
  gasUsed?: number;
  logs: string[];
  traces: string[];
  error?: string;
}

export function buildTestCommand(options: TestOptions): string {
  let cmd = "forge test --json";

  if (options.testFilter) {
    cmd += ` --match-test ${options.testFilter}`;
  }

  if (options.fuzz) {
    cmd += " --fuzz-runs 1000";
  }

  if (options.verbosity) {
    cmd += " -" + "v".repeat(Math.min(options.verbosity, 5));
  }

  return cmd;
}

export function buildSingleTestCommand(options: SingleTestOptions): string {
  let cmd = `forge test --match-test ${options.testFunction} --match-contract ${options.testContract}`;

  const verbosity = options.verbosity ?? 3;
  cmd += " -" + "v".repeat(Math.min(verbosity, 5));

  return cmd;
}

export function parseTestResults(output: string): TestResult {
  const lines = output.trim().split("\n");
  const result: TestResult = {
    totalTests: 0,
    passed: 0,
    failed: 0,
    failedTests: [],
  };

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const json = JSON.parse(line);

      if (json.type === "test" && json.event === "test_result") {
        result.totalTests++;

        if (json.status === "Success") {
          result.passed++;
        } else if (json.status === "Failure") {
          result.failed++;
          result.failedTests.push({
            name: json.test || "unknown",
            contract: json.contract || "unknown",
            error: json.reason || "Test failed",
          });
        }
      }

      if (json.type === "suite" && json.event === "suite_result") {
        if (json.gas_used) {
          result.gasUsage = {
            min: json.gas_used.min || 0,
            max: json.gas_used.max || 0,
            avg: json.gas_used.avg || 0,
          };
        }
      }
    } catch {
      continue;
    }
  }

  return result;
}

export function parseSingleTestOutput(
  output: string,
  testFunction: string,
  testContract: string,
): SingleTestResult {
  const result: SingleTestResult = {
    testName: testFunction,
    contract: testContract,
    status: "pass",
    logs: [],
    traces: [],
  };

  if (output.includes("[PASS]")) {
    result.status = "pass";
  } else if (output.includes("[FAIL]")) {
    result.status = "fail";
  }

  const gasMatch = output.match(/\(gas:\s*(\d+)\)/);
  if (gasMatch) {
    result.gasUsed = parseInt(gasMatch[1], 10);
  }

  const logMatches = output.matchAll(/^\s*├─\s*(emit\s+.+)$/gm);
  for (const match of logMatches) {
    result.logs.push(match[1]);
  }

  const traceMatches = output.matchAll(/^\s*[├└]─\s*(.+)$/gm);
  for (const match of traceMatches) {
    result.traces.push(match[1]);
  }

  if (result.status === "fail") {
    const errorMatch = output.match(/Error:\s*(.+?)(?:\n|$)/);
    if (errorMatch) {
      result.error = errorMatch[1];
    } else {
      result.error = "Test failed (see traces for details)";
    }
  }

  return result;
}

export function formatTestResults(result: TestResult): string {
  const lines: string[] = [];

  lines.push("Test Results Summary");
  lines.push("===================");
  lines.push(`Total tests: ${result.totalTests}`);
  lines.push(`Passed: ${result.passed}`);
  lines.push(`Failed: ${result.failed}`);

  if (result.gasUsage) {
    lines.push("");
    lines.push("Gas Usage:");
    lines.push(`  Min: ${result.gasUsage.min}`);
    lines.push(`  Max: ${result.gasUsage.max}`);
    lines.push(`  Avg: ${result.gasUsage.avg}`);
  }

  if (result.failedTests.length > 0) {
    lines.push("");
    lines.push("Failed Tests:");
    lines.push("-------------");
    for (const test of result.failedTests) {
      lines.push(`${test.contract}::${test.name}`);
      lines.push(`  Error: ${test.error}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function formatSingleTestResult(result: SingleTestResult): string {
  const lines: string[] = [];

  lines.push(`Test: ${result.contract}::${result.testName}`);
  lines.push(`Status: ${result.status.toUpperCase()}`);

  if (result.gasUsed !== undefined) {
    lines.push(`Gas Used: ${result.gasUsed}`);
  }

  if (result.error) {
    lines.push("");
    lines.push(`Error: ${result.error}`);
  }

  if (result.logs.length > 0) {
    lines.push("");
    lines.push("Logs:");
    for (const log of result.logs) {
      lines.push(`  ${log}`);
    }
  }

  if (result.traces.length > 0) {
    lines.push("");
    lines.push("Traces:");
    for (const trace of result.traces) {
      lines.push(`  ${trace}`);
    }
  }

  return lines.join("\n");
}

export function checkForgeInstalled(): { installed: boolean; message?: string } {
  try {
    execSync("forge --version", { encoding: "utf-8", stdio: "pipe" });
    return { installed: true };
  } catch {
    return {
      installed: false,
      message: "Forge is not installed. Install Foundry from https://getfoundry.sh/",
    };
  }
}

import { execSync } from "child_process";
import { isCliAvailable } from "./tool-checker.js";
import {
  formatTestResults,
  formatSingleTestResult,
  type TestResult,
  type FailedTest,
  type GasUsage,
  type SingleTestResult,
} from "./test-runner-format.js";

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

export { formatTestResults, formatSingleTestResult };
export type { TestResult, FailedTest, GasUsage, SingleTestResult };

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
      // Non-JSON line in forge test output — skip and continue parsing
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

export function checkForgeInstalled(): { installed: boolean; message?: string } {
  const installed = isCliAvailable("forge");
  if (installed) {
    return { installed: true };
  }
  return {
    installed: false,
    message: "Forge is not installed. Install Foundry from https://getfoundry.sh/",
  };
}

export interface RunTestsResult {
  success: boolean;
  result?: TestResult;
  formatted?: string;
  error?: string;
}

export function runTests(options: TestOptions): RunTestsResult {
  const cmd = buildTestCommand(options);
  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      cwd: process.cwd(),
    });
    const result = parseTestResults(output);
    return { success: true, result, formatted: formatTestResults(result) };
  } catch (error: unknown) {
    const execErr = error as Error & { stdout?: string | Buffer };
    const stdout = execErr.stdout?.toString() || "";
    if (stdout) {
      try {
        const result = parseTestResults(stdout);
        if (result.totalTests > 0) {
          return { success: true, result, formatted: formatTestResults(result) };
        }
      } catch {
        // Fall through to error
      }
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export function runSingleTest(options: SingleTestOptions): RunTestsResult {
  const cmd = buildSingleTestCommand(options);
  try {
    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      cwd: process.cwd(),
    });
    const result = parseSingleTestOutput(output, options.testFunction, options.testContract);
    return { success: true, formatted: formatSingleTestResult(result) };
  } catch (error: unknown) {
    const execErr = error as Error & { stdout?: string | Buffer };
    const stdout = execErr.stdout?.toString() || "";
    if (stdout && (stdout.includes("[PASS]") || stdout.includes("[FAIL]"))) {
      const result = parseSingleTestOutput(stdout, options.testFunction, options.testContract);
      return { success: true, formatted: formatSingleTestResult(result) };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

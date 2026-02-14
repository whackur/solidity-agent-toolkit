import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execSync } from "child_process";
import { z } from "zod";

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

/**
 * Build forge test command with options
 */
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

/**
 * Build forge test command for single test
 */
export function buildSingleTestCommand(options: SingleTestOptions): string {
  let cmd = `forge test --match-test ${options.testFunction} --match-contract ${options.testContract}`;

  // Default to high verbosity for single test
  const verbosity = options.verbosity ?? 3;
  cmd += " -" + "v".repeat(Math.min(verbosity, 5));

  return cmd;
}

/**
 * Parse forge test --json output
 */
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

      // Handle test result events
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

      // Handle suite result for gas usage
      if (json.type === "suite" && json.event === "suite_result") {
        // Gas usage might be in the suite result
        if (json.gas_used) {
          result.gasUsage = {
            min: json.gas_used.min || 0,
            max: json.gas_used.max || 0,
            avg: json.gas_used.avg || 0,
          };
        }
      }
    } catch {
      // Skip non-JSON lines (might be compilation output or other messages)
      continue;
    }
  }

  return result;
}

/**
 * Parse single test output (non-JSON, verbose format)
 */
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

  // Check if test passed or failed
  if (output.includes("[PASS]")) {
    result.status = "pass";
  } else if (output.includes("[FAIL]")) {
    result.status = "fail";
  }

  // Extract gas used
  const gasMatch = output.match(/\(gas:\s*(\d+)\)/);
  if (gasMatch) {
    result.gasUsed = parseInt(gasMatch[1], 10);
  }

  const logMatches = output.matchAll(/^\s*├─\s*(emit\s+.+)$/gm);
  for (const match of logMatches) {
    result.logs.push(match[1]);
  }

  // Extract traces (lines starting with ├─ or └─)
  const traceMatches = output.matchAll(/^\s*[├└]─\s*(.+)$/gm);
  for (const match of traceMatches) {
    result.traces.push(match[1]);
  }

  // Extract error message if failed
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

/**
 * Format test results for display
 */
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

/**
 * Format single test result for display
 */
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

/**
 * Check if forge is installed
 */
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

/**
 * Register test runner tools with MCP server
 */
export function registerTestRunnerTools(server: McpServer): void {
  // Tool: run_tests
  server.tool(
    "run_tests",
    "Run Foundry tests and return summary of results (pass/fail counts, gas usage, failed test details)",
    {
      testFilter: z.string().optional().describe("Optional test name filter (regex pattern)"),
      verbosity: z.number().min(0).max(5).optional().describe("Verbosity level (0-5, default: 0)"),
      fuzz: z.boolean().optional().describe("Enable fuzzing with 1000 runs (default: false)"),
    },
    async ({ testFilter, verbosity, fuzz }) => {
      // Check if forge is installed
      const forgeCheck = checkForgeInstalled();
      if (!forgeCheck.installed) {
        return {
          content: [{ type: "text" as const, text: forgeCheck.message! }],
          isError: true,
        };
      }

      try {
        const cmd = buildTestCommand({ testFilter, verbosity, fuzz });
        const output = execSync(cmd, {
          encoding: "utf-8",
          stdio: "pipe",
          cwd: process.cwd(),
        });

        const result = parseTestResults(output);

        // No tests found
        if (result.totalTests === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: "No tests found. Make sure you have test files in the test/ directory.",
              },
            ],
            isError: false,
          };
        }

        // Return results (test failures are NOT errors, they're expected results)
        return {
          content: [{ type: "text" as const, text: formatTestResults(result) }],
          isError: false,
        };
      } catch (error) {
        // Execution error (not test failure)
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Try to parse output even on error (tests might have run but some failed)
        if (error && typeof error === "object" && "stdout" in error) {
          const stdout = (error as any).stdout?.toString() || "";
          if (stdout) {
            try {
              const result = parseTestResults(stdout);
              if (result.totalTests > 0) {
                // Tests ran but some failed - this is NOT an error
                return {
                  content: [{ type: "text" as const, text: formatTestResults(result) }],
                  isError: false,
                };
              }
            } catch {
              // Fall through to error handling
            }
          }
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to run tests: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  // Tool: run_single_test
  server.tool(
    "run_single_test",
    "Run a single Foundry test with detailed trace output (logs, traces, gas usage)",
    {
      testContract: z.string().describe("Contract name containing the test"),
      testFunction: z.string().describe("Test function name to run"),
      verbosity: z.number().min(0).max(5).optional().describe("Verbosity level (0-5, default: 3)"),
    },
    async ({ testContract, testFunction, verbosity }) => {
      // Check if forge is installed
      const forgeCheck = checkForgeInstalled();
      if (!forgeCheck.installed) {
        return {
          content: [{ type: "text" as const, text: forgeCheck.message! }],
          isError: true,
        };
      }

      try {
        const cmd = buildSingleTestCommand({
          testContract,
          testFunction,
          verbosity,
        });

        const output = execSync(cmd, {
          encoding: "utf-8",
          stdio: "pipe",
          cwd: process.cwd(),
        });

        const result = parseSingleTestOutput(output, testFunction, testContract);

        // Return results (test failure is NOT an error, it's expected result)
        return {
          content: [{ type: "text" as const, text: formatSingleTestResult(result) }],
          isError: false,
        };
      } catch (error) {
        // Try to parse output even on error (test might have run but failed)
        if (error && typeof error === "object" && "stdout" in error) {
          const stdout = (error as any).stdout?.toString() || "";
          if (stdout && (stdout.includes("[PASS]") || stdout.includes("[FAIL]"))) {
            const result = parseSingleTestOutput(stdout, testFunction, testContract);
            return {
              content: [{ type: "text" as const, text: formatSingleTestResult(result) }],
              isError: false,
            };
          }
        }

        // Execution error (not test failure)
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `Failed to run test: ${errorMessage}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execSync } from "child_process";
import { z } from "zod";
import {
  buildTestCommand,
  buildSingleTestCommand,
  parseTestResults,
  parseSingleTestOutput,
  formatTestResults,
  formatSingleTestResult,
  checkForgeInstalled,
} from "../../core/test-runner.js";

export type {
  TestOptions,
  SingleTestOptions,
  TestResult,
  FailedTest,
  GasUsage,
  SingleTestResult,
} from "../../core/test-runner.js";
export {
  buildTestCommand,
  buildSingleTestCommand,
  parseTestResults,
  parseSingleTestOutput,
  formatTestResults,
  formatSingleTestResult,
  checkForgeInstalled,
} from "../../core/test-runner.js";

export function registerTestRunnerTools(server: McpServer): void {
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
          const execErr = error as Error & { stdout?: string | Buffer };
          const stdout = execErr.stdout?.toString() || "";
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
          const execErr = error as Error & { stdout?: string | Buffer };
          const stdout = execErr.stdout?.toString() || "";
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

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
  server.registerTool(
    "run_tests",
    {
      description:
        "Run Foundry tests and return results. Optionally specify testContract and testFunction " +
        "to run a single test with detailed trace output.",
      inputSchema: {
        testFilter: z.string().optional().describe("Optional test name filter (regex pattern)"),
        verbosity: z
          .number()
          .min(0)
          .max(5)
          .optional()
          .describe("Verbosity level (0-5, default: 0)"),
        fuzz: z.boolean().optional().describe("Enable fuzzing with 1000 runs"),
        testContract: z
          .string()
          .optional()
          .describe("Run a specific test contract (requires testFunction)"),
        testFunction: z
          .string()
          .optional()
          .describe("Run a specific test function (requires testContract)"),
      },
    },
    async ({ testFilter, verbosity, fuzz, testContract, testFunction }) => {
      const forgeCheck = checkForgeInstalled();
      if (!forgeCheck.installed) {
        return {
          content: [{ type: "text" as const, text: forgeCheck.message! }],
          isError: true,
        };
      }

      // Single test mode
      if (testContract && testFunction) {
        return runSingleTest(testContract, testFunction, verbosity ?? 3);
      }

      // Batch test mode
      try {
        const cmd = buildTestCommand({ testFilter, verbosity, fuzz });
        const output = execSync(cmd, {
          encoding: "utf-8",
          stdio: "pipe",
          cwd: process.cwd(),
        });

        const result = parseTestResults(output);

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

        return {
          content: [{ type: "text" as const, text: formatTestResults(result) }],
          isError: false,
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        if (error && typeof error === "object" && "stdout" in error) {
          const execErr = error as Error & { stdout?: string | Buffer };
          const stdout = execErr.stdout?.toString() || "";
          if (stdout) {
            try {
              const result = parseTestResults(stdout);
              if (result.totalTests > 0) {
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
          content: [{ type: "text" as const, text: `Failed to run tests: ${errorMessage}` }],
          isError: true,
        };
      }
    },
  );
}

function runSingleTest(testContract: string, testFunction: string, verbosity: number) {
  try {
    const cmd = buildSingleTestCommand({ testContract, testFunction, verbosity });
    const output = execSync(cmd, {
      encoding: "utf-8",
      stdio: "pipe",
      cwd: process.cwd(),
    });

    const result = parseSingleTestOutput(output, testFunction, testContract);
    return {
      content: [{ type: "text" as const, text: formatSingleTestResult(result) }],
      isError: false,
    };
  } catch (error) {
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

    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text" as const, text: `Failed to run test: ${errorMessage}` }],
      isError: true,
    };
  }
}

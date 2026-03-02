import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { checkForgeInstalled, runTests, runSingleTest } from "../../core/test-runner.js";

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
        "Run Foundry (forge test) test suite and return pass/fail results with gas usage. " +
        "Requires Foundry CLI installed. " +
        "Default: run all tests. Set testContract + testFunction for a single test with trace output. " +
        "Use when: 'run tests', 'test my contract', 'check if tests pass', 'run specific test'.",
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
        const result = runSingleTest({
          testContract,
          testFunction,
          verbosity: verbosity ?? 3,
        });
        if (!result.success) {
          return {
            content: [{ type: "text" as const, text: `Failed to run test: ${result.error}` }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: result.formatted! }],
          isError: false,
        };
      }

      // Batch test mode
      const result = runTests({ testFilter, verbosity, fuzz });
      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: `Failed to run tests: ${result.error}` }],
          isError: true,
        };
      }

      if (result.result && result.result.totalTests === 0) {
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
        content: [{ type: "text" as const, text: result.formatted! }],
        isError: false,
      };
    },
  );
}

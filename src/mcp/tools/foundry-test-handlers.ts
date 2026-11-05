import { checkForgeInstalled, runTests, runSingleTest } from "../../core/test-runner.js";
import { errorResult, type ToolResult } from "./tool-result.js";

export interface TestArgs {
  testFilter?: string;
  verbosity?: number;
  fuzz?: boolean;
  testContract?: string;
  testFunction?: string;
}

export function handleTest({
  testFilter,
  verbosity,
  fuzz,
  testContract,
  testFunction,
}: TestArgs): ToolResult {
  const forgeCheck = checkForgeInstalled();
  if (!forgeCheck.installed) return errorResult(forgeCheck.message!);

  if (testContract && testFunction) {
    const result = runSingleTest({ testContract, testFunction, verbosity: verbosity ?? 3 });
    if (!result.success) return errorResult(`Failed to run test: ${result.error}`);
    return { content: [{ type: "text" as const, text: result.formatted! }], isError: false };
  }

  const result = runTests({ testFilter, verbosity, fuzz });
  if (!result.success) return errorResult(`Failed to run tests: ${result.error}`);

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

  return { content: [{ type: "text" as const, text: result.formatted! }], isError: false };
}

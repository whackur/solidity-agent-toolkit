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

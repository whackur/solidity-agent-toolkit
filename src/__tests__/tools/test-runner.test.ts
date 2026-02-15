import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  buildTestCommand,
  buildSingleTestCommand,
  parseTestResults,
  parseSingleTestOutput,
  formatTestResults,
  formatSingleTestResult,
  checkForgeInstalled,
} from "../../mcp/tools/test-runner.js";
import * as childProcess from "child_process";

vi.mock("child_process");

describe("buildTestCommand", () => {
  it("builds basic command without options", () => {
    const cmd = buildTestCommand({});
    expect(cmd).toBe("forge test --json");
  });

  it("adds test filter when provided", () => {
    const cmd = buildTestCommand({ testFilter: "testTransfer" });
    expect(cmd).toBe("forge test --json --match-test testTransfer");
  });

  it("adds fuzz runs when enabled", () => {
    const cmd = buildTestCommand({ fuzz: true });
    expect(cmd).toBe("forge test --json --fuzz-runs 1000");
  });

  it("adds verbosity flags", () => {
    const cmd = buildTestCommand({ verbosity: 3 });
    expect(cmd).toBe("forge test --json -vvv");
  });

  it("limits verbosity to 5", () => {
    const cmd = buildTestCommand({ verbosity: 10 });
    expect(cmd).toBe("forge test --json -vvvvv");
  });

  it("combines all options", () => {
    const cmd = buildTestCommand({
      testFilter: "testDeposit",
      verbosity: 2,
      fuzz: true,
    });
    expect(cmd).toBe("forge test --json --match-test testDeposit --fuzz-runs 1000 -vv");
  });
});

describe("buildSingleTestCommand", () => {
  it("builds command with contract and function", () => {
    const cmd = buildSingleTestCommand({
      testContract: "MyTest",
      testFunction: "testTransfer",
    });
    expect(cmd).toBe("forge test --match-test testTransfer --match-contract MyTest -vvv");
  });

  it("uses default verbosity of 3", () => {
    const cmd = buildSingleTestCommand({
      testContract: "MyTest",
      testFunction: "testTransfer",
    });
    expect(cmd).toContain("-vvv");
  });

  it("respects custom verbosity", () => {
    const cmd = buildSingleTestCommand({
      testContract: "MyTest",
      testFunction: "testTransfer",
      verbosity: 5,
    });
    expect(cmd).toContain("-vvvvv");
  });
});

describe("parseTestResults", () => {
  it("parses successful test results", () => {
    const output = `
{"type":"test","event":"test_result","status":"Success","test":"testTransfer","contract":"TokenTest"}
{"type":"test","event":"test_result","status":"Success","test":"testApprove","contract":"TokenTest"}
`;
    const result = parseTestResults(output);
    expect(result.totalTests).toBe(2);
    expect(result.passed).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.failedTests).toEqual([]);
  });

  it("parses failed test results", () => {
    const output = `
{"type":"test","event":"test_result","status":"Success","test":"testTransfer","contract":"TokenTest"}
{"type":"test","event":"test_result","status":"Failure","test":"testRevert","contract":"TokenTest","reason":"Assertion failed"}
`;
    const result = parseTestResults(output);
    expect(result.totalTests).toBe(2);
    expect(result.passed).toBe(1);
    expect(result.failed).toBe(1);
    expect(result.failedTests).toHaveLength(1);
    expect(result.failedTests[0]).toEqual({
      name: "testRevert",
      contract: "TokenTest",
      error: "Assertion failed",
    });
  });

  it("handles empty output", () => {
    const result = parseTestResults("");
    expect(result.totalTests).toBe(0);
    expect(result.passed).toBe(0);
    expect(result.failed).toBe(0);
  });

  it("skips non-JSON lines", () => {
    const output = `
Compiling contracts...
{"type":"test","event":"test_result","status":"Success","test":"testTransfer","contract":"TokenTest"}
Some other output
{"type":"test","event":"test_result","status":"Success","test":"testApprove","contract":"TokenTest"}
`;
    const result = parseTestResults(output);
    expect(result.totalTests).toBe(2);
    expect(result.passed).toBe(2);
  });

  it("parses gas usage from suite result", () => {
    const output = `
{"type":"test","event":"test_result","status":"Success","test":"testTransfer","contract":"TokenTest"}
{"type":"suite","event":"suite_result","gas_used":{"min":21000,"max":50000,"avg":35000}}
`;
    const result = parseTestResults(output);
    expect(result.gasUsage).toEqual({
      min: 21000,
      max: 50000,
      avg: 35000,
    });
  });
});

describe("parseSingleTestOutput", () => {
  it("parses passing test", () => {
    const output = `
Running 1 test for test/Token.t.sol:TokenTest
[PASS] testTransfer() (gas: 28493)
Traces:
  [28493] TokenTest::testTransfer()
    ├─ [2493] Token::transfer(0x1234, 100)
    │   └─ ← true
    └─ ← ()
`;
    const result = parseSingleTestOutput(output, "testTransfer", "TokenTest");
    expect(result.status).toBe("pass");
    expect(result.gasUsed).toBe(28493);
    expect(result.testName).toBe("testTransfer");
    expect(result.contract).toBe("TokenTest");
  });

  it("parses failing test", () => {
    const output = `
Running 1 test for test/Token.t.sol:TokenTest
[FAIL] testRevert() (gas: 12345)
Traces:
  [12345] TokenTest::testRevert()
    └─ ← "Assertion failed"

Error: Assertion failed
`;
    const result = parseSingleTestOutput(output, "testRevert", "TokenTest");
    expect(result.status).toBe("fail");
    expect(result.gasUsed).toBe(12345);
    expect(result.error).toBe("Assertion failed");
  });

  it("extracts logs from output", () => {
    const output = `
[PASS] testWithLogs() (gas: 30000)
Traces:
  [30000] TokenTest::testWithLogs()
    ├─ emit Transfer(from: 0x0000, to: 0x1234, value: 100)
    ├─ emit Approval(owner: 0x1234, spender: 0x5678, value: 50)
    └─ ← ()
`;
    const result = parseSingleTestOutput(output, "testWithLogs", "TokenTest");
    expect(result.logs).toContain("emit Transfer(from: 0x0000, to: 0x1234, value: 100)");
    expect(result.logs).toContain("emit Approval(owner: 0x1234, spender: 0x5678, value: 50)");
  });

  it("extracts traces from output", () => {
    const output = `
[PASS] testTransfer() (gas: 28493)
Traces:
  [28493] TokenTest::testTransfer()
    ├─ [2493] Token::transfer(0x1234, 100)
    │   └─ ← true
    └─ ← ()
`;
    const result = parseSingleTestOutput(output, "testTransfer", "TokenTest");
    expect(result.traces.length).toBeGreaterThan(0);
  });

  it("handles test without gas info", () => {
    const output = `
[PASS] testSimple()
`;
    const result = parseSingleTestOutput(output, "testSimple", "SimpleTest");
    expect(result.status).toBe("pass");
    expect(result.gasUsed).toBeUndefined();
  });

  it("provides default error message for failed test without error", () => {
    const output = `
[FAIL] testFail()
`;
    const result = parseSingleTestOutput(output, "testFail", "FailTest");
    expect(result.status).toBe("fail");
    expect(result.error).toBe("Test failed (see traces for details)");
  });
});

describe("formatTestResults", () => {
  it("formats successful test results", () => {
    const result = {
      totalTests: 5,
      passed: 5,
      failed: 0,
      failedTests: [],
    };
    const formatted = formatTestResults(result);
    expect(formatted).toContain("Total tests: 5");
    expect(formatted).toContain("Passed: 5");
    expect(formatted).toContain("Failed: 0");
  });

  it("formats failed test results", () => {
    const result = {
      totalTests: 3,
      passed: 2,
      failed: 1,
      failedTests: [
        {
          name: "testRevert",
          contract: "TokenTest",
          error: "Assertion failed",
        },
      ],
    };
    const formatted = formatTestResults(result);
    expect(formatted).toContain("Total tests: 3");
    expect(formatted).toContain("Passed: 2");
    expect(formatted).toContain("Failed: 1");
    expect(formatted).toContain("TokenTest::testRevert");
    expect(formatted).toContain("Error: Assertion failed");
  });

  it("includes gas usage when available", () => {
    const result = {
      totalTests: 2,
      passed: 2,
      failed: 0,
      failedTests: [],
      gasUsage: {
        min: 21000,
        max: 50000,
        avg: 35000,
      },
    };
    const formatted = formatTestResults(result);
    expect(formatted).toContain("Gas Usage:");
    expect(formatted).toContain("Min: 21000");
    expect(formatted).toContain("Max: 50000");
    expect(formatted).toContain("Avg: 35000");
  });
});

describe("formatSingleTestResult", () => {
  it("formats passing test", () => {
    const result = {
      testName: "testTransfer",
      contract: "TokenTest",
      status: "pass" as const,
      gasUsed: 28493,
      logs: [],
      traces: [],
    };
    const formatted = formatSingleTestResult(result);
    expect(formatted).toContain("Test: TokenTest::testTransfer");
    expect(formatted).toContain("Status: PASS");
    expect(formatted).toContain("Gas Used: 28493");
  });

  it("formats failing test with error", () => {
    const result = {
      testName: "testRevert",
      contract: "TokenTest",
      status: "fail" as const,
      gasUsed: 12345,
      logs: [],
      traces: [],
      error: "Assertion failed",
    };
    const formatted = formatSingleTestResult(result);
    expect(formatted).toContain("Status: FAIL");
    expect(formatted).toContain("Error: Assertion failed");
  });

  it("includes logs when present", () => {
    const result = {
      testName: "testWithLogs",
      contract: "TokenTest",
      status: "pass" as const,
      logs: ["emit Transfer(from: 0x0000, to: 0x1234, value: 100)"],
      traces: [],
    };
    const formatted = formatSingleTestResult(result);
    expect(formatted).toContain("Logs:");
    expect(formatted).toContain("emit Transfer");
  });

  it("includes traces when present", () => {
    const result = {
      testName: "testTransfer",
      contract: "TokenTest",
      status: "pass" as const,
      logs: [],
      traces: ["[28493] TokenTest::testTransfer()", "[2493] Token::transfer(0x1234, 100)"],
    };
    const formatted = formatSingleTestResult(result);
    expect(formatted).toContain("Traces:");
    expect(formatted).toContain("TokenTest::testTransfer()");
  });
});

describe("checkForgeInstalled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns installed true when forge is available", () => {
    vi.spyOn(childProcess, "execSync").mockReturnValue("forge 0.2.0\n");
    const result = checkForgeInstalled();
    expect(result.installed).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it("returns installed false when forge is not available", () => {
    vi.spyOn(childProcess, "execSync").mockImplementation(() => {
      throw new Error("command not found");
    });
    const result = checkForgeInstalled();
    expect(result.installed).toBe(false);
    expect(result.message).toContain("Install Foundry");
  });
});

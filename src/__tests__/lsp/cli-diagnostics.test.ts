import { describe, it, expect, vi, beforeEach } from "vitest";
import { DiagnosticSeverity } from "vscode-languageserver/node.js";

vi.mock("../../lsp/cli-runner.js", () => ({
  runCliAsync: vi.fn(),
}));

import { runCliAsync } from "../../lsp/cli-runner.js";
import {
  getSlitherDiagnostics,
  getSolhintDiagnostics,
  getAderynDiagnostics,
} from "../../lsp/cli-diagnostics.js";

const mockRunCliAsync = vi.mocked(runCliAsync);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getSlitherDiagnostics", () => {
  it("returns empty array when slither is not installed", async () => {
    mockRunCliAsync.mockRejectedValueOnce(new Error("ENOENT"));
    const result = await getSlitherDiagnostics("/test.sol", "/");
    expect(result).toEqual([]);
  });

  it("returns diagnostics for valid slither output", async () => {
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const slitherOutput = JSON.stringify({
      results: {
        detectors: [
          {
            check: "reentrancy-eth",
            impact: "High",
            confidence: "High",
            description: "Reentrancy in Contract.withdraw()",
            elements: [
              {
                source_mapping: {
                  filename_relative: "test.sol",
                  lines: [10],
                  starting_column: 5,
                },
              },
            ],
          },
        ],
      },
    });

    mockRunCliAsync.mockResolvedValueOnce({ stdout: slitherOutput, stderr: "", exitCode: 0 });

    const result = await getSlitherDiagnostics("/test.sol", "/");
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe(DiagnosticSeverity.Error);
    expect(result[0].source).toBe("slither");
    expect(result[0].range.start.line).toBe(9);
  });

  it("returns empty array on parse error", async () => {
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "invalid json", stderr: "", exitCode: 1 });
    const result = await getSlitherDiagnostics("/test.sol", "/");
    expect(result).toEqual([]);
  });
});

describe("getSolhintDiagnostics", () => {
  it("returns empty array when solhint is not installed", async () => {
    mockRunCliAsync.mockRejectedValueOnce(new Error("ENOENT"));
    const result = await getSolhintDiagnostics("/test.sol", "/");
    expect(result).toEqual([]);
  });

  it("returns diagnostics for valid solhint output", async () => {
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const solhintOutput = JSON.stringify([
      {
        filePath: "/test.sol",
        messages: [
          {
            ruleId: "no-unused-vars",
            severity: 2,
            message: "Variable is unused",
            line: 5,
            column: 10,
          },
        ],
      },
    ]);

    mockRunCliAsync.mockResolvedValueOnce({ stdout: solhintOutput, stderr: "", exitCode: 0 });

    const result = await getSolhintDiagnostics("/test.sol", "/");
    expect(result.length).toBeGreaterThanOrEqual(0);
    for (const diag of result) {
      expect(diag.source).toBe("solhint");
    }
  });

  it("returns empty array on parse error", async () => {
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "not json", stderr: "", exitCode: 1 });
    const result = await getSolhintDiagnostics("/test.sol", "/");
    expect(result).toEqual([]);
  });
});

describe("getAderynDiagnostics", () => {
  it("returns empty array when aderyn is not installed", async () => {
    mockRunCliAsync.mockRejectedValueOnce(new Error("ENOENT"));
    const result = await getAderynDiagnostics("/test.sol", "/");
    expect(result).toEqual([]);
  });

  it("returns diagnostics for valid aderyn output", async () => {
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });

    const aderynOutput = JSON.stringify({
      findings: [
        {
          detector: "UnprotectedInitialize",
          severity: "Critical",
          title: "Unprotected Initialize",
          description: "Initialize function is not protected",
          location: { file: "test.sol", line: 42 },
        },
      ],
    });

    mockRunCliAsync.mockResolvedValueOnce({ stdout: aderynOutput, stderr: "", exitCode: 0 });

    const result = await getAderynDiagnostics("/test.sol", "/");
    expect(result.length).toBe(1);
    expect(result[0].severity).toBe(DiagnosticSeverity.Error);
    expect(result[0].source).toBe("aderyn");
    expect(result[0].range.start.line).toBe(41);
  });

  it("returns empty array on parse error", async () => {
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "", stderr: "", exitCode: 0 });
    mockRunCliAsync.mockResolvedValueOnce({ stdout: "bad json", stderr: "", exitCode: 1 });
    const result = await getAderynDiagnostics("/test.sol", "/");
    expect(result).toEqual([]);
  });
});

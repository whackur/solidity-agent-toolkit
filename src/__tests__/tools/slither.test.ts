import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import { runSlither, listSlitherDetectors } from "../../mcp/tools/slither.js";
import {
  SLITHER_SCWE_MAPPINGS,
  getScweIdForDetector,
  getDetectorsForScweId,
} from "../../knowledge/slither-mappings.js";

vi.mock("child_process");

describe("SLITHER_SCWE_MAPPINGS", () => {
  it("defines at least 20 detector mappings", () => {
    const mappingCount = Object.keys(SLITHER_SCWE_MAPPINGS).length;
    expect(mappingCount).toBeGreaterThanOrEqual(20);
  });

  it("all SCWE IDs follow correct format", () => {
    const scweIds = Object.values(SLITHER_SCWE_MAPPINGS);
    for (const id of scweIds) {
      expect(id).toMatch(/^SCWE-\d{3}$/);
    }
  });

  it("includes critical detector mappings", () => {
    const criticalDetectors = [
      "reentrancy-eth",
      "reentrancy-no-eth",
      "tx-origin",
      "unchecked-transfer",
      "suicidal",
      "controlled-delegatecall",
    ];

    for (const detector of criticalDetectors) {
      expect(SLITHER_SCWE_MAPPINGS[detector]).toBeDefined();
      expect(SLITHER_SCWE_MAPPINGS[detector]).toMatch(/^SCWE-\d{3}$/);
    }
  });

  it("maps reentrancy detectors to SCWE-046", () => {
    expect(SLITHER_SCWE_MAPPINGS["reentrancy-eth"]).toBe("SCWE-046");
    expect(SLITHER_SCWE_MAPPINGS["reentrancy-no-eth"]).toBe("SCWE-046");
    expect(SLITHER_SCWE_MAPPINGS["reentrancy-benign"]).toBe("SCWE-046");
  });

  it("maps tx-origin to SCWE-018", () => {
    expect(SLITHER_SCWE_MAPPINGS["tx-origin"]).toBe("SCWE-018");
  });

  it("maps unchecked-transfer to SCWE-104", () => {
    expect(SLITHER_SCWE_MAPPINGS["unchecked-transfer"]).toBe("SCWE-104");
  });

  it("maps suicidal to SCWE-038", () => {
    expect(SLITHER_SCWE_MAPPINGS["suicidal"]).toBe("SCWE-038");
  });

  it("maps shadowing detectors to SCWE-119", () => {
    expect(SLITHER_SCWE_MAPPINGS["shadowing-state"]).toBe("SCWE-119");
    expect(SLITHER_SCWE_MAPPINGS["shadowing-abstract"]).toBe("SCWE-119");
  });

  it("maps uninitialized storage to SCWE-109", () => {
    expect(SLITHER_SCWE_MAPPINGS["uninitialized-state"]).toBe("SCWE-109");
    expect(SLITHER_SCWE_MAPPINGS["uninitialized-storage"]).toBe("SCWE-109");
  });
});

describe("getScweIdForDetector", () => {
  it("returns correct SCWE ID for known detector", () => {
    expect(getScweIdForDetector("reentrancy-eth")).toBe("SCWE-046");
    expect(getScweIdForDetector("tx-origin")).toBe("SCWE-018");
  });

  it("returns undefined for unknown detector", () => {
    expect(getScweIdForDetector("unknown-detector")).toBeUndefined();
  });
});

describe("getDetectorsForScweId", () => {
  it("returns all detectors for SCWE-046", () => {
    const detectors = getDetectorsForScweId("SCWE-046");
    expect(detectors).toContain("reentrancy-eth");
    expect(detectors).toContain("reentrancy-no-eth");
    expect(detectors.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown SCWE ID", () => {
    const detectors = getDetectorsForScweId("SCWE-999");
    expect(detectors).toEqual([]);
  });
});

describe("runSlither", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns error when slither is not installed", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("command not found");
    });

    const result = runSlither(".");

    expect(result.success).toBe(false);
    expect(result.error).toContain("not installed");
    expect(result.error).toContain("pip install slither-analyzer");
  });

  it("parses slither JSON output correctly", () => {
    const mockSlitherOutput = JSON.stringify({
      results: {
        detectors: [
          {
            check: "reentrancy-eth",
            impact: "High",
            confidence: "Medium",
            description: "Reentrancy vulnerability detected",
            elements: [
              {
                source_mapping: {
                  filename_relative: "contracts/Vulnerable.sol",
                  lines: [42],
                  starting_column: 5,
                },
              },
            ],
          },
          {
            check: "tx-origin",
            impact: "Medium",
            confidence: "High",
            description: "Use of tx.origin for authentication",
            elements: [
              {
                source_mapping: {
                  filename_relative: "contracts/Auth.sol",
                  lines: [15],
                },
              },
            ],
          },
        ],
      },
    });

    vi.mocked(execSync).mockReturnValueOnce("Slither 0.9.0").mockReturnValueOnce(mockSlitherOutput);

    const result = runSlither(".");

    expect(result.success).toBe(true);
    expect(result.findings).toHaveLength(2);

    const reentrancyFinding = result.findings[0];
    expect(reentrancyFinding.detector).toBe("reentrancy-eth");
    expect(reentrancyFinding.severity).toBe("High");
    expect(reentrancyFinding.confidence).toBe("Medium");
    expect(reentrancyFinding.scweMapping).toBe("SCWE-046");
    expect(reentrancyFinding.location.file).toBe("contracts/Vulnerable.sol");
    expect(reentrancyFinding.location.line).toBe(42);

    const txOriginFinding = result.findings[1];
    expect(txOriginFinding.detector).toBe("tx-origin");
    expect(txOriginFinding.scweMapping).toBe("SCWE-018");
  });

  it("handles empty results", () => {
    const mockSlitherOutput = JSON.stringify({
      results: {
        detectors: [],
      },
    });

    vi.mocked(execSync).mockReturnValueOnce("Slither 0.9.0").mockReturnValueOnce(mockSlitherOutput);

    const result = runSlither(".");

    expect(result.success).toBe(true);
    expect(result.findings).toHaveLength(0);
  });

  it("handles compilation errors", () => {
    vi.mocked(execSync)
      .mockReturnValueOnce("Slither 0.9.0")
      .mockImplementationOnce(() => {
        const error: any = new Error("Compilation failed");
        error.stderr = "Compilation failed: SyntaxError";
        throw error;
      });

    const result = runSlither(".");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Compilation failed");
  });

  it("handles no contracts found error", () => {
    vi.mocked(execSync)
      .mockReturnValueOnce("Slither 0.9.0")
      .mockImplementationOnce(() => {
        const error: any = new Error("No contract found");
        error.stderr = "No contract found in path";
        throw error;
      });

    const result = runSlither(".");

    expect(result.success).toBe(false);
    expect(result.error).toContain("No Solidity contracts found");
  });

  it("passes detector filters to slither command", () => {
    const mockSlitherOutput = JSON.stringify({
      results: { detectors: [] },
    });

    vi.mocked(execSync).mockReturnValueOnce("Slither 0.9.0").mockReturnValueOnce(mockSlitherOutput);

    runSlither(".", ["reentrancy-eth", "tx-origin"]);

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining("--detect reentrancy-eth,tx-origin"),
      expect.any(Object),
    );
  });

  it("passes exclude filters to slither command", () => {
    const mockSlitherOutput = JSON.stringify({
      results: { detectors: [] },
    });

    vi.mocked(execSync).mockReturnValueOnce("Slither 0.9.0").mockReturnValueOnce(mockSlitherOutput);

    runSlither(".", undefined, ["naming-convention", "solc-version"]);

    expect(execSync).toHaveBeenCalledWith(
      expect.stringContaining("--exclude naming-convention,solc-version"),
      expect.any(Object),
    );
  });

  it("maps detector without SCWE mapping", () => {
    const mockSlitherOutput = JSON.stringify({
      results: {
        detectors: [
          {
            check: "unknown-detector",
            impact: "Low",
            confidence: "Low",
            description: "Some issue",
            elements: [
              {
                source_mapping: {
                  filename_relative: "test.sol",
                  lines: [1],
                },
              },
            ],
          },
        ],
      },
    });

    vi.mocked(execSync).mockReturnValueOnce("Slither 0.9.0").mockReturnValueOnce(mockSlitherOutput);

    const result = runSlither(".");

    expect(result.success).toBe(true);
    expect(result.findings[0].scweMapping).toBeUndefined();
  });

  it("handles findings in error.stdout when command exits non-zero", () => {
    const mockSlitherOutput = JSON.stringify({
      results: {
        detectors: [
          {
            check: "reentrancy-eth",
            impact: "High",
            confidence: "High",
            description: "Reentrancy found",
            elements: [
              {
                source_mapping: {
                  filename_relative: "test.sol",
                  lines: [10],
                },
              },
            ],
          },
        ],
      },
    });

    vi.mocked(execSync)
      .mockReturnValueOnce("Slither 0.9.0")
      .mockImplementationOnce(() => {
        const error: any = new Error("Exit code 1");
        error.stdout = mockSlitherOutput;
        error.stderr = "";
        throw error;
      });

    const result = runSlither(".");

    expect(result.success).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].detector).toBe("reentrancy-eth");
  });
});

describe("listSlitherDetectors", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns detector list when slither is installed", () => {
    const mockDetectorList = `
Available detectors:
- reentrancy-eth: Reentrancy vulnerabilities
- tx-origin: Dangerous use of tx.origin
    `;

    vi.mocked(execSync).mockReturnValueOnce("Slither 0.9.0").mockReturnValueOnce(mockDetectorList);

    const result = listSlitherDetectors();

    expect(result).toContain("reentrancy-eth");
    expect(result).toContain("tx-origin");
  });

  it("returns error message when slither is not installed", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("command not found");
    });

    const result = listSlitherDetectors();

    expect(result).toContain("not installed");
    expect(result).toContain("pip install slither-analyzer");
  });
});

import { describe, it, expect } from "vitest";
import {
  parseStorageLayout,
  formatStorageLayout,
  parseGasReport,
  formatGasEstimates,
} from "../../core/gas-report.js";

describe("parseStorageLayout", () => {
  it("parses valid storage layout JSON", () => {
    const input = JSON.stringify({
      storage: [
        { slot: "0", offset: 0, type: "uint256", label: "totalSupply", numberOfBytes: "32" },
        { slot: "1", offset: 0, type: "address", label: "owner", numberOfBytes: "20" },
      ],
    });

    const result = parseStorageLayout(input);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      slot: 0,
      offset: 0,
      type: "uint256",
      variable: "totalSupply",
      bytes: 32,
    });
    expect(result[1]).toEqual({
      slot: 1,
      offset: 0,
      type: "address",
      variable: "owner",
      bytes: 20,
    });
  });

  it("returns empty array when storage key is missing", () => {
    expect(parseStorageLayout(JSON.stringify({}))).toEqual([]);
    expect(parseStorageLayout(JSON.stringify({ storage: null }))).toEqual([]);
  });

  it("falls back to defaults for missing fields", () => {
    const input = JSON.stringify({
      storage: [{ slot: "2" }],
    });

    const result = parseStorageLayout(input);

    expect(result[0]).toEqual({
      slot: 2,
      offset: 0,
      type: "unknown",
      variable: "unknown",
      bytes: 0,
    });
  });

  it("uses name field when label is absent", () => {
    const input = JSON.stringify({
      storage: [{ slot: "0", name: "balance", type: "uint256", numberOfBytes: "32" }],
    });

    expect(parseStorageLayout(input)[0].variable).toBe("balance");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseStorageLayout("not json")).toThrow("Failed to parse storage layout");
  });
});

describe("formatStorageLayout", () => {
  it("returns warning for empty slots", () => {
    const result = formatStorageLayout([], "MyContract");
    expect(result).toContain("No storage variables found in MyContract");
  });

  it("formats table with slot data", () => {
    const slots = [
      { slot: 0, offset: 0, type: "uint256", variable: "totalSupply", bytes: 32 },
      { slot: 1, offset: 0, type: "address", variable: "owner", bytes: 20 },
    ];

    const result = formatStorageLayout(slots, "Token");

    expect(result).toContain("Storage Layout for Token");
    expect(result).toContain("totalSupply");
    expect(result).toContain("owner");
    expect(result).toContain("| Slot | Offset | Bytes | Type | Variable |");
  });

  it("detects packed slots", () => {
    const slots = [
      { slot: 0, offset: 0, type: "uint128", variable: "a", bytes: 16 },
      { slot: 0, offset: 16, type: "uint128", variable: "b", bytes: 16 },
    ];

    const result = formatStorageLayout(slots, "Packed");

    expect(result).toContain("Well-packed slots");
    expect(result).toContain("a, b");
  });

  it("suggests optimization for unpacked small variables", () => {
    const slots = [
      { slot: 0, offset: 0, type: "uint8", variable: "flag1", bytes: 1 },
      { slot: 1, offset: 0, type: "uint8", variable: "flag2", bytes: 1 },
    ];

    const result = formatStorageLayout(slots, "Flags");

    expect(result).toContain("Optimization Hints");
    expect(result).toContain("flag1");
    expect(result).toContain("flag2");
  });

  it("reports well-optimized when fully packed", () => {
    const slots = [
      { slot: 0, offset: 0, type: "uint256", variable: "value", bytes: 32 },
    ];

    const result = formatStorageLayout(slots, "Optimal");

    expect(result).toContain("well-optimized");
  });
});

describe("parseGasReport", () => {
  const sampleReport = `
Ran 3 tests for test/Counter.t.sol
gas report
| Counter          |                 |       |        |       |         |
|------------------|-----------------|-------|--------|-------|---------|
| Deployment Cost  | Deployment Size |       |        |       |         |
| 45000            | 250             |       |        |       |         |
| Function Name    | min             | avg   | median | max   | # calls |
| increment        | 5000            | 5500  | 5500   | 6000  | 10      |
| setNumber        | 2400            | 2400  | 2400   | 2400  | 1       |
`;

  it("parses contract with functions", () => {
    const result = parseGasReport(sampleReport);

    expect(result).toHaveLength(1);
    expect(result[0].contract).toBe("Counter");
    expect(result[0].functions).toHaveLength(2);
    expect(result[0].functions[0]).toEqual({
      name: "increment",
      min: 5000,
      avg: 5500,
      median: 5500,
      max: 6000,
      calls: 10,
    });
  });

  it("parses deployment cost", () => {
    const result = parseGasReport(sampleReport);

    expect(result[0].deployment).toBeDefined();
    expect(result[0].deployment!.avg).toBe(45000);
  });

  it("filters by contract name", () => {
    const result = parseGasReport(sampleReport, "NonExistent");
    expect(result).toHaveLength(0);
  });

  it("filters by function name", () => {
    const result = parseGasReport(sampleReport, undefined, "increment");

    expect(result[0].functions).toHaveLength(1);
    expect(result[0].functions[0].name).toBe("increment");
  });

  it("returns empty array for non-report output", () => {
    expect(parseGasReport("some random output")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseGasReport("")).toEqual([]);
  });
});

describe("formatGasEstimates", () => {
  it("returns warning for empty estimates", () => {
    const result = formatGasEstimates([]);
    expect(result).toContain("No gas estimates found");
    expect(result).toContain("forge test --gas-report");
  });

  it("formats gas table", () => {
    const estimates = [
      {
        contract: "Token",
        deployment: { min: 100000, avg: 100000, median: 100000, max: 100000 },
        functions: [
          { name: "transfer", min: 30000, avg: 35000, median: 35000, max: 40000, calls: 5 },
        ],
      },
    ];

    const result = formatGasEstimates(estimates);

    expect(result).toContain("Gas Estimates");
    expect(result).toContain("Token");
    expect(result).toContain("Deployment Cost");
    expect(result).toContain("transfer");
  });

  it("warns about high gas functions", () => {
    const estimates = [
      {
        contract: "Heavy",
        functions: [
          { name: "expensiveOp", min: 150000, avg: 200000, median: 180000, max: 250000, calls: 3 },
        ],
      },
    ];

    const result = formatGasEstimates(estimates);

    expect(result).toContain("High gas functions");
    expect(result).toContain("expensiveOp");
  });

  it("does not warn for low gas functions", () => {
    const estimates = [
      {
        contract: "Light",
        functions: [
          { name: "cheapOp", min: 1000, avg: 2000, median: 1500, max: 3000, calls: 1 },
        ],
      },
    ];

    const result = formatGasEstimates(estimates);

    expect(result).not.toContain("High gas functions");
  });
});

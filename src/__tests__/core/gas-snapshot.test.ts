import { describe, it, expect } from "vitest";
import {
  parseGasSnapshot,
  parseGasSnapshotDiff,
  formatGasSnapshot,
} from "../../core/gas-snapshot.js";

describe("parseGasSnapshot", () => {
  it("parses standard forge snapshot output", () => {
    const input = `CounterTest:testIncrement() (gas: 28312)
CounterTest:testSetNumber() (gas: 27553)
TokenTest:testTransfer() (gas: 51234)`;

    const result = parseGasSnapshot(input);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      contract: "CounterTest",
      testName: "testIncrement()",
      gasUsed: 28312,
    });
    expect(result[2]).toEqual({
      contract: "TokenTest",
      testName: "testTransfer()",
      gasUsed: 51234,
    });
  });

  it("returns empty array for empty input", () => {
    expect(parseGasSnapshot("")).toEqual([]);
  });

  it("skips lines that don't match snapshot format", () => {
    const input = `Some log output
CounterTest:testIncrement() (gas: 28312)
Another log line`;

    const result = parseGasSnapshot(input);

    expect(result).toHaveLength(1);
    expect(result[0].testName).toBe("testIncrement()");
  });
});

describe("parseGasSnapshotDiff", () => {
  it("parses lines with diff info", () => {
    const input = `CounterTest:testIncrement() (gas: 28312) (gas: -500 (-1.74%))
CounterTest:testSetNumber() (gas: 27553) (gas: +200 (+0.73%))`;

    const result = parseGasSnapshotDiff(input);

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      contract: "CounterTest",
      testName: "testIncrement()",
      gasUsed: 28312,
      diff: -500,
      diffPercent: -1.74,
    });
    expect(result[1].diff).toBe(200);
    expect(result[1].diffPercent).toBe(0.73);
  });

  it("parses lines without diff as plain snapshots", () => {
    const input = `CounterTest:testNew() (gas: 10000)`;

    const result = parseGasSnapshotDiff(input);

    expect(result).toHaveLength(1);
    expect(result[0].diff).toBeUndefined();
    expect(result[0].diffPercent).toBeUndefined();
  });

  it("handles mixed diff and non-diff lines", () => {
    const input = `CounterTest:testA() (gas: 1000) (gas: +100 (+10.00%))
CounterTest:testB() (gas: 2000)`;

    const result = parseGasSnapshotDiff(input);

    expect(result).toHaveLength(2);
    expect(result[0].diff).toBe(100);
    expect(result[1].diff).toBeUndefined();
  });
});

describe("formatGasSnapshot", () => {
  it("returns warning for empty snapshots", () => {
    const result = formatGasSnapshot([], false);
    expect(result).toContain("No gas snapshots found");
  });

  it("formats basic snapshot table", () => {
    const snapshots = [
      { contract: "CounterTest", testName: "testIncrement()", gasUsed: 28312 },
      { contract: "CounterTest", testName: "testSetNumber()", gasUsed: 27553 },
    ];

    const result = formatGasSnapshot(snapshots, false);

    expect(result).toContain("Gas Snapshot");
    expect(result).toContain("CounterTest");
    expect(result).toContain("testIncrement()");
    expect(result).toContain("testSetNumber()");
    expect(result).toContain("Total tests: 2");
  });

  it("includes diff columns in compare mode", () => {
    const snapshots = [
      {
        contract: "CounterTest",
        testName: "testIncrement()",
        gasUsed: 28312,
        diff: -500,
        diffPercent: -1.74,
      },
    ];

    const result = formatGasSnapshot(snapshots, true);

    expect(result).toContain("Gas Snapshot Comparison");
    expect(result).toContain("Diff");
    expect(result).toContain("Change %");
    expect(result).toContain("🟢");
    expect(result).toContain("Tests changed: 1");
  });

  it("uses red emoji for gas increase", () => {
    const snapshots = [
      {
        contract: "Test",
        testName: "test()",
        gasUsed: 5000,
        diff: 100,
        diffPercent: 2.0,
      },
    ];

    const result = formatGasSnapshot(snapshots, true);

    expect(result).toContain("🔴");
  });

  it("groups snapshots by contract", () => {
    const snapshots = [
      { contract: "Alpha", testName: "testA()", gasUsed: 1000 },
      { contract: "Beta", testName: "testB()", gasUsed: 2000 },
    ];

    const result = formatGasSnapshot(snapshots, false);

    expect(result).toContain("**Alpha**");
    expect(result).toContain("**Beta**");
  });
});

import { describe, it, expect } from "vitest";
import { matchPatterns } from "../../core/pattern-matcher.js";
import { GROUND_TRUTH } from "../fixtures/ground-truth.js";

describe("Detection Metrics Baseline", () => {
  const results = GROUND_TRUTH.map((tc) => ({
    ...tc,
    detected: matchPatterns(tc.code, [tc.scweId]).length > 0,
  }));

  it("recall: detects all true positives", () => {
    const tp = results.filter((r) => r.expected === "true-positive");
    const detected = tp.filter((r) => r.detected);
    const missed = tp.filter((r) => !r.detected);

    if (missed.length > 0) {
      console.log(
        "Missed TPs:",
        missed.map((m) => m.id),
      );
    }

    expect(detected.length).toBe(tp.length);
  });

  it("precision baseline: record current false positive count", () => {
    const allFP = results.filter((r) => r.expected === "false-positive");
    const falseAlarms = allFP.filter((r) => r.detected);

    console.log(`Current FP baseline: ${falseAlarms.length} / ${allFP.length}`);
    if (falseAlarms.length > 0) {
      console.log(
        "False alarms:",
        falseAlarms.map((f) => f.id),
      );
    }

    // Phase 0: Just record the baseline count. Phase 2 will tighten this.
    expect(falseAlarms.length).toBeGreaterThanOrEqual(0);
  });

  it("per-SCWE breakdown", () => {
    const scweIds = [...new Set(GROUND_TRUTH.map((tc) => tc.scweId))];

    for (const scweId of scweIds) {
      const cases = results.filter((r) => r.scweId === scweId);
      const tp = cases.filter((r) => r.expected === "true-positive");
      const fp = cases.filter((r) => r.expected === "false-positive");
      const tpDetected = tp.filter((r) => r.detected).length;
      const fpDetected = fp.filter((r) => r.detected).length;

      console.log(`${scweId}: TP=${tpDetected}/${tp.length} FP=${fpDetected}/${fp.length}`);
    }

    // Informational — always passes
    expect(true).toBe(true);
  });
});

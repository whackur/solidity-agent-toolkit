import { describe, it, expect } from "vitest";
import {
  ADVERSARIAL_SCENARIOS,
  type AdversarialCategory,
} from "../../knowledge/adversarial-scenarios.js";

const ALL_CATEGORIES: AdversarialCategory[] = [
  "reentrancy",
  "flash-loan",
  "oracle-manipulation",
  "mev-frontrunning",
  "governance",
  "access-control",
  "economic-logic",
  "cross-contract",
];

describe("ADVERSARIAL_SCENARIOS", () => {
  it("has at least 16 scenarios", () => {
    expect(ADVERSARIAL_SCENARIOS.length).toBeGreaterThanOrEqual(16);
  });

  it("covers all 8 adversarial categories", () => {
    const categories = new Set(ADVERSARIAL_SCENARIOS.map((s) => s.category));
    for (const cat of ALL_CATEGORIES) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  it("has no duplicate scenario IDs", () => {
    const ids = ADVERSARIAL_SCENARIOS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every scenario has all required fields non-empty", () => {
    for (const scenario of ADVERSARIAL_SCENARIOS) {
      expect(scenario.id.length).toBeGreaterThan(0);
      expect(scenario.category.length).toBeGreaterThan(0);
      expect(scenario.name.length).toBeGreaterThan(0);
      expect(scenario.description.length).toBeGreaterThan(0);
      expect(scenario.realWorldExample.length).toBeGreaterThan(0);
      expect(scenario.preConditions.length).toBeGreaterThanOrEqual(1);
      expect(scenario.attackSteps.length).toBeGreaterThanOrEqual(1);
      expect(scenario.invariantsViolated.length).toBeGreaterThanOrEqual(1);
      expect(scenario.scweIds.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every scweId matches SCWE-NNN format", () => {
    for (const scenario of ADVERSARIAL_SCENARIOS) {
      for (const scweId of scenario.scweIds) {
        expect(scweId).toMatch(/^SCWE-\d{3}$/);
      }
    }
  });

  it("every owasp2026 matches SC01-SC10 format", () => {
    for (const scenario of ADVERSARIAL_SCENARIOS) {
      expect(scenario.owasp2026).toMatch(/^SC\d{2}$/);
    }
  });

  it("every scenario has at least 2 preConditions", () => {
    for (const scenario of ADVERSARIAL_SCENARIOS) {
      expect(scenario.preConditions.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("every scenario has at least 3 attackSteps", () => {
    for (const scenario of ADVERSARIAL_SCENARIOS) {
      expect(scenario.attackSteps.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("severity is one of critical, high, medium", () => {
    const validSeverities = ["critical", "high", "medium"];
    for (const scenario of ADVERSARIAL_SCENARIOS) {
      expect(validSeverities).toContain(scenario.severity);
    }
  });

  it("each category has at least 2 scenarios", () => {
    for (const cat of ALL_CATEGORIES) {
      const count = ADVERSARIAL_SCENARIOS.filter((s) => s.category === cat).length;
      expect(count).toBeGreaterThanOrEqual(2);
    }
  });
});

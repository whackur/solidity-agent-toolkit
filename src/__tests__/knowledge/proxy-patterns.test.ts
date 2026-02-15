import { describe, it, expect } from "vitest";
import { PROXY_ANTI_PATTERNS } from "../../knowledge/proxy-patterns.js";

describe("PROXY_ANTI_PATTERNS", () => {
  it("has exactly 8 patterns", () => {
    expect(PROXY_ANTI_PATTERNS).toHaveLength(8);
  });

  it("has no duplicate IDs", () => {
    const ids = PROXY_ANTI_PATTERNS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("all IDs follow PROXY-NNN format", () => {
    for (const pattern of PROXY_ANTI_PATTERNS) {
      expect(pattern.id).toMatch(/^PROXY-\d{3}$/);
    }
  });

  it("every pattern has all required fields non-empty", () => {
    for (const pattern of PROXY_ANTI_PATTERNS) {
      expect(pattern.id.length).toBeGreaterThan(0);
      expect(pattern.name.length).toBeGreaterThan(0);
      expect(pattern.description.length).toBeGreaterThan(0);
      expect(pattern.recommendation.length).toBeGreaterThan(0);
      expect(pattern.patterns.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("severity is one of critical, high, medium, low", () => {
    const validSeverities = ["critical", "high", "medium", "low"];
    for (const pattern of PROXY_ANTI_PATTERNS) {
      expect(validSeverities).toContain(pattern.severity);
    }
  });

  it("has at least one critical severity pattern", () => {
    const criticals = PROXY_ANTI_PATTERNS.filter((p) => p.severity === "critical");
    expect(criticals.length).toBeGreaterThanOrEqual(1);
  });

  it("every pattern has at least one regex", () => {
    for (const pattern of PROXY_ANTI_PATTERNS) {
      expect(pattern.patterns.length).toBeGreaterThanOrEqual(1);
      for (const regex of pattern.patterns) {
        expect(regex).toBeInstanceOf(RegExp);
      }
    }
  });

  it("pattern names are unique", () => {
    const names = PROXY_ANTI_PATTERNS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("PROXY-001 matches unprotected initialize", () => {
    const pattern = PROXY_ANTI_PATTERNS.find((p) => p.id === "PROXY-001")!;
    expect(pattern.patterns[0].test("function initialize(address admin) external {")).toBe(true);
    expect(
      pattern.patterns[0].test("function initialize(address admin) external initializer {"),
    ).toBe(false);
  });

  it("PROXY-004 matches selfdestruct", () => {
    const pattern = PROXY_ANTI_PATTERNS.find((p) => p.id === "PROXY-004")!;
    expect(pattern.patterns[0].test("selfdestruct(owner)")).toBe(true);
  });

  it("PROXY-007 matches immutable keyword", () => {
    const pattern = PROXY_ANTI_PATTERNS.find((p) => p.id === "PROXY-007")!;
    expect(pattern.patterns[0].test("uint256 public immutable maxSupply = 1000;")).toBe(true);
  });
});

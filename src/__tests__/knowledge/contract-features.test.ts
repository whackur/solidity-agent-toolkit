import { describe, it, expect } from "vitest";
import { CONTRACT_FEATURE_PATTERNS } from "../../knowledge/contract-features.js";
import type { AdversarialCategory } from "../../knowledge/adversarial-scenarios.js";

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

describe("CONTRACT_FEATURE_PATTERNS", () => {
  it("covers all 8 adversarial categories", () => {
    const categories = new Set(CONTRACT_FEATURE_PATTERNS.map((p) => p.category));
    for (const cat of ALL_CATEGORIES) {
      expect(categories.has(cat)).toBe(true);
    }
  });

  it("each feature pattern has at least 1 RegExp", () => {
    for (const feature of CONTRACT_FEATURE_PATTERNS) {
      expect(feature.patterns.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("each RegExp is valid and constructable", () => {
    for (const feature of CONTRACT_FEATURE_PATTERNS) {
      for (const pattern of feature.patterns) {
        expect(() => new RegExp(pattern.source, pattern.flags)).not.toThrow();
      }
    }
  });

  it("each feature has a non-empty name and description", () => {
    for (const feature of CONTRACT_FEATURE_PATTERNS) {
      expect(feature.name.length).toBeGreaterThan(0);
      expect(feature.description.length).toBeGreaterThan(0);
    }
  });
});

describe("CONTRACT_FEATURE_PATTERNS positive matches", () => {
  it("matches AggregatorV3Interface to oracle-manipulation", () => {
    const oracleFeatures = CONTRACT_FEATURE_PATTERNS.filter(
      (p) => p.category === "oracle-manipulation",
    );
    const matches = oracleFeatures.some((f) =>
      f.patterns.some((p) => p.test("AggregatorV3Interface")),
    );
    expect(matches).toBe(true);
  });

  it("matches .call{value: to reentrancy", () => {
    const reentrancyFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "reentrancy");
    const matches = reentrancyFeatures.some((f) => f.patterns.some((p) => p.test(".call{value:")));
    expect(matches).toBe(true);
  });

  it("matches flashLoan( to flash-loan", () => {
    const flashFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "flash-loan");
    const matches = flashFeatures.some((f) => f.patterns.some((p) => p.test("flashLoan(")));
    expect(matches).toBe(true);
  });

  it("matches castVote( to governance", () => {
    const govFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "governance");
    const matches = govFeatures.some((f) => f.patterns.some((p) => p.test("castVote(")));
    expect(matches).toBe(true);
  });

  it("matches onlyOwner to access-control", () => {
    const acFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "access-control");
    const matches = acFeatures.some((f) => f.patterns.some((p) => p.test("onlyOwner")));
    expect(matches).toBe(true);
  });

  it("matches mint( to economic-logic", () => {
    const econFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "economic-logic");
    const matches = econFeatures.some((f) => f.patterns.some((p) => p.test("mint(")));
    expect(matches).toBe(true);
  });

  it("matches onERC721Received( to cross-contract", () => {
    const crossFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "cross-contract");
    const matches = crossFeatures.some((f) => f.patterns.some((p) => p.test("onERC721Received(")));
    expect(matches).toBe(true);
  });

  it("matches amountOutMin to mev-frontrunning", () => {
    const mevFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "mev-frontrunning");
    const matches = mevFeatures.some((f) => f.patterns.some((p) => p.test("amountOutMin")));
    expect(matches).toBe(true);
  });
});

describe("CONTRACT_FEATURE_PATTERNS negative matches", () => {
  const innocuousContract =
    "contract Foo { function bar() public pure returns (uint) { return 1; } }";

  it("innocuous contract does NOT match flash-loan", () => {
    const flashFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "flash-loan");
    const matches = flashFeatures.some((f) => f.patterns.some((p) => p.test(innocuousContract)));
    expect(matches).toBe(false);
  });

  it("innocuous contract does NOT match oracle-manipulation", () => {
    const oracleFeatures = CONTRACT_FEATURE_PATTERNS.filter(
      (p) => p.category === "oracle-manipulation",
    );
    const matches = oracleFeatures.some((f) => f.patterns.some((p) => p.test(innocuousContract)));
    expect(matches).toBe(false);
  });

  it("innocuous contract does NOT match governance", () => {
    const govFeatures = CONTRACT_FEATURE_PATTERNS.filter((p) => p.category === "governance");
    const matches = govFeatures.some((f) => f.patterns.some((p) => p.test(innocuousContract)));
    expect(matches).toBe(false);
  });
});

import { describe, it, expect } from "vitest";
import {
  TOP10_SCWE_MAPPINGS,
  enrichTop10WithSCWE,
  getScweIdsForTop10,
} from "../../knowledge/top10-scwe-mappings.js";
import type { SCTop10Entry } from "../../knowledge/top10-parser.js";

describe("TOP10_SCWE_MAPPINGS", () => {
  it("has mappings for SC01 through SC10", () => {
    for (let i = 1; i <= 10; i++) {
      const id = `SC${String(i).padStart(2, "0")}`;
      expect(TOP10_SCWE_MAPPINGS[id]).toBeDefined();
      expect(TOP10_SCWE_MAPPINGS[id].length).toBeGreaterThan(0);
    }
  });

  it("SC08 contains SCWE-046", () => {
    expect(TOP10_SCWE_MAPPINGS.SC08).toContain("SCWE-046");
  });

  it("SC01 contains SCWE-016 and SCWE-017", () => {
    expect(TOP10_SCWE_MAPPINGS.SC01).toContain("SCWE-016");
    expect(TOP10_SCWE_MAPPINGS.SC01).toContain("SCWE-017");
  });

  it("every mapping value is a valid SCWE ID format", () => {
    for (const ids of Object.values(TOP10_SCWE_MAPPINGS)) {
      for (const id of ids) {
        expect(id).toMatch(/^SCWE-\d{3}$/);
      }
    }
  });
});

describe("getScweIdsForTop10", () => {
  it("returns SCWE IDs for SC08", () => {
    const ids = getScweIdsForTop10("SC08");
    expect(ids).toContain("SCWE-046");
    expect(ids).toContain("SCWE-102");
  });

  it("is case-insensitive", () => {
    expect(getScweIdsForTop10("sc08")).toEqual(getScweIdsForTop10("SC08"));
  });

  it("returns empty array for unknown id", () => {
    expect(getScweIdsForTop10("SC99")).toEqual([]);
  });
});

describe("enrichTop10WithSCWE", () => {
  it("populates relatedSCWE from mapping table", () => {
    const entries: SCTop10Entry[] = [
      {
        id: "SC08",
        title: "Reentrancy",
        description: "",
        examples: { vulnerable: "", fixed: "" },
        caseStudies: [],
        mitigations: [],
        relatedSCWE: [],
      },
    ];
    const enriched = enrichTop10WithSCWE(entries);
    expect(enriched[0].relatedSCWE).toEqual(["SCWE-046", "SCWE-102"]);
  });

  it("leaves relatedSCWE empty for unknown ids", () => {
    const entries: SCTop10Entry[] = [
      {
        id: "SC99",
        title: "Unknown",
        description: "",
        examples: { vulnerable: "", fixed: "" },
        caseStudies: [],
        mitigations: [],
        relatedSCWE: [],
      },
    ];
    const enriched = enrichTop10WithSCWE(entries);
    expect(enriched[0].relatedSCWE).toEqual([]);
  });
});

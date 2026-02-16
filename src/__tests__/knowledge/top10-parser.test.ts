import { describe, it, expect, beforeEach } from "vitest";
import {
  loadAllTop10,
  getTop10ById,
  searchTop10,
  _resetCache,
} from "../../knowledge/top10-parser.js";

beforeEach(() => {
  _resetCache();
});

describe("loadAllTop10", () => {
  it("loads all 10 SC Top 10 entries", () => {
    const entries = loadAllTop10();
    expect(entries).toHaveLength(10);
  });

  it("returns entries sorted SC01 through SC10", () => {
    const entries = loadAllTop10();
    const ids = entries.map((e) => e.id);
    expect(ids).toEqual([
      "SC01",
      "SC02",
      "SC03",
      "SC04",
      "SC05",
      "SC06",
      "SC07",
      "SC08",
      "SC09",
      "SC10",
    ]);
  });

  it("every entry has non-empty id, title, and description", () => {
    for (const entry of loadAllTop10()) {
      expect(entry.id).toMatch(/^SC\d{2}$/);
      expect(entry.title.length).toBeGreaterThan(0);
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it("caches results across calls", () => {
    const first = loadAllTop10();
    const second = loadAllTop10();
    expect(first).toBe(second);
  });
});

describe("getTop10ById", () => {
  it("returns SC01 (Access Control Vulnerabilities)", () => {
    const entry = getTop10ById("SC01");
    expect(entry).toBeDefined();
    expect(entry!.title).toContain("Access Control");
  });

  it("returns SC08 (Reentrancy Attacks)", () => {
    const entry = getTop10ById("SC08");
    expect(entry).toBeDefined();
    expect(entry!.title).toContain("Reentrancy");
  });

  it("is case-insensitive", () => {
    expect(getTop10ById("sc01")).toBeDefined();
  });

  it("returns undefined for unknown id", () => {
    expect(getTop10ById("SC99")).toBeUndefined();
  });
});

describe("searchTop10", () => {
  it("finds reentrancy entry", () => {
    const results = searchTop10("reentrancy");
    expect(results.length).toBeGreaterThan(0);
    expect(results.map((e) => e.id)).toContain("SC08");
  });

  it("returns empty for nonsense query", () => {
    expect(searchTop10("xyzzy_nonexistent_12345")).toEqual([]);
  });
});

describe("Top 10 SCWE enrichment", () => {
  it("populates relatedSCWE for all entries", () => {
    const entries = loadAllTop10();
    for (const entry of entries) {
      expect(entry.relatedSCWE.length).toBeGreaterThan(0);
    }
  });

  it("SC08 has SCWE-046 in relatedSCWE", () => {
    const entry = getTop10ById("SC08")!;
    expect(entry.relatedSCWE).toContain("SCWE-046");
  });

  it("SC01 relatedSCWE includes SCWE-016", () => {
    const entry = getTop10ById("SC01")!;
    expect(entry.relatedSCWE).toContain("SCWE-016");
  });
});

describe("SC Top 10 content parsing", () => {
  it("extracts code examples from SC01", () => {
    const entry = getTop10ById("SC01")!;
    expect(entry.examples.vulnerable.length).toBeGreaterThan(0);
    expect(entry.examples.fixed.length).toBeGreaterThan(0);
  });

  it("extracts case studies from SC01", () => {
    const entry = getTop10ById("SC01")!;
    expect(entry.caseStudies.length).toBeGreaterThan(0);
  });

  it("extracts mitigations from SC01", () => {
    const entry = getTop10ById("SC01")!;
    expect(entry.mitigations.length).toBeGreaterThan(0);
  });

  it("extracts examples from SC08", () => {
    const entry = getTop10ById("SC08")!;
    expect(entry.examples.vulnerable).toContain("withdraw");
    expect(entry.examples.fixed).toContain("nonReentrant");
  });
});

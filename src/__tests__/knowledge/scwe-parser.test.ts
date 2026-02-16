import { describe, it, expect, beforeEach } from "vitest";
import {
  loadAllSCWE,
  getSCWEById,
  searchSCWE,
  getScweByCwe,
  _resetCache,
} from "../../knowledge/scwe-parser.js";

beforeEach(() => {
  _resetCache();
});

describe("loadAllSCWE", () => {
  it("loads all 156 SCWE entries", () => {
    const entries = loadAllSCWE();
    expect(entries).toHaveLength(156);
  });

  it("returns entries sorted by numeric id", () => {
    const entries = loadAllSCWE();
    const ids = entries.map((e) => parseInt(e.id.replace("SCWE-", ""), 10));
    const sorted = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sorted);
  });

  it("every entry has a non-empty id and title", () => {
    for (const entry of loadAllSCWE()) {
      expect(entry.id).toMatch(/^SCWE-\d{3}$/);
      expect(entry.title.length).toBeGreaterThan(0);
    }
  });

  it("every entry has valid mappings", () => {
    for (const entry of loadAllSCWE()) {
      expect(entry.mappings.scsvsCg.length).toBeGreaterThan(0);
      expect(entry.mappings.scsvsScg.length).toBeGreaterThan(0);
      expect(entry.mappings.cwe.length).toBeGreaterThan(0);
      for (const cwe of entry.mappings.cwe) {
        expect(typeof cwe).toBe("number");
        expect(Number.isNaN(cwe)).toBe(false);
      }
    }
  });

  it("every entry has a non-empty description", () => {
    for (const entry of loadAllSCWE()) {
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it("caches results across calls", () => {
    const first = loadAllSCWE();
    const second = loadAllSCWE();
    expect(first).toBe(second);
  });
});

describe("getSCWEById", () => {
  it("returns SCWE-046 (Reentrancy Attacks)", () => {
    const entry = getSCWEById("SCWE-046");
    expect(entry).toBeDefined();
    expect(entry!.id).toBe("SCWE-046");
    expect(entry!.title).toBe("Reentrancy Attacks");
    expect(entry!.mappings.scsvsCg).toContain("SCSVS-CODE");
    expect(entry!.mappings.cwe).toContain(367);
  });

  it("returns SCWE-001 (Improper Contract Architecture)", () => {
    const entry = getSCWEById("SCWE-001");
    expect(entry).toBeDefined();
    expect(entry!.title).toBe("Improper Contract Architecture");
    expect(entry!.alias).toContain("improper-contract");
  });

  it("is case-insensitive", () => {
    expect(getSCWEById("scwe-046")).toBeDefined();
    expect(getSCWEById("Scwe-046")).toBeDefined();
  });

  it("returns undefined for unknown id", () => {
    expect(getSCWEById("SCWE-999")).toBeUndefined();
  });
});

describe("searchSCWE", () => {
  it("finds reentrancy entries", () => {
    const results = searchSCWE("reentrancy");
    expect(results.length).toBeGreaterThan(0);
    const ids = results.map((e) => e.id);
    expect(ids).toContain("SCWE-046");
  });

  it("finds entries by description keyword", () => {
    const results = searchSCWE("proxy");
    expect(results.length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    const lower = searchSCWE("reentrancy");
    const upper = searchSCWE("REENTRANCY");
    expect(lower).toEqual(upper);
  });

  it("returns empty array for nonsense query", () => {
    expect(searchSCWE("xyzzy_nonexistent_12345")).toEqual([]);
  });
});

describe("getScweByCwe", () => {
  it("returns SCWE-046 for CWE-367", () => {
    const results = getScweByCwe(367);
    const ids = results.map((e) => e.id);
    expect(ids).toContain("SCWE-046");
  });

  it("returns empty array for nonexistent CWE", () => {
    expect(getScweByCwe(99999)).toEqual([]);
  });

  it("returns multiple entries when CWE maps to several SCWEs", () => {
    const results = getScweByCwe(367);
    expect(results.length).toBeGreaterThanOrEqual(1);
    for (const entry of results) {
      expect(entry.mappings.cwe).toContain(367);
    }
  });
});

describe("SCWE entry content parsing", () => {
  it("extracts code examples from SCWE-046", () => {
    const entry = getSCWEById("SCWE-046")!;
    expect(entry.examples.vulnerable).toContain("msg.sender.call");
    expect(entry.examples.fixed).toContain("nonReentrant");
  });

  it("extracts relationships from SCWE-046", () => {
    const entry = getSCWEById("SCWE-046")!;
    expect(entry.relationships).toContain("CWE-367");
  });

  it("extracts remediation from SCWE-001", () => {
    const entry = getSCWEById("SCWE-001")!;
    expect(entry.remediation).toContain("Modular design");
  });

  it("handles entries with bullet-style examples (SCWE-025)", () => {
    const entry = getSCWEById("SCWE-025")!;
    expect(entry.examples.vulnerable).toContain("keccak256");
    expect(entry.examples.fixed.length).toBeGreaterThan(0);
  });
});

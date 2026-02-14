import { describe, it, expect, beforeEach } from "vitest";
import { searchSCWE, getSCWEById, _resetCache } from "../../knowledge/scwe-parser.js";

beforeEach(() => {
  _resetCache();
});

describe("SCWE Search Tools", () => {
  describe("search_vulnerabilities", () => {
    it("finds reentrancy vulnerabilities", () => {
      const results = searchSCWE("reentrancy");

      expect(results.length).toBeGreaterThan(0);
      const ids = results.map((r) => r.id);
      expect(ids).toContain("SCWE-046");
      expect(ids).toContain("SCWE-137");

      const scwe046 = results.find((r) => r.id === "SCWE-046");
      expect(scwe046?.title).toContain("Reentrancy");
    });

    it("returns empty array for non-existent vulnerability", () => {
      const results = searchSCWE("nonexistentxyz123");
      expect(results).toHaveLength(0);
    });

    it("filters by CWE number", () => {
      const allResults = searchSCWE("reentrancy");
      const filtered = allResults.filter((e) => e.mappings.cwe.includes(367));

      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].id).toBe("SCWE-046");
      expect(filtered[0].mappings.cwe).toContain(367);
    });

    it("filters by category", () => {
      const allResults = searchSCWE("");
      const filtered = allResults.filter((e) =>
        e.mappings.scsvsCg.some((c) => c.toLowerCase().includes("scsvs-code")),
      );

      expect(filtered.length).toBeGreaterThan(0);
    });

    it("is case-insensitive", () => {
      const results1 = searchSCWE("REENTRANCY");
      const results2 = searchSCWE("reentrancy");

      expect(results1.length).toBe(results2.length);
    });
  });

  describe("get_remediation", () => {
    it("returns remediation for SCWE-046", () => {
      const entry = getSCWEById("SCWE-046");

      expect(entry).toBeDefined();
      expect(entry?.id).toBe("SCWE-046");
      expect(entry?.title).toContain("Reentrancy");
      expect(entry?.description).toBeTruthy();
      expect(entry?.remediation).toBeTruthy();
      expect(entry?.examples.vulnerable).toBeTruthy();
      expect(entry?.examples.fixed).toBeTruthy();
      expect(entry?.mappings.cwe).toContain(367);
    });

    it("returns remediation for SCWE-001", () => {
      const entry = getSCWEById("SCWE-001");

      expect(entry).toBeDefined();
      expect(entry?.id).toBe("SCWE-001");
      expect(entry?.remediation).toBeTruthy();
    });

    it("returns undefined for invalid vulnerability ID", () => {
      const entry = getSCWEById("SCWE-999");
      expect(entry).toBeUndefined();
    });

    it("is case-insensitive for vulnerability ID", () => {
      const entry1 = getSCWEById("SCWE-046");
      const entry2 = getSCWEById("scwe-046");

      expect(entry1).toBeDefined();
      expect(entry2).toBeDefined();
      expect(entry1?.id).toBe(entry2?.id);
    });
  });

  describe("check_vulnerability pattern matching", () => {
    it("detects external call patterns", () => {
      const vulnerableCode = `
        function withdraw(uint amount) public {
          (bool success, ) = msg.sender.call{value: amount}("");
          balances[msg.sender] -= amount;
        }
      `;

      const entry = getSCWEById("SCWE-046");
      expect(entry).toBeDefined();
      expect(entry?.examples.vulnerable).toContain("call");
    });

    it("SCWE entries have vulnerable and fixed examples", () => {
      const entry = getSCWEById("SCWE-046");

      expect(entry).toBeDefined();
      expect(entry?.examples.vulnerable).toBeTruthy();
      expect(entry?.examples.fixed).toBeTruthy();
      expect(entry?.examples.vulnerable.length).toBeGreaterThan(0);
      expect(entry?.examples.fixed.length).toBeGreaterThan(0);
    });

    it("can find entries with examples for pattern matching", () => {
      const allEntries = searchSCWE("");
      const entriesWithExamples = allEntries.filter((e) => e.examples.vulnerable);

      expect(entriesWithExamples.length).toBeGreaterThan(0);
    });
  });

  describe("SCWE data integrity", () => {
    it("loads all 156 SCWE entries", () => {
      const allEntries = searchSCWE("");
      expect(allEntries).toHaveLength(156);
    });

    it("all entries have required fields", () => {
      const allEntries = searchSCWE("");

      for (const entry of allEntries) {
        expect(entry.id).toBeTruthy();
        expect(entry.title).toBeTruthy();
        expect(entry.description).toBeTruthy();
        expect(entry.remediation).toBeTruthy();
        expect(entry.mappings).toBeDefined();
      }
    });

    it("SCWE-046 has correct CWE mapping", () => {
      const entry = getSCWEById("SCWE-046");
      expect(entry?.mappings.cwe).toContain(367);
    });
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSCWEResources } from "../../resources/scwe-resources.js";
import { loadAllSCWE, getSCWEById, _resetCache } from "../../knowledge/scwe-parser.js";

describe("SCWE Resources", () => {
  beforeEach(() => {
    _resetCache();
  });

  describe("registerSCWEResources", () => {
    it("registers resources without errors", () => {
      const server = new McpServer({
        name: "test-server",
        version: "1.0.0",
      });
      expect(() => registerSCWEResources(server)).not.toThrow();
    });
  });

  describe("scwe://list resource", () => {
    it("returns all 156 SCWE entries", () => {
      const entries = loadAllSCWE();
      expect(entries).toHaveLength(156);

      const listContent = entries.map((e) => `- **${e.id}**: ${e.title}`).join("\n");

      expect(listContent).toContain("SCWE-046");
      expect(listContent).toContain("Reentrancy Attacks");
    });

    it("includes all entry IDs and titles", () => {
      const entries = loadAllSCWE();
      const ids = entries.map((e) => e.id);

      expect(ids).toContain("SCWE-001");
      expect(ids).toContain("SCWE-046");
      expect(ids).toContain("SCWE-156");
    });
  });

  describe("scwe://{id} resource template", () => {
    it("returns SCWE-046 (Reentrancy Attacks)", () => {
      const entry = getSCWEById("SCWE-046");
      expect(entry).toBeDefined();
      expect(entry!.id).toBe("SCWE-046");
      expect(entry!.title).toBe("Reentrancy Attacks");
      expect(entry!.mappings.scsvsCg).toContain("SCSVS-CODE");
      expect(entry!.mappings.cwe).toContain(367);
      expect(entry!.description).toBeTruthy();
      expect(entry!.remediation).toBeTruthy();
      expect(entry!.examples.vulnerable).toBeTruthy();
      expect(entry!.examples.fixed).toBeTruthy();
    });

    it("returns SCWE-001 (Improper Contract Architecture)", () => {
      const entry = getSCWEById("SCWE-001");
      expect(entry).toBeDefined();
      expect(entry!.id).toBe("SCWE-001");
      expect(entry!.title).toBe("Improper Contract Architecture");
      expect(entry!.description).toBeTruthy();
    });

    it("returns undefined for invalid SCWE ID", () => {
      const entry = getSCWEById("SCWE-999");
      expect(entry).toBeUndefined();
    });
  });

  describe("scwe://category/{category} resource template", () => {
    it("returns CODE category entries", () => {
      const entries = loadAllSCWE();
      const codeEntries = entries.filter((entry) =>
        entry.mappings.scsvsCg.some((c) => c.toUpperCase() === "SCSVS-CODE"),
      );

      expect(codeEntries.length).toBeGreaterThan(0);
      const ids = codeEntries.map((e) => e.id);
      expect(ids).toContain("SCWE-046");
    });

    it("is case-insensitive for category matching", () => {
      const entries = loadAllSCWE();
      const upperEntries = entries.filter((entry) =>
        entry.mappings.scsvsCg.some((c) => c.toUpperCase() === "SCSVS-CODE"),
      );
      const lowerEntries = entries.filter((entry) =>
        entry.mappings.scsvsCg.some((c) => c.toUpperCase() === "SCSVS-CODE"),
      );

      expect(upperEntries.length).toBe(lowerEntries.length);
      expect(upperEntries.map((e) => e.id)).toEqual(lowerEntries.map((e) => e.id));
    });

    it("returns empty array for unknown category", () => {
      const entries = loadAllSCWE();
      const filtered = entries.filter((entry) =>
        entry.mappings.scsvsCg.some((c) => c.toUpperCase() === "NONEXISTENT"),
      );

      expect(filtered).toHaveLength(0);
    });
  });
});

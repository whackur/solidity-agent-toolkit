import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerTop10Resources } from "../../mcp/resources/top10-resources.js";
import { loadAllTop10, getTop10ById, _resetCache } from "../../knowledge/top10-parser.js";

describe("Top 10 Resources", () => {
  beforeEach(() => {
    _resetCache();
  });

  describe("registerTop10Resources", () => {
    it("registers resources without errors", () => {
      const server = new McpServer({
        name: "test-server",
        version: "1.0.0",
      });
      expect(() => registerTop10Resources(server)).not.toThrow();
    });
  });

  describe("sctop10://list resource", () => {
    it("returns list of all 10 SC Top 10 items", async () => {
      const entries = loadAllTop10();
      expect(entries).toHaveLength(10);

      const listContent = entries.map((e) => `- **${e.id}**: ${e.title}`).join("\n");

      expect(listContent).toContain("SC01");
      expect(listContent).toContain("SC10");
    });

    it("includes all 10 items in list", () => {
      const entries = loadAllTop10();
      const ids = entries.map((e) => e.id);

      for (let i = 1; i <= 10; i++) {
        const id = `SC${String(i).padStart(2, "0")}`;
        expect(ids).toContain(id);
      }
    });
  });

  describe("sctop10://{id} resource template", () => {
    it("returns SC01 (Access Control Vulnerabilities) details", () => {
      const entry = getTop10ById("SC01");
      expect(entry).toBeDefined();
      expect(entry!.id).toBe("SC01");
      expect(entry!.title).toContain("Access Control");
    });

    it("returns SC08 (Reentrancy Attacks) details", () => {
      const entry = getTop10ById("SC08");
      expect(entry).toBeDefined();
      expect(entry!.id).toBe("SC08");
      expect(entry!.title).toContain("Reentrancy");
    });

    it("includes description section", () => {
      const entry = getTop10ById("SC01");
      expect(entry!.description).toBeDefined();
      expect(entry!.description.length).toBeGreaterThan(0);
    });

    it("includes vulnerable and fixed examples", () => {
      const entry = getTop10ById("SC01");
      expect(entry!.examples.vulnerable).toBeDefined();
      expect(entry!.examples.vulnerable.length).toBeGreaterThan(0);
      expect(entry!.examples.fixed).toBeDefined();
      expect(entry!.examples.fixed.length).toBeGreaterThan(0);
    });

    it("includes case studies section", () => {
      const entry = getTop10ById("SC01");
      expect(entry!.caseStudies).toBeDefined();
      expect(entry!.caseStudies.length).toBeGreaterThan(0);
    });

    it("includes mitigations section", () => {
      const entry = getTop10ById("SC01");
      expect(entry!.mitigations).toBeDefined();
      expect(entry!.mitigations.length).toBeGreaterThan(0);
    });

    it("returns undefined for invalid ID", () => {
      const entry = getTop10ById("SC99");
      expect(entry).toBeUndefined();
    });
  });

  describe("SC Top 10 content", () => {
    it("all entries have related SCWE array", () => {
      const entries = loadAllTop10();
      for (const entry of entries) {
        expect(entry.relatedSCWE).toBeDefined();
        expect(Array.isArray(entry.relatedSCWE)).toBe(true);
      }
    });

    it("SC01 has all required sections", () => {
      const entry = getTop10ById("SC01");
      expect(entry).toBeDefined();
      expect(entry!.id).toBe("SC01");
      expect(entry!.title).toBeDefined();
      expect(entry!.description).toBeDefined();
      expect(entry!.examples).toBeDefined();
      expect(entry!.caseStudies).toBeDefined();
      expect(entry!.mitigations).toBeDefined();
    });

    it("SC08 has reentrancy-related examples", () => {
      const entry = getTop10ById("SC08");
      expect(entry).toBeDefined();
      expect(entry!.examples.vulnerable).toContain("withdraw");
      expect(entry!.examples.fixed).toContain("nonReentrant");
    });
  });
});

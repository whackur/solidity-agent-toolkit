import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAdversarialResources } from "../../mcp/resources/adversarial-resources.js";
import { ADVERSARIAL_SCENARIOS } from "../../knowledge/index.js";

describe("Adversarial Resources", () => {
  describe("registerAdversarialResources", () => {
    it("registers resources without errors", () => {
      const server = new McpServer({
        name: "test-server",
        version: "1.0.0",
      });
      expect(() => registerAdversarialResources(server)).not.toThrow();
    });
  });

  describe("adversarial://list resource", () => {
    it("returns all 17 scenarios", () => {
      expect(ADVERSARIAL_SCENARIOS).toHaveLength(17);
    });

    it("contains all 8 categories", () => {
      const categories = new Set(ADVERSARIAL_SCENARIOS.map((s) => s.category));
      expect(categories.size).toBe(8);
      expect(categories).toContain("reentrancy");
      expect(categories).toContain("flash-loan");
      expect(categories).toContain("oracle-manipulation");
      expect(categories).toContain("mev-frontrunning");
      expect(categories).toContain("governance");
      expect(categories).toContain("access-control");
      expect(categories).toContain("economic-logic");
      expect(categories).toContain("cross-contract");
    });
  });

  describe("adversarial://category/{category} resource template", () => {
    it("returns scenarios for reentrancy category", () => {
      const reentrancyScenarios = ADVERSARIAL_SCENARIOS.filter((s) => s.category === "reentrancy");
      expect(reentrancyScenarios.length).toBeGreaterThan(0);
      expect(reentrancyScenarios.map((s) => s.id)).toContain("AS-001");
      expect(reentrancyScenarios.map((s) => s.id)).toContain("AS-002");
      expect(reentrancyScenarios.map((s) => s.id)).toContain("AS-003");
    });

    it("returns empty array for invalid category", () => {
      const filtered = ADVERSARIAL_SCENARIOS.filter((s) => s.category === ("nonexistent" as any));
      expect(filtered).toHaveLength(0);
    });

    it("returns scenarios for flash-loan category", () => {
      const flashLoanScenarios = ADVERSARIAL_SCENARIOS.filter((s) => s.category === "flash-loan");
      expect(flashLoanScenarios.length).toBeGreaterThan(0);
      expect(flashLoanScenarios.map((s) => s.id)).toContain("AS-004");
    });
  });

  describe("adversarial://scenario/{id} resource template", () => {
    it("returns AS-001 scenario with full details", () => {
      const scenario = ADVERSARIAL_SCENARIOS.find((s) => s.id === "AS-001");
      expect(scenario).toBeDefined();
      expect(scenario!.id).toBe("AS-001");
      expect(scenario!.name).toBe("Classic Ether Drain via Fallback");
      expect(scenario!.severity).toBe("critical");
      expect(scenario!.scweIds).toContain("SCWE-046");
      expect(scenario!.owasp2026).toBe("SC01");
      expect(scenario!.description).toBeTruthy();
      expect(scenario!.preConditions.length).toBeGreaterThan(0);
      expect(scenario!.attackSteps.length).toBeGreaterThan(0);
      expect(scenario!.invariantsViolated.length).toBeGreaterThan(0);
      expect(scenario!.realWorldExample).toContain("DAO");
    });

    it("returns AS-004 scenario (flash loan)", () => {
      const scenario = ADVERSARIAL_SCENARIOS.find((s) => s.id === "AS-004");
      expect(scenario).toBeDefined();
      expect(scenario!.id).toBe("AS-004");
      expect(scenario!.name).toBe("Flash Loan Price Manipulation");
      expect(scenario!.category).toBe("flash-loan");
    });

    it("returns undefined for invalid scenario ID", () => {
      const scenario = ADVERSARIAL_SCENARIOS.find((s) => s.id === "AS-999");
      expect(scenario).toBeUndefined();
    });

    it("all scenarios have required fields", () => {
      for (const scenario of ADVERSARIAL_SCENARIOS) {
        expect(scenario.id).toBeTruthy();
        expect(scenario.category).toBeTruthy();
        expect(scenario.name).toBeTruthy();
        expect(scenario.severity).toMatch(/^(critical|high|medium)$/);
        expect(scenario.description).toBeTruthy();
        expect(Array.isArray(scenario.preConditions)).toBe(true);
        expect(Array.isArray(scenario.attackSteps)).toBe(true);
        expect(Array.isArray(scenario.invariantsViolated)).toBe(true);
        expect(Array.isArray(scenario.scweIds)).toBe(true);
        expect(scenario.owasp2026).toBeTruthy();
        expect(scenario.realWorldExample).toBeTruthy();
      }
    });

    it("all scenarios have at least one SCWE ID", () => {
      for (const scenario of ADVERSARIAL_SCENARIOS) {
        expect(scenario.scweIds.length).toBeGreaterThan(0);
      }
    });

    it("all scenario IDs are unique", () => {
      const ids = ADVERSARIAL_SCENARIOS.map((s) => s.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });
});

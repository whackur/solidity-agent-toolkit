import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  buildAuditPrompt,
  buildVulnerabilityFixPrompt,
} from "../../mcp/prompts/security-audit-logic.js";
import * as top10Parser from "../../knowledge/top10-parser.js";
import * as scweParser from "../../knowledge/scwe-parser.js";

describe("Security Audit Logic", () => {
  describe("buildAuditPrompt", () => {
    it("generates a quick audit prompt with Top 10 checklist", () => {
      const { system, user } = buildAuditPrompt("contract Test {}", "quick");
      expect(system).toContain("OWASP Smart Contract Top 10");
      expect(user).toContain("contract Test {}");
      expect(user).toContain("quick security audit");
    });

    it("generates a deep audit prompt with SCWE knowledge base", () => {
      const { system, user } = buildAuditPrompt("contract Test {}", "deep");
      expect(system).toContain("Smart Contract Weakness Enumeration (SCWE)");
      expect(user).toContain("contract Test {}");
      expect(user).toContain("deep security audit");
    });
  });

  describe("buildVulnerabilityFixPrompt", () => {
    it("generates a fix prompt for a valid SCWE ID", () => {
      const prompt = buildVulnerabilityFixPrompt("function withdraw() public {}", "SCWE-101");
      expect(prompt).toContain("Vulnerability: SCWE-101");
      expect(prompt).toContain("Remediation Guide");
      expect(prompt).toContain("function withdraw() public {}");
    });

    it("handles invalid SCWE ID gracefully", () => {
      const prompt = buildVulnerabilityFixPrompt("contract Test {}", "INVALID-ID");
      expect(prompt).toContain("couldn't find details for vulnerability ID: INVALID-ID");
    });
  });
});

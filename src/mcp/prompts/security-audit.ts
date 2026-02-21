import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildAuditPrompt, buildVulnerabilityFixPrompt } from "./security-audit-logic.js";

export function registerSecurityAuditPrompts(server: McpServer) {
  server.prompt(
    "security_audit",
    "Generate a structured security audit methodology for a Solidity contract. " +
      "Produces a step-by-step audit checklist using OWASP Top 10 (quick) or full SCWE knowledge base (deep). " +
      "Use AFTER running run_security_scan to organize findings into a comprehensive report. " +
      "Use when: 'audit this contract', 'perform security review', 'generate audit report'.",
    {
      contractCode: z.string().describe("The Solidity contract code to audit"),
      auditLevel: z
        .enum(["quick", "deep"])
        .optional()
        .describe("Audit depth: quick (Top 10) or deep (Full SCWE)"),
    },
    async ({ contractCode, auditLevel }) => {
      const level = auditLevel || "quick";
      const { system, user } = buildAuditPrompt(contractCode, level);
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `SYSTEM INSTRUCTIONS:\n${system}`,
            },
          },
          {
            role: "user",
            content: {
              type: "text",
              text: user,
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "vulnerability_fix",
    "Generate a targeted remediation guide for a specific SCWE vulnerability in Solidity code. " +
      "Returns the vulnerability description, official remediation steps, and a task to produce fixed code. " +
      "Use when: 'fix this vulnerability', 'how to remediate SCWE-046', 'patch reentrancy bug'.",
    {
      code: z.string().describe("The vulnerable Solidity code snippet"),
      vulnerabilityId: z.string().describe("The SCWE ID (e.g., SCWE-101)"),
    },
    async ({ code, vulnerabilityId }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: buildVulnerabilityFixPrompt(code, vulnerabilityId),
            },
          },
        ],
      };
    },
  );
}

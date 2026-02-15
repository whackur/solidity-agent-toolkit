import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildAuditPrompt, buildVulnerabilityFixPrompt } from "./security-audit-logic.js";

export function registerSecurityAuditPrompts(server: McpServer) {
  server.prompt(
    "security_audit",
    "Comprehensive security audit for Solidity contracts",
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
    "Remediation guide and fix for a specific vulnerability",
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

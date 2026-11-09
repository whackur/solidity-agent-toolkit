import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GUIDES, GUIDE_IDS } from "../../knowledge/guide-catalog.js";
import {
  handleGuide,
  handleGuideList,
  handleVulnerabilityLookup,
  handleVulnerabilitySearch,
} from "./knowledge-lookup-handlers.js";
import { describeError, errorResult } from "./tool-result.js";

const LookupKnowledgeSchema = z.object({
  guide: z
    .enum(GUIDE_IDS)
    .optional()
    .describe(
      `Guide id. Available guides and references: ${GUIDES.map((guide) => guide.id).join(", ")}. ` +
        "Takes precedence over other fields.",
    ),
  query: z
    .string()
    .optional()
    .describe("SCWE search query for vulnerability title, description, or alias"),
  vulnerabilityId: z
    .string()
    .optional()
    .describe(
      "Direct lookup: get detailed info and remediation for a specific SCWE ID (e.g., SCWE-046)",
    ),
  filters: z
    .object({
      category: z.string().optional().describe("Filter by SCSVS category"),
      cwe: z.number().optional().describe("Filter by CWE number"),
      severity: z.string().optional().describe("Filter by severity level"),
    })
    .optional()
    .describe("Optional filters to narrow query results"),
});

export function registerKnowledgeLookupTools(server: McpServer): void {
  server.registerTool(
    "lookup_knowledge",
    {
      description:
        "Knowledge lookup — does NOT analyze code. Load guides (audit, threat modeling, gas, ERC, " +
        "Foundry/Hardhat, Solidity UML) or search OWASP SCWE / fetch an SCWE ID with remediation. " +
        "No args lists guides. Trigger: 'Solidity repository architecture/composition diagram', " +
        "'audit checklist', 'reentrancy', 'SCWE-046'. NOT for: code scanning (use run_security_scan).",
      inputSchema: LookupKnowledgeSchema.shape,
    },
    async ({ guide, query, vulnerabilityId, filters }) => {
      try {
        if (guide) return handleGuide(guide);
        if (vulnerabilityId) return handleVulnerabilityLookup(vulnerabilityId);
        if (query) return handleVulnerabilitySearch(query, filters);
        return handleGuideList();
      } catch (error) {
        return errorResult(`Error looking up knowledge: ${describeError(error)}`);
      }
    },
  );
}

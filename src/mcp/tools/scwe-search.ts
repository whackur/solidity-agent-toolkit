import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  formatSearchResult,
  formatRemediationResult,
  searchAndFilterSCWE,
  getSCWEEntry,
} from "../../core/scwe-search.js";

const SearchVulnerabilitiesSchema = z.object({
  query: z.string().describe("Search query for vulnerability title, description, or alias"),
  filters: z
    .object({
      category: z.string().optional().describe("Filter by SCSVS category"),
      cwe: z.number().optional().describe("Filter by CWE number"),
      severity: z.string().optional().describe("Filter by severity level"),
    })
    .optional()
    .describe("Optional filters to narrow search results"),
});

const GetRemediationSchema = z.object({
  vulnerabilityId: z.string().describe("SCWE ID to get remediation for (e.g., SCWE-046)"),
});

export function registerSCWESearchTools(server: McpServer): void {
  server.tool(
    "search_vulnerabilities",
    "Search OWASP SCWE vulnerabilities by query string and optional filters",
    SearchVulnerabilitiesSchema.shape,
    async ({ query, filters }) => {
      try {
        const results = searchAndFilterSCWE(query, filters);

        if (results.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No vulnerabilities found matching query: "${query}"`,
              },
            ],
          };
        }

        const formattedResults = results.map(formatSearchResult).join("\n\n---\n\n");
        const summary = `Found ${results.length} vulnerability(ies) matching "${query}":\n\n${formattedResults}`;

        return {
          content: [
            {
              type: "text" as const,
              text: summary,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error searching vulnerabilities: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_remediation",
    "Get detailed remediation guidance and fixed code examples for a specific SCWE vulnerability",
    GetRemediationSchema.shape,
    async ({ vulnerabilityId }) => {
      try {
        const entry = getSCWEEntry(vulnerabilityId);

        if (!entry) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Vulnerability ID "${vulnerabilityId}" not found. Please use a valid SCWE ID (e.g., SCWE-046).`,
              },
            ],
            isError: true,
          };
        }

        const formattedResult = formatRemediationResult(entry);

        return {
          content: [
            {
              type: "text" as const,
              text: formattedResult,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error retrieving remediation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

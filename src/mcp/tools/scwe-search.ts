import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { SCWEEntry } from "../../knowledge/index.js";
import {
  formatSearchResult,
  formatRemediationResult,
  checkCodeForVulnerability,
  searchAndFilterSCWE,
  getSCWEEntry,
  getSCWEEntriesWithVulnerableExamples,
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

const CheckVulnerabilitySchema = z.object({
  code: z.string().describe("Solidity code to check for vulnerabilities"),
  vulnerabilityId: z
    .string()
    .optional()
    .describe("Optional specific SCWE ID to check against (e.g., SCWE-046)"),
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
    "check_vulnerability",
    "Check Solidity code for potential vulnerabilities using pattern matching against SCWE examples",
    CheckVulnerabilitySchema.shape,
    async ({ code, vulnerabilityId }) => {
      try {
        let entriesToCheck: SCWEEntry[] = [];

        if (vulnerabilityId) {
          const entry = getSCWEEntry(vulnerabilityId);
          if (!entry) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `Vulnerability ID "${vulnerabilityId}" not found`,
                },
              ],
              isError: true,
            };
          }
          entriesToCheck = [entry];
        } else {
          entriesToCheck = getSCWEEntriesWithVulnerableExamples();
        }

        const matches: { entry: SCWEEntry; confidence: string; details: string }[] = [];

        for (const entry of entriesToCheck) {
          const result = checkCodeForVulnerability(code, entry);
          if (result.match) {
            matches.push({
              entry,
              confidence: result.confidence,
              details: result.details,
            });
          }
        }

        if (matches.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: vulnerabilityId
                  ? `No patterns matching ${vulnerabilityId} detected in the provided code`
                  : "No known vulnerability patterns detected in the provided code",
              },
            ],
          };
        }

        const confidenceOrder = { high: 0, medium: 1, low: 2, "very low": 3 };
        matches.sort(
          (a, b) =>
            confidenceOrder[a.confidence as keyof typeof confidenceOrder] -
            confidenceOrder[b.confidence as keyof typeof confidenceOrder],
        );

        let result = `Found ${matches.length} potential vulnerability pattern(s):\n\n`;

        for (const match of matches) {
          const cweMappings =
            match.entry.mappings.cwe.length > 0
              ? ` (CWE-${match.entry.mappings.cwe.join(", CWE-")})`
              : "";
          result += `**${match.entry.id}: ${match.entry.title}**${cweMappings}\n`;
          result += `Confidence: ${match.confidence}\n`;
          result += `Details: ${match.details}\n`;
          result += `\nDescription: ${match.entry.description.split("\n")[0]}\n\n`;
          result += `---\n\n`;
        }

        result +=
          "\n**Note:** This is pattern-based detection. For comprehensive analysis, use static analysis tools like Slither or Aderyn.";

        return {
          content: [
            {
              type: "text" as const,
              text: result,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error checking vulnerability: ${error instanceof Error ? error.message : String(error)}`,
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

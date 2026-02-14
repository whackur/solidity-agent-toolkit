import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { getSCWEById, searchSCWE, type SCWEEntry } from "../knowledge/index.js";

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

function formatSearchResult(entry: SCWEEntry): string {
  const cweMappings =
    entry.mappings.cwe.length > 0 ? ` (CWE-${entry.mappings.cwe.join(", CWE-")})` : "";
  const aliases = entry.alias.length > 0 ? `\nAliases: ${entry.alias.join(", ")}` : "";
  const description = entry.description.split("\n")[0] || "No description available";

  return `**${entry.id}: ${entry.title}**${cweMappings}${aliases}\n${description}`;
}

function formatRemediationResult(entry: SCWEEntry): string {
  let result = `# ${entry.id}: ${entry.title}\n\n`;

  if (entry.mappings.cwe.length > 0) {
    result += `**CWE Mappings:** ${entry.mappings.cwe.map((c) => `CWE-${c}`).join(", ")}\n\n`;
  }

  result += `## Description\n\n${entry.description}\n\n`;

  result += `## Remediation\n\n${entry.remediation}\n\n`;

  if (entry.examples.vulnerable || entry.examples.fixed) {
    result += `## Examples\n\n`;

    if (entry.examples.vulnerable) {
      result += `### Vulnerable Code\n\n\`\`\`solidity\n${entry.examples.vulnerable}\n\`\`\`\n\n`;
    }

    if (entry.examples.fixed) {
      result += `### Fixed Code\n\n\`\`\`solidity\n${entry.examples.fixed}\n\`\`\`\n\n`;
    }
  }

  return result;
}

function checkCodeForVulnerability(
  code: string,
  entry: SCWEEntry,
): { match: boolean; confidence: string; details: string } {
  const vulnerableCode = entry.examples.vulnerable;
  if (!vulnerableCode) {
    return {
      match: false,
      confidence: "unknown",
      details: "No vulnerable code example available for comparison",
    };
  }

  const _patterns: { pattern: RegExp; weight: number; description: string }[] = [];

  const externalCallPattern = /\.call\{|\.call\(|\.send\(|\.transfer\(/g;
  const stateChangePattern = /\w+\s*=\s*[^=]/g;
  const requirePattern = /require\(/g;
  const revertPattern = /revert\(/g;

  let score = 0;
  let maxScore = 0;
  const matchedPatterns: string[] = [];

  if (externalCallPattern.test(vulnerableCode)) {
    maxScore += 3;
    if (externalCallPattern.test(code)) {
      score += 3;
      matchedPatterns.push("External call pattern detected");
    }
  }

  const vulnStateChanges = vulnerableCode.match(stateChangePattern)?.length || 0;
  const codeStateChanges = code.match(stateChangePattern)?.length || 0;
  if (vulnStateChanges > 0) {
    maxScore += 2;
    if (codeStateChanges > 0) {
      score += 2;
      matchedPatterns.push("State change pattern detected");
    }
  }

  const vulnHasChecks = requirePattern.test(vulnerableCode) || revertPattern.test(vulnerableCode);
  const codeHasChecks = requirePattern.test(code) || revertPattern.test(code);
  if (!vulnHasChecks && !codeHasChecks) {
    maxScore += 2;
    score += 2;
    matchedPatterns.push("Missing validation checks");
  }

  const normalizeCode = (c: string) => c.replace(/\s+/g, " ").toLowerCase();
  const normalizedVuln = normalizeCode(vulnerableCode);
  const normalizedCode = normalizeCode(code);

  const vulnTokens = normalizedVuln.split(/[^\w]+/).filter((t) => t.length > 3);
  const codeTokens = normalizedCode.split(/[^\w]+/).filter((t) => t.length > 3);
  const commonTokens = vulnTokens.filter((t) => codeTokens.includes(t));

  if (commonTokens.length > 3) {
    maxScore += 3;
    score += Math.min(3, commonTokens.length / 2);
    matchedPatterns.push(`Similar code structure (${commonTokens.length} common tokens)`);
  }

  const confidence = maxScore > 0 ? (score / maxScore) * 100 : 0;
  let confidenceLevel: string;
  if (confidence >= 70) confidenceLevel = "high";
  else if (confidence >= 40) confidenceLevel = "medium";
  else if (confidence >= 20) confidenceLevel = "low";
  else confidenceLevel = "very low";

  const match = confidence >= 40;
  const details =
    matchedPatterns.length > 0 ? matchedPatterns.join("; ") : "No significant patterns matched";

  return { match, confidence: confidenceLevel, details };
}

export function registerSCWESearchTools(server: McpServer): void {
  server.registerTool(
    "search_vulnerabilities",
    {
      description: "Search OWASP SCWE vulnerabilities by query string and optional filters",
      inputSchema: SearchVulnerabilitiesSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ query, filters }) => {
      try {
        let results = searchSCWE(query);

        if (filters) {
          if (filters.category) {
            const cat = filters.category.toLowerCase();
            results = results.filter(
              (e) =>
                e.mappings.scsvsCg.some((c) => c.toLowerCase().includes(cat)) ||
                e.mappings.scsvsScg.some((c) => c.toLowerCase().includes(cat)),
            );
          }

          if (filters.cwe !== undefined) {
            results = results.filter((e) => e.mappings.cwe.includes(filters.cwe!));
          }

          if (filters.severity) {
            const sev = filters.severity.toLowerCase();
            results = results.filter((e) => e.profiles.some((p) => p.toLowerCase().includes(sev)));
          }
        }

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

  server.registerTool(
    "check_vulnerability",
    {
      description:
        "Check Solidity code for potential vulnerabilities using pattern matching against SCWE examples",
      inputSchema: CheckVulnerabilitySchema,
      annotations: { readOnlyHint: true },
    },
    async ({ code, vulnerabilityId }) => {
      try {
        let entriesToCheck: SCWEEntry[] = [];

        if (vulnerabilityId) {
          const entry = getSCWEById(vulnerabilityId);
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
          entriesToCheck = searchSCWE("").filter((e) => e.examples.vulnerable);
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

  server.registerTool(
    "get_remediation",
    {
      description:
        "Get detailed remediation guidance and fixed code examples for a specific SCWE vulnerability",
      inputSchema: GetRemediationSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ vulnerabilityId }) => {
      try {
        const entry = getSCWEById(vulnerabilityId);

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

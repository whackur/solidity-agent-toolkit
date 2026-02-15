import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadAllTop10, getTop10ById } from "../../knowledge/top10-parser.js";

function formatTop10Entry(entry: ReturnType<typeof getTop10ById>): string {
  if (!entry) {
    return "";
  }

  const sections: string[] = [];

  sections.push(`# ${entry.id}: ${entry.title}`);
  sections.push("");

  if (entry.description) {
    sections.push("## Description");
    sections.push(entry.description);
    sections.push("");
  }

  if (entry.relatedSCWE && entry.relatedSCWE.length > 0) {
    sections.push("## Related SCWE");
    for (const scwe of entry.relatedSCWE) {
      sections.push(`- ${scwe}`);
    }
    sections.push("");
  }

  if (entry.examples?.vulnerable) {
    sections.push("## Vulnerable Example");
    sections.push("```solidity");
    sections.push(entry.examples.vulnerable);
    sections.push("```");
    sections.push("");
  }

  if (entry.examples?.fixed) {
    sections.push("## Fixed Example");
    sections.push("```solidity");
    sections.push(entry.examples.fixed);
    sections.push("```");
    sections.push("");
  }

  if (entry.caseStudies && entry.caseStudies.length > 0) {
    sections.push("## Case Studies");
    for (const study of entry.caseStudies) {
      sections.push(`- ${study}`);
    }
    sections.push("");
  }

  if (entry.mitigations && entry.mitigations.length > 0) {
    sections.push("## Mitigations");
    for (const mitigation of entry.mitigations) {
      sections.push(`- ${mitigation}`);
    }
    sections.push("");
  }

  return sections.join("\n");
}

export function registerTop10Resources(server: McpServer): void {
  server.registerResource(
    "SC Top 10 List",
    "sctop10://list",
    {
      description: "List of all 10 OWASP Smart Contract Top 10 vulnerabilities",
      mimeType: "text/markdown",
    },
    async () => {
      const entries = loadAllTop10();
      const listContent = entries.map((e) => `- **${e.id}**: ${e.title}`).join("\n");

      return {
        contents: [
          {
            uri: "sctop10://list",
            mimeType: "text/markdown",
            text: `# OWASP Smart Contract Top 10\n\n${listContent}`,
          },
        ],
      };
    },
  );

  const top10IdTemplate = new ResourceTemplate("sctop10://{id}", {
    list: undefined,
  });

  server.registerResource(
    "SC Top 10 Item",
    top10IdTemplate,
    {
      description: "Get detailed information about a specific SC Top 10 vulnerability (SC01-SC10)",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
      if (!id) {
        throw new Error("Missing required parameter: id");
      }

      const entry = getTop10ById(id);

      if (!entry) {
        throw new Error(`SC Top 10 entry not found: ${id}`);
      }

      const content = formatTop10Entry(entry);

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/markdown",
            text: content,
          },
        ],
      };
    },
  );
}

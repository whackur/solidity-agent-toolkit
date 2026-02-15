import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { loadAllSCWE, getSCWEById, type SCWEEntry } from "../../knowledge/index.js";

function formatSCWEEntry(entry: SCWEEntry): string {
  const cweList = entry.mappings.cwe.map((c) => `CWE-${c}`).join(", ");
  const scsvsCg = entry.mappings.scsvsCg.join(", ");

  let markdown = `# ${entry.id}: ${entry.title}\n\n`;
  markdown += `**CWE**: ${cweList}\n`;
  markdown += `**SCSVS**: ${scsvsCg}\n`;
  markdown += `**Status**: ${entry.status}\n\n`;

  if (entry.description) {
    markdown += `## Description\n\n${entry.description}\n\n`;
  }

  if (entry.remediation) {
    markdown += `## Remediation\n\n${entry.remediation}\n\n`;
  }

  if (entry.examples.vulnerable) {
    markdown += `## Vulnerable Example\n\n\`\`\`solidity\n${entry.examples.vulnerable}\n\`\`\`\n\n`;
  }

  if (entry.examples.fixed) {
    markdown += `## Fixed Example\n\n\`\`\`solidity\n${entry.examples.fixed}\n\`\`\`\n\n`;
  }

  if (entry.relationships) {
    markdown += `## Relationships\n\n${entry.relationships}\n`;
  }

  return markdown;
}

function formatSCWESummaryList(entries: SCWEEntry[]): string {
  let markdown = `# OWASP Smart Contract Weakness Enumeration (SCWE)\n\n`;
  markdown += `Total entries: ${entries.length}\n\n`;

  for (const entry of entries) {
    markdown += `- **${entry.id}**: ${entry.title}\n`;
  }

  return markdown;
}

export function registerSCWEResources(server: McpServer): void {
  server.registerResource(
    "scwe-list",
    "scwe://list",
    {
      description: "List all OWASP SCWE entries with ID and title",
      mimeType: "text/markdown",
    },
    async () => {
      const entries = loadAllSCWE();
      return {
        contents: [
          {
            uri: "scwe://list",
            mimeType: "text/markdown",
            text: formatSCWESummaryList(entries),
          },
        ],
      };
    },
  );

  const scweIdTemplate = new ResourceTemplate("scwe://{id}", {
    list: undefined,
  });

  server.registerResource(
    "scwe-by-id",
    scweIdTemplate,
    {
      description: "Get a specific SCWE entry by ID (e.g., scwe://SCWE-046)",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
      if (!id) {
        throw new Error("Missing required parameter: id");
      }

      const entry = getSCWEById(id);
      if (!entry) {
        throw new Error(`SCWE entry not found: ${id}`);
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/markdown",
            text: formatSCWEEntry(entry),
          },
        ],
      };
    },
  );

  const scweCategoryTemplate = new ResourceTemplate("scwe://category/{category}", {
    list: undefined,
  });

  server.registerResource(
    "scwe-by-category",
    scweCategoryTemplate,
    {
      description: "List SCWE entries by SCSVS category (e.g., scwe://category/SCSVS-CODE)",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const category = Array.isArray(variables.category)
        ? variables.category[0]
        : variables.category;
      if (!category) {
        throw new Error("Missing required parameter: category");
      }

      const allEntries = loadAllSCWE();
      const filtered = allEntries.filter((entry) =>
        entry.mappings.scsvsCg.some((c) => c.toUpperCase() === category.toUpperCase()),
      );

      if (filtered.length === 0) {
        throw new Error(`No SCWE entries found for category: ${category}`);
      }

      let markdown = `# SCWE Entries for Category: ${category}\n\n`;
      markdown += `Found ${filtered.length} entries\n\n`;

      for (const entry of filtered) {
        markdown += `## ${entry.id}: ${entry.title}\n\n`;
        markdown += `**CWE**: ${entry.mappings.cwe.map((c) => `CWE-${c}`).join(", ")}\n`;
        markdown += `**Status**: ${entry.status}\n\n`;
        if (entry.description) {
          markdown += `${entry.description}\n\n`;
        }
        markdown += `---\n\n`;
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/markdown",
            text: markdown,
          },
        ],
      };
    },
  );
}

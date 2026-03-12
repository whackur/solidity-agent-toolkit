import { getSCWEById, searchSCWE, type SCWEEntry } from "../knowledge/index.js";

export function formatSearchResult(entry: SCWEEntry): string {
  const cweMappings =
    entry.mappings.cwe.length > 0 ? ` (CWE-${entry.mappings.cwe.join(", CWE-")})` : "";
  const aliases = entry.alias.length > 0 ? `\nAliases: ${entry.alias.join(", ")}` : "";
  const description = entry.description.split("\n")[0] || "No description available";

  return `**${entry.id}: ${entry.title}**${cweMappings}${aliases}\n${description}`;
}

export function formatRemediationResult(entry: SCWEEntry): string {
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

export function searchAndFilterSCWE(
  query: string,
  filters?: { category?: string; cwe?: number; severity?: string },
): SCWEEntry[] {
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

  return results;
}

export function getSCWEEntry(id: string): SCWEEntry | undefined {
  return getSCWEById(id);
}


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

export function checkCodeForVulnerability(
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

export function getSCWEEntriesWithVulnerableExamples(): SCWEEntry[] {
  return searchSCWE("").filter((e) => e.examples.vulnerable);
}

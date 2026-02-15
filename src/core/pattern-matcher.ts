import {
  VULNERABILITY_PATTERNS,
  type VulnerabilityPattern,
} from "../knowledge/vulnerability-patterns.js";

export interface PatternMatch {
  scweId: string;
  name: string;
  severity: VulnerabilityPattern["severity"];
  line: number;
  matchedText: string;
  description: string;
}

export function matchPatterns(code: string, checkIds?: string[]): PatternMatch[] {
  const patterns = checkIds?.length
    ? VULNERABILITY_PATTERNS.filter((p) =>
        checkIds.some((id) => id.toUpperCase() === p.scweId.toUpperCase()),
      )
    : VULNERABILITY_PATTERNS;

  const lines = code.split("\n");
  const matches: PatternMatch[] = [];

  for (const pattern of patterns) {
    for (const regex of pattern.patterns) {
      const re = new RegExp(regex.source, regex.flags.replace("g", ""));

      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          matches.push({
            scweId: pattern.scweId,
            name: pattern.name,
            severity: pattern.severity,
            line: i + 1,
            matchedText: lines[i].trim(),
            description: pattern.description,
          });
        }
      }

      if (regex.flags.includes("s")) {
        const multiLineRe = new RegExp(regex.source, regex.flags);
        const multiMatch = multiLineRe.exec(code);
        if (multiMatch) {
          const upToMatch = code.slice(0, multiMatch.index);
          const line = upToMatch.split("\n").length;
          const alreadyFound = matches.some((m) => m.scweId === pattern.scweId && m.line === line);
          if (!alreadyFound) {
            matches.push({
              scweId: pattern.scweId,
              name: pattern.name,
              severity: pattern.severity,
              line,
              matchedText: multiMatch[0].split("\n")[0].trim(),
              description: pattern.description,
            });
          }
        }
      }
    }
  }

  const seen = new Set<string>();
  const deduped: PatternMatch[] = [];
  for (const m of matches) {
    const key = `${m.scweId}:${m.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(m);
    }
  }

  return deduped.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    return diff !== 0 ? diff : a.line - b.line;
  });
}

export function formatMatches(matches: PatternMatch[]): string {
  if (matches.length === 0) {
    return "No vulnerability patterns detected.";
  }

  const header = `Found ${matches.length} potential vulnerability pattern(s):\n`;
  const body = matches
    .map(
      (m, i) =>
        `${i + 1}. [${m.severity.toUpperCase()}] ${m.scweId}: ${m.name}\n` +
        `   Line ${m.line}: ${m.matchedText}\n` +
        `   ${m.description}`,
    )
    .join("\n\n");

  return header + "\n" + body;
}

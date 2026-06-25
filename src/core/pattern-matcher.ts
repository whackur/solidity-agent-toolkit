import {
  VULNERABILITY_PATTERNS,
  type VulnerabilityPattern,
} from "../knowledge/vulnerability-patterns.js";
import { filterByASTContext } from "./ast-context-filter.js";
import { parseSolidity } from "./ast-parse.js";
import { runASTDetectors, getDetectors, type DetectorResult } from "./ast-detector-registry.js";

// Trigger self-registration of all AST detectors
import "./ast-detectors/index.js";

export interface PatternMatch {
  scweId: string;
  name: string;
  severity: VulnerabilityPattern["severity"];
  line: number;
  matchedText: string;
  description: string;
}

/** Convert AST DetectorResult to PatternMatch. */
function detectorResultToMatch(r: DetectorResult, lines: string[]): PatternMatch {
  return {
    scweId: r.scweId,
    name: r.name,
    severity: r.severity,
    line: r.line,
    matchedText: (lines[r.line - 1] ?? "").trim(),
    description: r.description,
  };
}

/** Get the set of SCWE IDs covered by registered AST detectors. */
function getASTCoveredIds(): Set<string> {
  const ids = new Set<string>();
  for (const d of getDetectors()) {
    for (const id of d.scweIds) ids.add(id.toUpperCase());
  }
  return ids;
}

export function matchPatterns(code: string, checkIds?: string[]): PatternMatch[] {
  const lines = code.split("\n");
  const allMatches: PatternMatch[] = [];

  // Phase 3: Try AST detection first
  const { ast } = parseSolidity(code);
  let astCoveredIds = new Set<string>();

  if (ast) {
    const astResults = runASTDetectors(ast, code, checkIds);
    astCoveredIds = getASTCoveredIds();
    // Filter AST results to only requested SCWE IDs (a detector may emit
    // findings for multiple SCWE IDs beyond the requested set)
    const filtered = checkIds?.length
      ? astResults.filter((r) => checkIds.some((id) => id.toUpperCase() === r.scweId.toUpperCase()))
      : astResults;
    for (const r of filtered) {
      allMatches.push(detectorResultToMatch(r, lines));
    }
  }

  // Regex fallback: only for SCWE IDs NOT covered by AST detectors
  // (or for all IDs if AST parsing failed)
  const regexPatterns = (
    checkIds?.length
      ? VULNERABILITY_PATTERNS.filter((p) =>
          checkIds.some((id) => id.toUpperCase() === p.scweId.toUpperCase()),
        )
      : VULNERABILITY_PATTERNS
  ).filter((p) => !ast || !astCoveredIds.has(p.scweId.toUpperCase()));

  for (const pattern of regexPatterns) {
    for (const regex of pattern.patterns) {
      const re = new RegExp(regex.source, regex.flags.replace("g", ""));

      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          allMatches.push({
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
          const alreadyFound = allMatches.some(
            (m) => m.scweId === pattern.scweId && m.line === line,
          );
          if (!alreadyFound) {
            allMatches.push({
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

  // Deduplicate by scweId + line
  const seen = new Set<string>();
  const deduped: PatternMatch[] = [];
  for (const m of allMatches) {
    const key = `${m.scweId}:${m.line}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(m);
    }
  }

  const sorted = deduped.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    return diff !== 0 ? diff : a.line - b.line;
  });

  // Apply Phase 2 AST context filter on remaining regex matches
  // (AST results already have context-aware detection, so filter only regex)
  return filterByASTContext(sorted, code);
}

export function formatMatches(matches: PatternMatch[]): string {
  if (matches.length === 0) {
    return "No vulnerability patterns detected.";
  }

  const disclaimer =
    "**Note:** Results combine AST-based detectors (22 SCWE IDs, low FP) and regex fallback patterns. " +
    "For authoritative results, verify findings with Slither or Aderyn.\n";
  const header = `Found ${matches.length} potential vulnerability pattern(s):\n`;
  const body = matches
    .map(
      (m, i) =>
        `${i + 1}. [${m.severity.toUpperCase()}] ${m.scweId}: ${m.name}\n` +
        `   Line ${m.line}: ${m.matchedText}\n` +
        `   ${m.description}`,
    )
    .join("\n\n");

  return disclaimer + "\n" + header + "\n" + body;
}

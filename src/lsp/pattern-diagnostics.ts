import { type Diagnostic } from "vscode-languageserver/node.js";
import { type TextDocument } from "vscode-languageserver-textdocument";
import { matchPatterns, type PatternMatch } from "../core/pattern-matcher.js";
import { mapToLspSeverity } from "./severity-mapper.js";

function matchToDiagnostic(match: PatternMatch, document: TextDocument): Diagnostic {
  const line = match.line - 1; // PatternMatch is 1-indexed, LSP is 0-indexed
  const lineText = document.getText({
    start: { line, character: 0 },
    end: { line, character: Number.MAX_SAFE_INTEGER },
  });

  const raw = `[Heuristic] [${match.name}] ${match.description} — Verify with Slither/Aderyn for confirmation.`;
  const message = raw.length > 200 ? raw.slice(0, 197) + "..." : raw;

  return {
    range: {
      start: { line, character: 0 },
      end: { line, character: lineText.length },
    },
    severity: mapToLspSeverity("pattern", match.severity),
    source: "solidity-patterns",
    code: match.scweId,
    message,
  };
}

const MAX_LINES_FOR_PATTERNS = 2000;
const MAX_LENGTH_FOR_PATTERNS = 200_000;

export function getPatternDiagnostics(document: TextDocument): Diagnostic[] {
  const code = document.getText();
  if (!code.trim()) return [];

  if (code.length > MAX_LENGTH_FOR_PATTERNS || document.lineCount > MAX_LINES_FOR_PATTERNS) {
    return [];
  }

  const matches = matchPatterns(code);
  return matches
    .filter((m) => m.line - 1 < document.lineCount)
    .map((m) => matchToDiagnostic(m, document));
}

/**
 * AST detector registry. Each detector analyzes parsed Solidity AST
 * and returns structured findings. Detectors are pure functions —
 * no I/O, no CLI calls, no side effects.
 *
 * The `source` field on DetectorResult is reserved for Phase 4
 * (unified results from ast, regex, slither, aderyn).
 */

import type { SourceUnit } from "@solidity-parser/parser/src/ast-types.js";

export type Severity = "critical" | "high" | "medium" | "low";

export interface DetectorResult {
  scweId: string;
  name: string;
  severity: Severity;
  line: number;
  description: string;
  source: "ast" | "regex" | "slither" | "aderyn";
}

export interface ASTDetector {
  /** Unique detector identifier (e.g., "reentrancy", "access-control"). */
  id: string;
  /** SCWE IDs this detector covers. */
  scweIds: string[];
  /** Run detection on parsed AST. Returns 0+ findings. */
  detect: (ast: SourceUnit, code: string) => DetectorResult[];
}

/** Global detector registry. Detectors self-register at import time. */
const registry: ASTDetector[] = [];

/** Register a detector. Called by each detector module on import. */
export function registerDetector(detector: ASTDetector): void {
  registry.push(detector);
}

/** Get all registered detectors. */
export function getDetectors(): readonly ASTDetector[] {
  return registry;
}

/** Get detectors that cover a specific SCWE ID. */
export function getDetectorsForScwe(scweId: string): ASTDetector[] {
  const upper = scweId.toUpperCase();
  return registry.filter((d) => d.scweIds.some((id) => id.toUpperCase() === upper));
}

/**
 * Run all registered AST detectors on code. Returns combined results
 * sorted by severity then line number.
 */
export function runASTDetectors(
  ast: SourceUnit,
  code: string,
  scweIds?: string[],
): DetectorResult[] {
  const detectors = scweIds?.length
    ? registry.filter((d) =>
        d.scweIds.some((id) => scweIds.some((s) => s.toUpperCase() === id.toUpperCase())),
      )
    : registry;

  const results: DetectorResult[] = [];
  for (const detector of detectors) {
    results.push(...detector.detect(ast, code));
  }

  // Deduplicate by scweId + line
  const seen = new Set<string>();
  const deduped = results.filter((r) => {
    const key = `${r.scweId}:${r.line}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const severityOrder: Record<Severity, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  return deduped.sort((a, b) => {
    const diff = severityOrder[a.severity] - severityOrder[b.severity];
    return diff !== 0 ? diff : a.line - b.line;
  });
}

/** Reset registry — for testing only. */
export function _resetDetectorRegistry(): void {
  registry.length = 0;
}

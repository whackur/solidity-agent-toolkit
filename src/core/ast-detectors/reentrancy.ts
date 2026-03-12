/**
 * AST detector: Reentrancy (SCWE-046)
 * Detects: external calls before state updates without nonReentrant guard.
 * Covers: basic reentrancy, cross-function reentrancy, missing reentrancy guard.
 */

import type { SourceUnit } from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import { hasModifier, hasModifierLike } from "../ast-validators.js";
import { findAllFunctions, findExternalCalls, checkCEIPattern } from "../ast-utils.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

registerDetector({
  id: "reentrancy",
  scweIds: ["SCWE-046"],
  detect(ast: SourceUnit): DetectorResult[] {
    const results: DetectorResult[] = [];
    const funcs = findAllFunctions(ast);

    for (const func of funcs) {
      const calls = findExternalCalls(func);
      if (calls.length === 0) continue;

      const hasGuard = hasModifier(func, "nonReentrant") || hasModifierLike(func, "reentrancy");

      // Case 1: External call without reentrancy guard
      if (!hasGuard) {
        // Case 1a: CEI violation — call before state update
        if (!checkCEIPattern(func)) {
          results.push({
            scweId: "SCWE-046",
            name: "Reentrancy (External Call Before State Update)",
            severity: "critical",
            line: calls[0].line,
            description:
              "External call before state update without reentrancy guard. " +
              "Follow checks-effects-interactions pattern or use ReentrancyGuard.",
            source: "ast",
          });
        }

        // Case 1b: Payable function with external call but no guard
        const isPayable = func.stateMutability === "payable";
        const isPublicOrExternal = func.visibility === "public" || func.visibility === "external";
        if (isPayable && isPublicOrExternal) {
          results.push({
            scweId: "SCWE-046",
            name: "Lack of Reentrancy Guard",
            severity: "high",
            line: getLine(func),
            description:
              "Payable function with external calls should use a reentrancy guard " +
              "(e.g., OpenZeppelin ReentrancyGuard).",
            source: "ast",
          });
        }
      }
    }

    return results;
  },
});

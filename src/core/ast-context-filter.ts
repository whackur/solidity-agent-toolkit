/**
 * Orchestration layer: pipes regex PatternMatch results through AST context
 * validators to suppress false positives. On parse failure, returns matches
 * unchanged (regex fallback — Metis directive).
 */

import type { PatternMatch } from "./pattern-matcher.js";
import type { SourceUnit } from "./ast-parse.js";
import { parseSolidity } from "./ast-parse.js";
import {
  findFunctionAtLine,
  hasModifier,
  hasModifierLike,
  hasAnyModifier,
  hasInlineAccessControl,
  isPragma08OrAbove,
  isInsideUnchecked,
  isLibraryOrInterfaceOnly,
  hasNonceVariable,
  getFunctionVisibility,
} from "./ast-validators.js";

interface FilterRule {
  scweId: string;
  shouldSuppress: (match: PatternMatch, ast: SourceUnit) => boolean;
}

/**
 * AST-based filter rules. Each rule returns `true` if the match is a false
 * positive and should be suppressed.
 */
const FILTER_RULES: FilterRule[] = [
  // SCWE-005: Unprotected Initializer — suppress if has initializer/onlyInitializing modifier
  {
    scweId: "SCWE-005",
    shouldSuppress: (match, ast) => {
      const func = findFunctionAtLine(ast, match.line);
      if (!func) return false;
      return hasModifier(func, "initializer") || hasModifier(func, "onlyInitializing");
    },
  },

  // SCWE-016: Incorrect Access Control — suppress if has any modifier or inline require(msg.sender)
  {
    scweId: "SCWE-016",
    shouldSuppress: (match, ast) => {
      const func = findFunctionAtLine(ast, match.line);
      if (!func) return false;
      return hasAnyModifier(func) || hasInlineAccessControl(func);
    },
  },

  // SCWE-046: Reentrancy — suppress if has nonReentrant modifier
  {
    scweId: "SCWE-046",
    shouldSuppress: (match, ast) => {
      const func = findFunctionAtLine(ast, match.line);
      if (!func) return false;
      return hasModifier(func, "nonReentrant") || hasModifierLike(func, "reentrancy");
    },
  },

  // SCWE-047: Integer Overflow — suppress if pragma >= 0.8 AND inside unchecked block
  {
    scweId: "SCWE-047",
    shouldSuppress: (match, ast) => {
      // "unchecked" keyword in 0.8+ is intentional gas optimization, not a bug
      if (isPragma08OrAbove(ast) && isInsideUnchecked(ast, match.line)) return true;
      // pragma >= 0.8 with NO unchecked — built-in overflow protection, suppress the
      // "pragma <0.8" pattern match (which is a FP since the pragma IS >=0.8)
      // The regex fires on "^0.8" because it matches "0.[0-7]" — but "^0.8" also
      // fires on "unchecked {" pattern. If pragma is >=0.8, suppress the pragma match.
      if (isPragma08OrAbove(ast)) return true;
      return false;
    },
  },

  // SCWE-055: Signature Replay — suppress if contract has nonce tracking
  {
    scweId: "SCWE-055",
    shouldSuppress: (match, ast) => {
      return hasNonceVariable(ast);
    },
  },

  // SCWE-060: Floating Pragma — suppress if file contains only libraries/interfaces
  {
    scweId: "SCWE-060",
    shouldSuppress: (_match, ast) => {
      return isLibraryOrInterfaceOnly(ast);
    },
  },

  // SCWE-097: Default Visibility — suppress if the function has explicit visibility
  {
    scweId: "SCWE-097",
    shouldSuppress: (match, ast) => {
      const func = findFunctionAtLine(ast, match.line);
      if (!func) return false;
      return getFunctionVisibility(func) !== "default";
    },
  },
];

/** Build a lookup map for O(1) rule access per SCWE ID. */
const rulesByScweId = new Map<string, FilterRule[]>();
for (const rule of FILTER_RULES) {
  const list = rulesByScweId.get(rule.scweId) ?? [];
  list.push(rule);
  rulesByScweId.set(rule.scweId, list);
}

/**
 * Filter regex-based PatternMatch results using AST context validation.
 * On parse failure, returns all matches unchanged (graceful degradation).
 */
export function filterByASTContext(matches: PatternMatch[], code: string): PatternMatch[] {
  if (matches.length === 0) return matches;

  const { ast } = parseSolidity(code);
  if (!ast) return matches; // Parse failure → regex fallback

  return matches.filter((match) => {
    const rules = rulesByScweId.get(match.scweId);
    if (!rules) return true; // No AST rule for this SCWE → keep match
    // Suppress if ANY rule says it's a false positive
    return !rules.some((rule) => rule.shouldSuppress(match, ast));
  });
}

/**
 * AST detector: Access Control (SCWE-016, SCWE-005, SCWE-049, SCWE-038)
 * Detects: missing modifiers on state-changing functions, unprotected initializers,
 * unprotected selfdestruct, unprotected ether withdrawal.
 */

import type { SourceUnit } from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import {
  hasAnyModifier,
  hasModifier,
  hasModifierLike,
  hasInlineAccessControl,
} from "../ast-validators.js";
import { findAllFunctions, hasFunctionCall, findExternalCalls } from "../ast-utils.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

registerDetector({
  id: "access-control",
  scweIds: ["SCWE-016", "SCWE-005", "SCWE-049", "SCWE-038"],
  detect(ast: SourceUnit): DetectorResult[] {
    const results: DetectorResult[] = [];
    const funcs = findAllFunctions(ast);

    for (const func of funcs) {
      const isPublicOrExternal = func.visibility === "public" || func.visibility === "external";
      if (!isPublicOrExternal) continue;
      if (func.isConstructor || func.isReceiveEther || func.isFallback) continue;

      const hasGuard = hasAnyModifier(func) || hasInlineAccessControl(func);
      const name = func.name ?? "";
      const nameLower = name.toLowerCase();

      // SCWE-005: Unprotected initializer
      if ((nameLower === "initialize" || nameLower === "init") && !hasGuard) {
        if (!hasModifier(func, "initializer") && !hasModifier(func, "onlyInitializing")) {
          results.push({
            scweId: "SCWE-005",
            name: "Unprotected Initializer",
            severity: "critical",
            line: getLine(func),
            description:
              "Proxy initializer function can be called by anyone. " +
              "Use OpenZeppelin's initializer modifier.",
            source: "ast",
          });
        }
      }

      // SCWE-016: State-changing function without access control
      if ((nameLower.startsWith("set") || nameLower.startsWith("update")) && !hasGuard) {
        results.push({
          scweId: "SCWE-016",
          name: "Incorrect Access Control on State-Changing Function",
          severity: "critical",
          line: getLine(func),
          description:
            "State-changing function without access control. " +
            "Add onlyOwner, role-based modifier, or require(msg.sender) check.",
          source: "ast",
        });
      }

      // SCWE-038: Unprotected selfdestruct
      if (hasFunctionCall(func, "selfdestruct") && !hasGuard) {
        results.push({
          scweId: "SCWE-038",
          name: "Unprotected SELFDESTRUCT",
          severity: "critical",
          line: getLine(func),
          description:
            "selfdestruct can permanently destroy a contract. " + "Ensure it is access-controlled.",
          source: "ast",
        });
      }

      // SCWE-049: Unprotected ether withdrawal
      if (nameLower.includes("withdraw") && !hasGuard) {
        const calls = findExternalCalls(func);
        if (calls.some((c) => c.kind === "call" || c.kind === "transfer" || c.kind === "send")) {
          results.push({
            scweId: "SCWE-049",
            name: "Unprotected Ether Withdrawal",
            severity: "critical",
            line: getLine(func),
            description:
              "Withdrawal function without access control. " +
              "Unrestricted withdrawals let anyone drain funds.",
            source: "ast",
          });
        }
      }
    }

    return results;
  },
});

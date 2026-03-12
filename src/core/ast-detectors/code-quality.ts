/**
 * AST detector: Code Quality (SCWE-060, SCWE-063, SCWE-067, SCWE-097)
 * Detects: floating pragma, missing event emission, assert misuse, default visibility.
 */

import { visit } from "@solidity-parser/parser";
import type { SourceUnit, FunctionCall } from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import {
  getPragmaVersion,
  isLibraryOrInterfaceOnly,
  getFunctionVisibility,
} from "../ast-validators.js";
import { findAllFunctions, hasEmitStatement, findStateUpdates } from "../ast-utils.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

registerDetector({
  id: "code-quality",
  scweIds: ["SCWE-060", "SCWE-063", "SCWE-067", "SCWE-097"],
  detect(ast: SourceUnit): DetectorResult[] {
    const results: DetectorResult[] = [];

    // SCWE-060: Floating pragma — only in contracts (not libraries/interfaces)
    const version = getPragmaVersion(ast);
    if (version && (version.startsWith("^") || version.startsWith(">="))) {
      if (!isLibraryOrInterfaceOnly(ast)) {
        // Find pragma line
        for (const child of ast.children) {
          if (child.type === "PragmaDirective") {
            results.push({
              scweId: "SCWE-060",
              name: "Floating Pragma",
              severity: "low",
              line: getLine(child),
              description:
                "Floating pragmas allow compilation with unintended compiler versions. " +
                "Lock the pragma for deployments.",
              source: "ast",
            });
            break;
          }
        }
      }
    }

    // SCWE-063: Missing event emission on state-changing setter functions
    const funcs = findAllFunctions(ast);
    for (const func of funcs) {
      const name = func.name ?? "";
      const nameLower = name.toLowerCase();
      const isPublic = func.visibility === "public" || func.visibility === "external";

      if (isPublic && nameLower.startsWith("set") && findStateUpdates(func).length > 0) {
        if (!hasEmitStatement(func)) {
          results.push({
            scweId: "SCWE-063",
            name: "Missing Event Emission on State Change",
            severity: "low",
            line: getLine(func),
            description: "State-changing functions should emit events for off-chain indexing.",
            source: "ast",
          });
        }
      }

      // SCWE-097: Default function visibility
      if (getFunctionVisibility(func) === "default" && !func.isConstructor) {
        results.push({
          scweId: "SCWE-097",
          name: "Default Function Visibility",
          severity: "high",
          line: getLine(func),
          description:
            "Functions without explicit visibility default to public. " +
            "Always specify visibility.",
          source: "ast",
        });
      }
    }

    // SCWE-067: assert() usage
    visit(ast, {
      FunctionCall: (node) => {
        const call = node as FunctionCall;
        if (call.expression.type === "Identifier" && call.expression.name === "assert") {
          results.push({
            scweId: "SCWE-067",
            name: "Assert Violation / Incorrect Use of assert",
            severity: "medium",
            line: getLine(node),
            description:
              "assert consumes all remaining gas on failure. " +
              "Use require for input validation; assert only for invariants.",
            source: "ast",
          });
        }
      },
    });

    return results;
  },
});

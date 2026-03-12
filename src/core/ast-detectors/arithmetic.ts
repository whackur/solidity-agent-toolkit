/**
 * AST detector: Arithmetic Issues (SCWE-047, SCWE-074)
 * Detects: integer overflow/underflow in pre-0.8, hash collision with abi.encodePacked.
 */

import { visit } from "@solidity-parser/parser";
import type { SourceUnit, FunctionCall } from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import { isPragma08OrAbove } from "../ast-validators.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

registerDetector({
  id: "arithmetic",
  scweIds: ["SCWE-047", "SCWE-074"],
  detect(ast: SourceUnit, _code: string): DetectorResult[] {
    const results: DetectorResult[] = [];

    // SCWE-047: Integer overflow — only report if pragma < 0.8
    if (!isPragma08OrAbove(ast)) {
      // Look for arithmetic operations in functions
      visit(ast, {
        BinaryOperation: (node) => {
          const op = node.operator;
          if (op === "+" || op === "-" || op === "*" || op === "+=" || op === "-=" || op === "*=") {
            results.push({
              scweId: "SCWE-047",
              name: "Integer Overflow / Underflow",
              severity: "high",
              line: getLine(node),
              description:
                "Solidity <0.8 has no built-in overflow checks. " +
                "Use SafeMath or upgrade to 0.8+.",
              source: "ast",
            });
          }
        },
      });
    }

    // SCWE-074: Hash collision with abi.encodePacked with 2+ dynamic args
    visit(ast, {
      FunctionCall: (node) => {
        const call = node as FunctionCall;
        if (call.expression.type !== "MemberAccess") return;
        const ma = call.expression;
        if (ma.expression.type !== "Identifier" || ma.expression.name !== "abi") return;
        if (ma.memberName !== "encodePacked") return;

        // Flag if 2+ arguments (potential collision with dynamic types)
        if (call.arguments.length >= 2) {
          results.push({
            scweId: "SCWE-074",
            name: "Hash Collision with abi.encodePacked",
            severity: "high",
            line: getLine(node),
            description:
              "abi.encodePacked with multiple variable-length arguments " +
              "can cause hash collisions. Use abi.encode instead.",
            source: "ast",
          });
        }
      },
    });

    return results;
  },
});

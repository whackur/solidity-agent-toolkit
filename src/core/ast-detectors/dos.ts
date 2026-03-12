/**
 * AST detector: DoS & Misc (SCWE-058, SCWE-071, SCWE-050, SCWE-075)
 * Detects: unbounded loops (gas limit), uninitialized storage pointers,
 * deprecated SELFDESTRUCT, forced ether via strict balance checks.
 */

import { visit } from "@solidity-parser/parser";
import type {
  SourceUnit,
  ForStatement,
  WhileStatement,
  StateVariableDeclaration,
} from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import { findAllFunctions, hasFunctionCall } from "../ast-utils.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

registerDetector({
  id: "dos",
  scweIds: ["SCWE-058", "SCWE-071", "SCWE-050", "SCWE-075"],
  detect(ast: SourceUnit, code: string): DetectorResult[] {
    const results: DetectorResult[] = [];
    const lines = code.split("\n");

    // SCWE-058: DoS with Block Gas Limit — unbounded loops
    // Detect for/while loops where the condition references .length (dynamic array)
    visit(ast, {
      ForStatement: (node) => {
        const forNode = node as ForStatement;
        // Check if condition subtree contains a MemberAccess with "length"
        if (forNode.conditionExpression) {
          let hasLengthAccess = false;
          visit(forNode.conditionExpression, {
            MemberAccess: (member) => {
              if (member.memberName === "length") hasLengthAccess = true;
            },
          });
          if (hasLengthAccess) {
            results.push({
              scweId: "SCWE-058",
              name: "DoS with Block Gas Limit",
              severity: "high",
              line: getLine(node),
              description:
                "Unbounded loop over dynamic array can exceed block gas limit. " +
                "Use pagination or pull patterns.",
              source: "ast",
            });
          }
        }
      },
      WhileStatement: (node) => {
        const whileNode = node as WhileStatement;
        let hasLengthAccess = false;
        visit(whileNode.condition, {
          MemberAccess: (member) => {
            if (member.memberName === "length") hasLengthAccess = true;
          },
        });
        if (hasLengthAccess) {
          results.push({
            scweId: "SCWE-058",
            name: "DoS with Block Gas Limit",
            severity: "high",
            line: getLine(node),
            description:
              "Unbounded loop over dynamic array can exceed block gas limit. " +
              "Use pagination or pull patterns.",
            source: "ast",
          });
        }
      },
    });

    // SCWE-071: Uninitialized Storage Pointer — "Type storage varName;"
    visit(ast, {
      StateVariableDeclaration: (node) => {
        const decl = node as StateVariableDeclaration;
        for (const v of decl.variables) {
          if (v.storageLocation === "storage" && !v.expression) {
            results.push({
              scweId: "SCWE-071",
              name: "Uninitialized Storage Pointer",
              severity: "high",
              line: getLine(v),
              description:
                "Uninitialized storage pointers can overwrite arbitrary slots. " +
                "Always assign storage references explicitly.",
              source: "ast",
            });
          }
        }
      },
    });

    // SCWE-050: Deprecated SELFDESTRUCT — detect selfdestruct/suicide calls
    const funcs = findAllFunctions(ast);
    for (const func of funcs) {
      if (hasFunctionCall(func, "selfdestruct") || hasFunctionCall(func, "suicide")) {
        results.push({
          scweId: "SCWE-050",
          name: "Deprecated SELFDESTRUCT Usage",
          severity: "high",
          line: getLine(func),
          description:
            "selfdestruct is deprecated as of EIP-6049 and will change behavior " +
            "after Cancun. Avoid reliance on it.",
          source: "ast",
        });
      }
    }

    // SCWE-075: Forced Ether via Self-Destruct — strict balance checks
    // Detect: address(this).balance == or require(address(this).balance ...)
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (
        /address\s*\(\s*this\s*\)\s*\.balance\s*==\s*/.test(line) ||
        /require\s*\(\s*address\s*\(\s*this\s*\)\s*\.balance/.test(line)
      ) {
        results.push({
          scweId: "SCWE-075",
          name: "Forced Ether via Self-Destruct",
          severity: "medium",
          line: i + 1,
          description:
            "Strict balance checks can be broken by force-sending ETH via selfdestruct. " +
            "Use >= or accounting variables instead.",
          source: "ast",
        });
      }
    }

    return results;
  },
});

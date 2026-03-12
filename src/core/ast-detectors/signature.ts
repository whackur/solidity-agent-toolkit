/**
 * AST detector: Signature Replay (SCWE-055)
 * Detects: ecrecover / ECDSA.recover usage without nonce tracking.
 * If the contract has a nonce-like state variable, the risk is reduced.
 */

import { visit } from "@solidity-parser/parser";
import type {
  SourceUnit,
  FunctionCall,
  MemberAccess,
} from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import { hasNonceVariable } from "../ast-validators.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

registerDetector({
  id: "signature",
  scweIds: ["SCWE-055"],
  detect(ast: SourceUnit): DetectorResult[] {
    const results: DetectorResult[] = [];
    const hasNonce = hasNonceVariable(ast);

    // If the contract already tracks nonces, signature replay is mitigated
    if (hasNonce) return results;

    visit(ast, {
      FunctionCall: (node) => {
        const call = node as FunctionCall;

        // Case 1: ecrecover(...)
        if (call.expression.type === "Identifier" && call.expression.name === "ecrecover") {
          results.push({
            scweId: "SCWE-055",
            name: "Signature Replay Attack",
            severity: "critical",
            line: getLine(node),
            description:
              "ecrecover without nonce tracking allows signature replay. " +
              "Use EIP-712 typed data with nonces.",
            source: "ast",
          });
        }

        // Case 2: ECDSA.recover(...)
        if (call.expression.type === "MemberAccess") {
          const ma = call.expression as MemberAccess;
          if (
            ma.memberName === "recover" &&
            ma.expression.type === "Identifier" &&
            ma.expression.name === "ECDSA"
          ) {
            results.push({
              scweId: "SCWE-055",
              name: "Signature Replay Attack",
              severity: "critical",
              line: getLine(node),
              description:
                "ECDSA.recover without nonce tracking allows signature replay. " +
                "Use EIP-712 typed data with nonces.",
              source: "ast",
            });
          }
        }
      },
    });

    return results;
  },
});

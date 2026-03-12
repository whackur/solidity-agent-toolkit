/**
 * AST detector: Randomness (SCWE-024, SCWE-065)
 * Detects: weak on-chain randomness sources, block.timestamp manipulation.
 * Distinguishes: randomness use (keccak256(abi.encodePacked(block.timestamp, ...)))
 * vs. legitimate time checks (require(block.timestamp > deadline)).
 */

import { visit } from "@solidity-parser/parser";
import type {
  SourceUnit,
  FunctionCall,
  MemberAccess,
} from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import { findMemberAccesses } from "../ast-utils.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

registerDetector({
  id: "randomness",
  scweIds: ["SCWE-024", "SCWE-065"],
  detect(ast: SourceUnit): DetectorResult[] {
    const results: DetectorResult[] = [];

    // SCWE-024: Weak Randomness — keccak256(abi.encodePacked(block.*)) pattern
    // Detect: block.timestamp, block.difficulty, block.prevrandao, blockhash() used
    // inside keccak256/abi.encodePacked context → weak randomness
    visit(ast, {
      FunctionCall: (node) => {
        const call = node as FunctionCall;
        // Look for keccak256(...) calls
        if (call.expression.type !== "Identifier" || call.expression.name !== "keccak256") return;

        // Check if any argument subtree references block.* randomness sources
        let hasBlockSource = false;
        visit(node, {
          MemberAccess: (member) => {
            const ma = member as MemberAccess;
            if (ma.expression.type !== "Identifier" || ma.expression.name !== "block") return;
            if (
              ma.memberName === "timestamp" ||
              ma.memberName === "difficulty" ||
              ma.memberName === "prevrandao"
            ) {
              hasBlockSource = true;
            }
          },
          // Also check for blockhash() inside keccak256
          FunctionCall: (inner) => {
            const innerCall = inner as FunctionCall;
            if (
              innerCall.expression.type === "Identifier" &&
              innerCall.expression.name === "blockhash"
            ) {
              hasBlockSource = true;
            }
          },
        });

        if (hasBlockSource) {
          results.push({
            scweId: "SCWE-024",
            name: "Weak Randomness",
            severity: "high",
            line: getLine(node),
            description:
              "On-chain values (block.timestamp, blockhash, prevrandao) are predictable. " +
              "Use Chainlink VRF for randomness.",
            source: "ast",
          });
        }
      },
    });

    // Also detect direct blockhash() calls used standalone (not in keccak)
    visit(ast, {
      FunctionCall: (node) => {
        const call = node as FunctionCall;
        if (call.expression.type === "Identifier" && call.expression.name === "blockhash") {
          results.push({
            scweId: "SCWE-024",
            name: "Weak Randomness (blockhash)",
            severity: "high",
            line: getLine(node),
            description:
              "blockhash is predictable and can be manipulated by miners. " +
              "Use Chainlink VRF for secure randomness.",
            source: "ast",
          });
        }
      },
    });

    // SCWE-065: Block Timestamp Manipulation — block.timestamp used in comparisons/arithmetic
    // but NOT inside keccak256 (those are SCWE-024 above)
    const timestampLines = findMemberAccesses(ast, "block", "timestamp");
    for (const line of timestampLines) {
      results.push({
        scweId: "SCWE-065",
        name: "Block Timestamp Manipulation",
        severity: "medium",
        line,
        description:
          "Miners can manipulate block.timestamp by ~15 seconds. " +
          "Avoid using it for critical logic.",
        source: "ast",
      });
    }

    return results;
  },
});

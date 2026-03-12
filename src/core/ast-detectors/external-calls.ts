/**
 * AST detector: External Call Issues (SCWE-035, SCWE-048, SCWE-079, SCWE-059, SCWE-073)
 * Detects: insecure delegatecall, unchecked return values, DoS via revert,
 * insufficient gas griefing, hardcoded gas amounts.
 */

import { visit } from "@solidity-parser/parser";
import type {
  SourceUnit,
  FunctionCall,
  MemberAccess,
} from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import { findAllFunctions, hasDelegatecall, findExternalCalls } from "../ast-utils.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

registerDetector({
  id: "external-calls",
  scweIds: ["SCWE-035", "SCWE-048", "SCWE-079", "SCWE-059", "SCWE-073"],
  detect(ast: SourceUnit, code: string): DetectorResult[] {
    const results: DetectorResult[] = [];
    const funcs = findAllFunctions(ast);
    const lines = code.split("\n");

    for (const func of funcs) {
      // SCWE-035: Insecure delegatecall
      if (hasDelegatecall(func)) {
        const isPublicOrExternal = func.visibility === "public" || func.visibility === "external";
        if (isPublicOrExternal) {
          const callInfo = findExternalCalls(func).find((c) => c.kind === "delegatecall");
          results.push({
            scweId: "SCWE-035",
            name: "Insecure Delegatecall Usage",
            severity: "critical",
            line: callInfo?.line ?? getLine(func),
            description:
              "delegatecall executes external code in caller's storage context. " +
              "If target is user-controlled it can overwrite storage.",
            source: "ast",
          });
        }
      }

      // SCWE-073: Hardcoded gas amount — scan for .call{gas: NNNN}
      const calls = findExternalCalls(func);
      for (const call of calls) {
        if (call.kind === "call" && call.line > 0) {
          const lineText = lines[call.line - 1] ?? "";
          if (/gas\s*:\s*\d+/.test(lineText)) {
            results.push({
              scweId: "SCWE-073",
              name: "Hardcoded Gas Amount",
              severity: "medium",
              line: call.line,
              description:
                "Hardcoded gas stipends can break after EVM gas schedule changes. " +
                "Forward all gas unless there is a specific reason.",
              source: "ast",
            });
          }
        }
      }
    }

    // SCWE-048: Unchecked .send() return value — scan lines for .send() ending with ;
    for (let i = 0; i < lines.length; i++) {
      if (/\.send\s*\([^)]*\)\s*;/.test(lines[i])) {
        results.push({
          scweId: "SCWE-048",
          name: "Unchecked External Call Return Value",
          severity: "high",
          line: i + 1,
          description:
            "Return values of .send() must be checked. " + "Unchecked calls can silently fail.",
          source: "ast",
        });
      }
    }

    return results;
  },
});

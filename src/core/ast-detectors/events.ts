/**
 * AST detector: Event Emission Correctness (SCWE-063)
 * Detects events that auditors expect on transaction logic but are missing
 * or implemented incorrectly:
 *   - state-changing public/external functions that emit no event,
 *   - events declared but never emitted anywhere,
 *   - emitted events whose key fields are not indexed for off-chain filtering.
 */

import type { SourceUnit } from "@solidity-parser/parser/src/ast-types.js";
import { registerDetector, type DetectorResult } from "../ast-detector-registry.js";
import {
  findAllContracts,
  findContractFunctions,
  findStateVariableNames,
  findStateVarWrites,
  findEventDefinitions,
  findEmittedEventNames,
  hasEmitStatement,
} from "../ast-utils.js";

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

/** Events with this many parameters and no indexed field hinder off-chain filtering. */
const INDEXED_SUGGESTION_THRESHOLD = 3;

registerDetector({
  id: "events",
  scweIds: ["SCWE-063"],
  detect(ast: SourceUnit): DetectorResult[] {
    const results: DetectorResult[] = [];
    const emitted = findEmittedEventNames(ast);

    for (const contract of findAllContracts(ast)) {
      // Interfaces declare events for implementers; libraries rarely emit. Skip both.
      if (contract.kind === "interface" || contract.kind === "library") continue;

      const stateVars = findStateVariableNames(contract);

      // 1. Missing event emission on state-changing public/external functions.
      for (const func of findContractFunctions(contract)) {
        const isPublic = func.visibility === "public" || func.visibility === "external";
        const isReadOnly = func.stateMutability === "view" || func.stateMutability === "pure";
        const isSpecial = func.isConstructor || func.isFallback || func.isReceiveEther;
        if (!isPublic || isReadOnly || isSpecial) continue;

        if (findStateVarWrites(func, stateVars).length > 0 && !hasEmitStatement(func)) {
          results.push({
            scweId: "SCWE-063",
            name: "Missing Event Emission on State Change",
            severity: "low",
            line: getLine(func),
            description:
              `Function '${func.name ?? "<unnamed>"}' changes contract state but emits no event. ` +
              "Emit an event for off-chain indexing and auditability of this state transition.",
            source: "ast",
          });
        }
      }

      // 2 & 3. Event declaration correctness.
      for (const event of findEventDefinitions(contract)) {
        if (!emitted.has(event.name)) {
          // Declared but never emitted — dead event or a forgotten emit on a state change.
          results.push({
            scweId: "SCWE-063",
            name: "Declared Event Never Emitted",
            severity: "low",
            line: getLine(event),
            description:
              `Event '${event.name}' is declared but never emitted. ` +
              "Emit it on the relevant state change, or remove it if obsolete.",
            source: "ast",
          });
          continue;
        }

        const params = event.parameters;
        const hasIndexed = params.some((p) => p.isIndexed);
        if (!event.isAnonymous && params.length >= INDEXED_SUGGESTION_THRESHOLD && !hasIndexed) {
          results.push({
            scweId: "SCWE-063",
            name: "Event Missing Indexed Parameters",
            severity: "low",
            line: getLine(event),
            description:
              `Event '${event.name}' has ${params.length} parameters but none are indexed. ` +
              "Mark key fields (addresses, ids) as indexed so off-chain consumers can filter logs.",
            source: "ast",
          });
        }
      }
    }

    return results;
  },
});

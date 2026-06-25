/**
 * AST detector: Event Emission Correctness (SCWE-063)
 * Detects events that auditors expect on transaction logic but are missing
 * or implemented incorrectly:
 *   - state-changing public/external functions that emit no event,
 *   - events declared but never emitted anywhere,
 *   - emitted events whose key fields are not indexed for off-chain filtering.
 */

import type {
  SourceUnit,
  VariableDeclaration,
  ElementaryTypeName,
} from "@solidity-parser/parser/src/ast-types.js";
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

/** Non-anonymous events can hold at most 3 indexed topics (topic0 is the signature). */
const MAX_INDEXED_TOPICS = 3;

/** camelCase `Id`/`ID` suffix or bare `id`/`_id` — avoids matching "valid"/"paid". */
const ID_NAME = /(Id|ID)$|^_?id$/;

/**
 * A parameter worth indexing: an entity key used for off-chain filtering —
 * an address, or an identifier-named field. Amounts and payloads are not.
 */
function isIndexWorthyParam(param: VariableDeclaration): boolean {
  const typeName = param.typeName;
  if (
    typeName?.type === "ElementaryTypeName" &&
    (typeName as ElementaryTypeName).name === "address"
  ) {
    return true;
  }
  return param.name != null && ID_NAME.test(param.name);
}

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

        if (event.isAnonymous) continue;
        const params = event.parameters;
        const indexedCount = params.filter((p) => p.isIndexed).length;
        if (indexedCount >= MAX_INDEXED_TOPICS) continue; // no topic slots left

        const candidates = params
          .filter((p) => !p.isIndexed && isIndexWorthyParam(p))
          .map((p) => p.name ?? "<unnamed>");
        if (candidates.length > 0) {
          results.push({
            scweId: "SCWE-063",
            name: "Event Missing Indexed Parameters",
            severity: "low",
            line: getLine(event),
            description:
              `Event '${event.name}' has key field(s) not marked indexed: ${candidates.join(", ")}. ` +
              "Index addresses and ids so off-chain consumers can filter logs (max 3 indexed topics).",
            source: "ast",
          });
        }
      }
    }

    return results;
  },
});

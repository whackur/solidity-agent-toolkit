/**
 * Extended AST utilities for detector implementations.
 * Reuses Phase 2 validators and adds: external call detection,
 * state update detection, CEI pattern analysis.
 */

import { visit } from "@solidity-parser/parser";
import type {
  SourceUnit,
  FunctionDefinition,
  ContractDefinition,
  EventDefinition,
  StateVariableDeclaration,
  EmitStatement,
  Expression,
  BaseASTNode,
  FunctionCall,
  MemberAccess,
} from "@solidity-parser/parser/src/ast-types.js";

export interface ExternalCallInfo {
  line: number;
  kind: "call" | "send" | "transfer" | "delegatecall";
  text: string;
}

export interface StateUpdateInfo {
  line: number;
  text: string;
}

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

/** Find all external call sites within a function body. */
export function findExternalCalls(func: FunctionDefinition): ExternalCallInfo[] {
  if (!func.body) return [];
  const calls: ExternalCallInfo[] = [];

  visit(func.body, {
    MemberAccess: (node) => {
      const member = node as MemberAccess;
      const name = member.memberName;
      if (name === "call" || name === "send" || name === "transfer" || name === "delegatecall") {
        calls.push({
          line: getLine(node),
          kind: name as ExternalCallInfo["kind"],
          text: name,
        });
      }
    },
  });

  return calls;
}

/** Find all state variable assignments within a function body. */
export function findStateUpdates(func: FunctionDefinition): StateUpdateInfo[] {
  if (!func.body) return [];
  const updates: StateUpdateInfo[] = [];

  visit(func.body, {
    ExpressionStatement: (node) => {
      if (!node.expression) return;
      const expr = node.expression;
      // Look for assignments: BinaryOperation with =, +=, -=, etc.
      if (expr.type === "BinaryOperation") {
        const op = expr.operator;
        if (op === "=" || op === "+=" || op === "-=" || op === "*=" || op === "/=") {
          // Left side must be state-like (IndexAccess on mapping, or Identifier)
          if (expr.left.type === "IndexAccess" || expr.left.type === "Identifier") {
            updates.push({ line: getLine(node), text: op });
          }
        }
      }
    },
  });

  return updates;
}

/**
 * Check if a function follows the Checks-Effects-Interactions (CEI) pattern.
 * Returns true if ALL state updates happen BEFORE ALL external calls.
 * Returns false if any external call precedes a state update.
 */
export function checkCEIPattern(func: FunctionDefinition): boolean {
  const calls = findExternalCalls(func);
  const updates = findStateUpdates(func);
  if (calls.length === 0 || updates.length === 0) return true;

  const firstCallLine = Math.min(...calls.map((c) => c.line));
  const lastUpdateLine = Math.max(...updates.map((u) => u.line));
  return lastUpdateLine < firstCallLine;
}

/** Find all FunctionDefinition nodes in a contract. */
export function findAllFunctions(ast: SourceUnit): FunctionDefinition[] {
  const funcs: FunctionDefinition[] = [];
  visit(ast, {
    FunctionDefinition: (node) => {
      funcs.push(node);
    },
  });
  return funcs;
}

/** Find all ContractDefinition nodes in the AST. */
export function findAllContracts(ast: SourceUnit): ContractDefinition[] {
  const contracts: ContractDefinition[] = [];
  for (const child of ast.children) {
    if (child.type === "ContractDefinition") {
      contracts.push(child as ContractDefinition);
    }
  }
  return contracts;
}

/** Check if a function's body contains an emit statement. */
export function hasEmitStatement(func: FunctionDefinition): boolean {
  if (!func.body) return false;
  let found = false;
  visit(func.body, {
    EmitStatement: () => {
      found = true;
    },
  });
  return found;
}

/** Check if a function call contains a specific function name (e.g., "selfdestruct"). */
export function hasFunctionCall(func: FunctionDefinition, name: string): boolean {
  if (!func.body) return false;
  let found = false;
  visit(func.body, {
    FunctionCall: (node) => {
      const call = node as FunctionCall;
      if (call.expression.type === "Identifier" && call.expression.name === name) {
        found = true;
      }
    },
  });
  return found;
}

/** Check if a function body contains a delegatecall. */
export function hasDelegatecall(func: FunctionDefinition): boolean {
  return findExternalCalls(func).some((c) => c.kind === "delegatecall");
}

/** Find all FunctionDefinition nodes declared directly within a contract. */
export function findContractFunctions(contract: ContractDefinition): FunctionDefinition[] {
  const funcs: FunctionDefinition[] = [];
  visit(contract, {
    FunctionDefinition: (node) => {
      funcs.push(node);
    },
  });
  return funcs;
}

/** Collect the names of all state variables declared in a contract. */
export function findStateVariableNames(contract: ContractDefinition): Set<string> {
  const names = new Set<string>();
  for (const node of contract.subNodes) {
    if (node.type === "StateVariableDeclaration") {
      for (const v of (node as StateVariableDeclaration).variables) {
        if (v.name) names.add(v.name);
      }
    }
  }
  return names;
}

/** Find all EventDefinition nodes declared within a contract. */
export function findEventDefinitions(contract: ContractDefinition): EventDefinition[] {
  const events: EventDefinition[] = [];
  visit(contract, {
    EventDefinition: (node) => {
      events.push(node);
    },
  });
  return events;
}

/** Collect the names of every event emitted anywhere in the source unit. */
export function findEmittedEventNames(ast: SourceUnit): Set<string> {
  const names = new Set<string>();
  visit(ast, {
    EmitStatement: (node) => {
      const expr = (node as EmitStatement).eventCall.expression;
      if (expr.type === "Identifier") names.add(expr.name);
    },
  });
  return names;
}

/** Resolve the root identifier of an assignable expression (e.g. `a.b[c]` → `a`). */
function baseIdentifierName(node: Expression): string | null {
  switch (node.type) {
    case "Identifier":
      return node.name;
    case "IndexAccess":
      return baseIdentifierName(node.base);
    case "MemberAccess":
      return baseIdentifierName(node.expression);
    default:
      return null;
  }
}

const ASSIGNMENT_OPERATORS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "|=", "&=", "^="]);

/**
 * Find assignments within a function whose target resolves to a state variable.
 * More precise than findStateUpdates: ignores writes to local variables.
 */
export function findStateVarWrites(
  func: FunctionDefinition,
  stateVarNames: Set<string>,
): StateUpdateInfo[] {
  if (!func.body || stateVarNames.size === 0) return [];
  const updates: StateUpdateInfo[] = [];

  visit(func.body, {
    ExpressionStatement: (node) => {
      const expr = node.expression;
      if (!expr || expr.type !== "BinaryOperation" || !ASSIGNMENT_OPERATORS.has(expr.operator)) {
        return;
      }
      const base = baseIdentifierName(expr.left);
      if (base && stateVarNames.has(base)) {
        updates.push({ line: getLine(node), text: expr.operator });
      }
    },
  });

  return updates;
}

/** Extract all member access patterns like block.timestamp, tx.origin. */
export function findMemberAccesses(
  node: BaseASTNode,
  objectName: string,
  memberName: string,
): number[] {
  const lines: number[] = [];
  visit(node, {
    MemberAccess: (n) => {
      const ma = n as MemberAccess;
      if (
        ma.memberName === memberName &&
        ma.expression.type === "Identifier" &&
        ma.expression.name === objectName
      ) {
        lines.push(getLine(n));
      }
    },
  });
  return lines;
}

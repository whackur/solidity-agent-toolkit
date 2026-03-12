/**
 * Independent pure AST validator functions for filtering false positives.
 * Each function takes AST nodes and returns a boolean — no side effects.
 * These MUST NOT be embedded inside matchPatterns() (Metis directive).
 */

import { visit } from "@solidity-parser/parser";
import type {
  SourceUnit,
  ContractDefinition,
  FunctionDefinition,
  PragmaDirective,
} from "@solidity-parser/parser/src/ast-types.js";

// ─── Modifier Validators ───────────────────────────────────────────

/** Check if a function has a modifier with the given name. */
export function hasModifier(func: FunctionDefinition, name: string): boolean {
  return func.modifiers.some((m) => m.name === name);
}

/** Check if a function has ANY modifier at all. */
export function hasAnyModifier(func: FunctionDefinition): boolean {
  return func.modifiers.length > 0;
}

/** Check if a function has a modifier whose name contains the given substring (case-insensitive). */
export function hasModifierLike(func: FunctionDefinition, substring: string): boolean {
  const lower = substring.toLowerCase();
  return func.modifiers.some((m) => m.name.toLowerCase().includes(lower));
}

// ─── Pragma Validators ─────────────────────────────────────────────

/** Extract the pragma solidity version string from the AST (e.g., "^0.8.20"). */
export function getPragmaVersion(ast: SourceUnit): string | null {
  for (const node of ast.children) {
    if (node.type === "PragmaDirective") {
      const pragma = node as PragmaDirective;
      if (pragma.name === "solidity") return pragma.value;
    }
  }
  return null;
}

/** Check if the pragma version is >= 0.8.0 (has built-in overflow checks). */
export function isPragma08OrAbove(ast: SourceUnit): boolean {
  const version = getPragmaVersion(ast);
  if (!version) return false;
  // Match version numbers like ^0.8.0, >=0.8.0, 0.8.20, etc.
  const match = version.match(/0\.(\d+)/);
  if (!match) return false;
  return parseInt(match[1], 10) >= 8;
}

// ─── Contract Kind Validators ──────────────────────────────────────

/** Check if the contract containing a given line is a library. */
export function isLibraryContract(ast: SourceUnit, line: number): boolean {
  return getContractKindAtLine(ast, line) === "library";
}

/** Check if the contract containing a given line is an interface. */
export function isInterfaceContract(ast: SourceUnit, line: number): boolean {
  return getContractKindAtLine(ast, line) === "interface";
}

/** Get the contract kind at a given source line. */
export function getContractKindAtLine(ast: SourceUnit, line: number): string | null {
  for (const node of ast.children) {
    if (node.type !== "ContractDefinition") continue;
    const contract = node as ContractDefinition;
    const start = contract.loc?.start.line ?? 0;
    const end = contract.loc?.end.line ?? 0;
    if (line >= start && line <= end) return contract.kind;
  }
  return null;
}

/** Check if the file contains ONLY library and/or interface definitions (no deployable contracts). */
export function isLibraryOrInterfaceOnly(ast: SourceUnit): boolean {
  let hasDefinition = false;
  for (const node of ast.children) {
    if (node.type !== "ContractDefinition") continue;
    const contract = node as ContractDefinition;
    hasDefinition = true;
    if (contract.kind !== "library" && contract.kind !== "interface") return false;
  }
  return hasDefinition;
}

// ─── Function Lookup ───────────────────────────────────────────────

/** Find the FunctionDefinition node that contains the given source line. */
export function findFunctionAtLine(ast: SourceUnit, line: number): FunctionDefinition | null {
  let found: FunctionDefinition | null = null;
  visit(ast, {
    FunctionDefinition: (node) => {
      const start = node.loc?.start.line ?? 0;
      const end = node.loc?.end.line ?? 0;
      if (line >= start && line <= end) found = node;
    },
  });
  return found;
}

/** Get the visibility of a function node. */
export function getFunctionVisibility(
  func: FunctionDefinition,
): "default" | "external" | "internal" | "public" | "private" {
  return func.visibility;
}

// ─── Unchecked Block Validator ─────────────────────────────────────

/** Check if a given line is inside an `unchecked { }` block. */
export function isInsideUnchecked(ast: SourceUnit, line: number): boolean {
  let inside = false;
  visit(ast, {
    UncheckedStatement: (node) => {
      const start = node.loc?.start.line ?? 0;
      const end = node.loc?.end.line ?? 0;
      if (line >= start && line <= end) inside = true;
    },
  });
  return inside;
}

// ─── Nonce / Replay Protection Validator ───────────────────────────

/** Check if the AST contains a nonce-like state variable (for signature replay detection). */
export function hasNonceVariable(ast: SourceUnit): boolean {
  let found = false;
  visit(ast, {
    StateVariableDeclaration: (node) => {
      for (const v of node.variables) {
        const name = v.name?.toLowerCase() ?? "";
        if (name.includes("nonce") || name.includes("_nonce")) {
          found = true;
        }
      }
    },
  });
  return found;
}

// ─── Inline Access Control Validator ───────────────────────────────

/** Check if a function body contains a require() with msg.sender or role-based check. */
export function hasInlineAccessControl(func: FunctionDefinition): boolean {
  if (!func.body) return false;
  let found = false;
  visit(func, {
    FunctionCall: (node) => {
      if (node.expression.type !== "Identifier") return;
      const name = node.expression.name;
      if (name !== "require" && name !== "revert") return;
      // Check if any argument references msg.sender or role
      visit(node, {
        MemberAccess: (member) => {
          if (member.memberName === "sender") found = true;
        },
        Identifier: (id) => {
          const lower = id.name.toLowerCase();
          if (lower.includes("role") || lower.includes("owner") || lower.includes("admin")) {
            found = true;
          }
        },
      });
    },
  });
  return found;
}

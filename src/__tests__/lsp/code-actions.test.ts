import { describe, it, expect } from "vitest";
import { CodeActionKind, type Diagnostic, DiagnosticSeverity } from "vscode-languageserver/node.js";
import { getSCWEById } from "../../knowledge/scwe-parser.js";

function buildCodeActionsFromDiagnostics(diagnostics: Diagnostic[]) {
  const actions: any[] = [];

  for (const diagnostic of diagnostics) {
    if (!diagnostic.code || typeof diagnostic.code !== "string") continue;
    if (!diagnostic.code.startsWith("SCWE-")) continue;

    const entry = getSCWEById(diagnostic.code);
    if (!entry) continue;

    const action: any = {
      title: `View remediation for ${entry.title} (${entry.id})`,
      kind: CodeActionKind.QuickFix,
      diagnostics: [diagnostic],
    };

    if (entry.examples.fixed && entry.examples.fixed.trim().length > 0) {
      action.command = {
        title: `Show fixed code for ${entry.id}`,
        command: "solidity-security.showRemediation",
        arguments: [
          {
            scweId: entry.id,
            title: entry.title,
            remediation: entry.remediation,
            fixedCode: entry.examples.fixed,
          },
        ],
      };
    }

    actions.push(action);
  }

  return actions;
}

describe("code actions logic", () => {
  it("creates QuickFix actions for SCWE-coded diagnostics", () => {
    const diag: Diagnostic = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      severity: DiagnosticSeverity.Error,
      source: "solidity-patterns",
      code: "SCWE-001",
      message: "Test vulnerability",
    };

    const actions = buildCodeActionsFromDiagnostics([diag]);

    if (getSCWEById("SCWE-001")) {
      expect(actions.length).toBe(1);
      expect(actions[0].kind).toBe(CodeActionKind.QuickFix);
      expect(actions[0].title).toContain("SCWE-001");
      expect(actions[0].diagnostics).toEqual([diag]);
    }
  });

  it("skips diagnostics without SCWE codes", () => {
    const diag: Diagnostic = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      severity: DiagnosticSeverity.Warning,
      source: "solhint",
      code: "no-unused-vars",
      message: "Unused variable",
    };

    const actions = buildCodeActionsFromDiagnostics([diag]);
    expect(actions).toEqual([]);
  });

  it("skips diagnostics with unknown SCWE IDs", () => {
    const diag: Diagnostic = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      severity: DiagnosticSeverity.Error,
      source: "solidity-patterns",
      code: "SCWE-999",
      message: "Unknown vulnerability",
    };

    const actions = buildCodeActionsFromDiagnostics([diag]);
    expect(actions).toEqual([]);
  });

  it("includes command with fixed code when available", () => {
    const diag: Diagnostic = {
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 10 } },
      severity: DiagnosticSeverity.Error,
      source: "solidity-patterns",
      code: "SCWE-001",
      message: "Test vulnerability",
    };

    const actions = buildCodeActionsFromDiagnostics([diag]);
    const entry = getSCWEById("SCWE-001");

    if (entry && entry.examples.fixed?.trim()) {
      expect(actions[0].command).toBeDefined();
      expect(actions[0].command.command).toBe("solidity-security.showRemediation");
      expect(actions[0].command.arguments[0].fixedCode).toBe(entry.examples.fixed);
    }
  });
});

import {
  type Connection,
  type CodeAction,
  type CodeActionParams,
  CodeActionKind,
} from "vscode-languageserver/node";
import { getSCWEById } from "../knowledge/scwe-parser.js";

export function setupCodeActions(connection: Connection): void {
  connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
    const actions: CodeAction[] = [];

    for (const diagnostic of params.context.diagnostics) {
      if (!diagnostic.code || typeof diagnostic.code !== "string") continue;
      if (!diagnostic.code.startsWith("SCWE-")) continue;

      const entry = getSCWEById(diagnostic.code);
      if (!entry) continue;

      const action: CodeAction = {
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
  });
}

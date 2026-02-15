import {
  type Connection,
  type Hover,
  type TextDocumentPositionParams,
} from "vscode-languageserver/node.js";
import { type TextDocument } from "vscode-languageserver-textdocument";
import { type TextDocuments } from "vscode-languageserver/node.js";
import { getSCWEById } from "../knowledge/scwe-parser.js";
import { getPatternDiagnostics } from "./pattern-diagnostics.js";

function buildScweHoverContent(scweId: string): string | null {
  const entry = getSCWEById(scweId);
  if (!entry) return null;

  const severity = entry.profiles.length > 0 ? entry.profiles.join(", ") : "Unspecified";
  const description =
    entry.description.length > 500 ? entry.description.slice(0, 497) + "..." : entry.description;
  const remediation =
    entry.remediation.length > 500 ? entry.remediation.slice(0, 497) + "..." : entry.remediation;
  const cwe =
    entry.mappings.cwe.length > 0 ? entry.mappings.cwe.map((c) => `CWE-${c}`).join(", ") : "None";

  return [
    `### ${entry.id}: ${entry.title}`,
    "",
    `**Severity**: ${severity}`,
    "",
    `**Description**: ${description}`,
    "",
    `**Remediation**: ${remediation}`,
    "",
    `**Related**: ${cwe}`,
  ].join("\n");
}

export function setupHoverProvider(
  connection: Connection,
  documents: TextDocuments<TextDocument>,
): void {
  connection.onHover((params: TextDocumentPositionParams): Hover | null => {
    const document = documents.get(params.textDocument.uri);
    if (!document) return null;

    const diagnostics = getPatternDiagnostics(document);
    const position = params.position;

    const matchedDiag = diagnostics.find(
      (d) =>
        d.code &&
        typeof d.code === "string" &&
        d.code.startsWith("SCWE-") &&
        d.range.start.line <= position.line &&
        d.range.end.line >= position.line,
    );

    if (!matchedDiag || !matchedDiag.code) return null;

    const content = buildScweHoverContent(String(matchedDiag.code));
    if (!content) return null;

    return {
      contents: { kind: "markdown", value: content },
    };
  });
}

import {
  type Connection,
  type Diagnostic,
  type TextDocuments,
  type TextDocumentChangeEvent,
} from "vscode-languageserver/node.js";
import { type TextDocument } from "vscode-languageserver-textdocument";
import { getPatternDiagnostics } from "./pattern-diagnostics.js";
import {
  getSlitherDiagnostics,
  getSolhintDiagnostics,
  getAderynDiagnostics,
} from "./cli-diagnostics.js";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PATTERN_DEBOUNCE_MS = 200;
const CLI_DEBOUNCE_MS = 500;
const patternTimers = new Map<string, ReturnType<typeof setTimeout>>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const lastPatternDiagnostics = new Map<string, Diagnostic[]>();

export function getCachedPatternDiagnostics(uri: string): Diagnostic[] | undefined {
  return lastPatternDiagnostics.get(uri);
}

function deduplicateDiagnostics(diagnostics: Diagnostic[]): Diagnostic[] {
  const seen = new Set<string>();
  return diagnostics.filter((d) => {
    const key = `${d.range.start.line}:${d.source}:${d.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getFilePathFromUri(uri: string): string {
  try {
    return fileURLToPath(uri);
  } catch {
    return uri.replace("file://", "");
  }
}

export function setupDiagnostics(
  connection: Connection,
  documents: TextDocuments<TextDocument>,
): void {
  documents.onDidChangeContent((change: TextDocumentChangeEvent<TextDocument>) => {
    const uri = change.document.uri;

    const existingPattern = patternTimers.get(uri);
    if (existingPattern) clearTimeout(existingPattern);

    patternTimers.set(
      uri,
      setTimeout(() => {
        patternTimers.delete(uri);

        const doc = documents.get(uri);
        if (!doc) return;

        const patternDiags = getPatternDiagnostics(doc);
        lastPatternDiagnostics.set(uri, patternDiags);
        connection.sendDiagnostics({ uri, diagnostics: patternDiags });
      }, PATTERN_DEBOUNCE_MS),
    );
  });

  documents.onDidSave((change: TextDocumentChangeEvent<TextDocument>) => {
    const uri = change.document.uri;

    const existing = debounceTimers.get(uri);
    if (existing) clearTimeout(existing);

    debounceTimers.set(
      uri,
      setTimeout(async () => {
        debounceTimers.delete(uri);

        const filePath = getFilePathFromUri(uri);
        const cwd = path.dirname(filePath);

        const [slither, solhint, aderyn] = await Promise.all([
          getSlitherDiagnostics(filePath, cwd),
          getSolhintDiagnostics(filePath, cwd),
          getAderynDiagnostics(filePath, cwd),
        ]);

        const patterns = lastPatternDiagnostics.get(uri) ?? [];
        const merged = deduplicateDiagnostics([...patterns, ...slither, ...solhint, ...aderyn]);

        connection.sendDiagnostics({ uri, diagnostics: merged });
      }, CLI_DEBOUNCE_MS),
    );
  });

  documents.onDidClose((event: TextDocumentChangeEvent<TextDocument>) => {
    const uri = event.document.uri;
    const patternTimer = patternTimers.get(uri);
    if (patternTimer) {
      clearTimeout(patternTimer);
      patternTimers.delete(uri);
    }
    const cliTimer = debounceTimers.get(uri);
    if (cliTimer) {
      clearTimeout(cliTimer);
      debounceTimers.delete(uri);
    }
    lastPatternDiagnostics.delete(uri);
    connection.sendDiagnostics({ uri, diagnostics: [] });
  });
}

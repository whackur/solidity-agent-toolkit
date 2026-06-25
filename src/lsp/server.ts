import {
  createConnection,
  TextDocuments,
  TextDocumentSyncKind,
  type InitializeParams,
  type InitializeResult,
} from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { notifyIfUpdateAvailable } from "../core/version-checker.js";
import { setupDiagnostics } from "./diagnostics.js";
import { setupHoverProvider } from "./hover-provider.js";
import { setupCodeActions } from "./code-actions.js";

const connection = createConnection(process.stdin, process.stdout);
const documents = new TextDocuments(TextDocument);

connection.onInitialize((_params: InitializeParams): InitializeResult => {
  return {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      hoverProvider: true,
      codeActionProvider: true,
    },
  };
});

connection.onInitialized(() => {
  setupDiagnostics(connection, documents);
  setupHoverProvider(connection, documents);
  setupCodeActions(connection);
});

notifyIfUpdateAvailable();
documents.listen(connection);
connection.listen();

# src/lsp/ — LSP Server

## OVERVIEW

Language Server Protocol implementation providing security-focused diagnostics, OWASP SCWE hover info, and remediation code actions for Solidity files.

## STRUCTURE

```
lsp/
├── server.ts              # Connection + capability declaration + wiring
├── diagnostics.ts         # Aggregator: pattern (on change) + CLI (on save, debounced)
├── pattern-diagnostics.ts # Sync, fast: regex vulnerability detection → Diagnostic[]
├── cli-diagnostics.ts     # Async: Slither/Solhint/Aderyn → Diagnostic[]
├── cli-runner.ts          # child_process.spawn wrapper (non-blocking)
├── severity-mapper.ts     # Tool severity → DiagnosticSeverity
├── hover-provider.ts      # SCWE hover content (Markdown)
└── code-actions.ts        # QuickFix code actions for SCWE diagnostics
```

## DATA FLOW

```
On keystroke → pattern-diagnostics.ts → sendDiagnostics (instant)
On save     → cli-diagnostics.ts (parallel) → merge with patterns → sendDiagnostics (debounced 500ms)
On hover    → hover-provider.ts → getSCWEById → Markdown content
On quickfix → code-actions.ts → getSCWEById → remediation + fixed code
```

## CONVENTIONS

- Uses `vscode-languageserver@9.0.1` + `vscode-languageserver-textdocument@1.0.12`
- Imports from `../core/` for parsers and `../knowledge/` for SCWE data
- CLI tools run via `cli-runner.ts` (async spawn, never `execSync`)
- Severity mapping centralized in `severity-mapper.ts`
- **NEVER import from `mcp/`**

## ADDING FEATURES

1. Create new handler file in `src/lsp/`
2. Export a `setup*` function that takes `(connection, documents)`
3. Register in `server.ts` inside `connection.onInitialized`
4. Add capability in `onInitialize` return value
5. Add tests in `src/__tests__/lsp/`

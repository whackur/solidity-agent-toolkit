# src/lsp/ — LSP Server

## OVERVIEW

Language Server Protocol implementation providing security-focused diagnostics, OWASP SCWE hover info, and remediation code actions for Solidity files.

**Heuristic-first design**: Pattern-based (regex) diagnostics are labeled as `[Heuristic]` and downgraded to Warning/Information/Hint severity. CLI tools (Slither/Aderyn/Solhint) are authoritative — when they return results on the same line, overlapping pattern diagnostics are suppressed.

## STRUCTURE

```
lsp/
├── server.ts              # Connection + capability declaration + wiring
├── diagnostics.ts         # Aggregator: pattern (on change) + CLI (on save) + overlap suppression
├── pattern-diagnostics.ts # Sync, fast: [Heuristic] regex detection → Diagnostic[]
├── cli-diagnostics.ts     # Async: Slither/Solhint/Aderyn → Diagnostic[]
├── cli-runner.ts          # child_process.spawn wrapper (non-blocking)
├── severity-mapper.ts     # Tool severity → DiagnosticSeverity (patterns: Warning/Info/Hint only)
├── hover-provider.ts      # SCWE hover content (Markdown)
└── code-actions.ts        # QuickFix code actions for SCWE diagnostics
```

## DATA FLOW

```
On keystroke → pattern-diagnostics.ts → [Heuristic] diagnostics → sendDiagnostics (instant, 200ms debounce)
On save     → cli-diagnostics.ts (parallel) → suppressOverlappingPatterns() → merge → sendDiagnostics (500ms debounce)
On hover    → hover-provider.ts → getSCWEById → Markdown content
On quickfix → code-actions.ts → getSCWEById → remediation + fixed code
```

### Diagnostic Priority (on save)

1. CLI diagnostics (Slither/Aderyn/Solhint) are authoritative
2. Pattern diagnostics on the **same line** as CLI findings are suppressed (`suppressOverlappingPatterns()`)
3. Remaining pattern diagnostics are kept as heuristic hints
4. All diagnostics are deduplicated before sending

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

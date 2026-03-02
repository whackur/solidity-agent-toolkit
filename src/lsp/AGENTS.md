# src/lsp/ — LSP Server

LSP implementation: security diagnostics, OWASP SCWE hover info, remediation code actions for Solidity files.

## DATA FLOW

```
On keystroke → pattern-diagnostics.ts → [Heuristic] diagnostics (200ms debounce)
On save      → cli-diagnostics.ts (parallel) → suppress overlaps → merge (500ms debounce)
On hover     → hover-provider.ts → getSCWEById → Markdown
On quickfix  → code-actions.ts → getSCWEById → remediation + fixed code
```

## DIAGNOSTIC HIERARCHY

1. **CLI tools** (Slither/Aderyn/Solhint) = authoritative, highest priority
2. **Pattern diagnostics** (regex) = heuristic, labeled `[Heuristic]`, downgraded severity
3. On save: CLI results on same line **suppress** overlapping pattern diagnostics
4. All diagnostics deduplicated before sending

## CONVENTIONS

- Uses `vscode-languageserver@9.0.1` + `vscode-languageserver-textdocument@1.0.12`
- Imports from `../core/` and `../knowledge/`
- CLI tools run via `cli-runner.ts` (async spawn, never `execSync`)
- Severity mapping centralized in `severity-mapper.ts`
- **NEVER import from `mcp/`**

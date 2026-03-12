# src/lsp/ — LSP Server

LSP implementation: security diagnostics, OWASP SCWE hover info, remediation code actions for Solidity files.

## DATA FLOW

```
On keystroke → pattern-diagnostics.ts → [AST + Heuristic] diagnostics (200ms debounce)
On save      → cli-diagnostics.ts (parallel) → suppress overlaps → merge (500ms debounce)
On hover     → hover-provider.ts → getSCWEById → Markdown
On quickfix  → code-actions.ts → getSCWEById → remediation + fixed code
```

## DIAGNOSTIC HIERARCHY

1. **CLI tools** (Slither/Aderyn/Solhint) = authoritative, highest priority
2. **AST detectors** (8 modules, 22 SCWE IDs) = primary detection, low false-positive rate
3. **Pattern diagnostics** (regex fallback) = heuristic for uncovered SCWE IDs, labeled `[Heuristic]`, downgraded severity
4. On save: CLI results on same line **suppress** overlapping pattern/AST diagnostics
5. All diagnostics deduplicated before sending

## CONVENTIONS

- Uses `vscode-languageserver@9.0.1` + `vscode-languageserver-textdocument@1.0.12`
- Imports from `../core/` and `../knowledge/`
- CLI tools run via `cli-runner.ts` (async spawn, never `execSync`)
- Severity mapping centralized in `severity-mapper.ts`
- **NEVER import from `mcp/`**

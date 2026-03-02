# src/core/ — Shared Analysis Logic

Protocol-agnostic analysis logic reusable by both MCP and LSP. CLI wrappers + pure parsers.

## RULES

- **NEVER import from `mcp/` or `lsp/`** — core is protocol-agnostic
- May import from `knowledge/` only
- Each file < 200 LOC logic
- `execSync` calls are acceptable here
- Returns result objects (`{ success, findings, error }`) — never throws for expected failures
- I/O separated from pure logic: `run*()` for execution, `parse*`/`format*` for logic

## KEY FILE GROUPS

**Security scanners**: `slither.ts`, `solhint.ts`, `aderyn.ts` — each has `run*()`, `parse*()`, `check*Installed()`

**Foundry wrappers**: `compile.ts` (`runCompile()`), `contract-inspect.ts` (`runForgeInspect()`, `formatInspectResult()`), `test-runner.ts` (`runTests()`, `runSingleTest()`), `gas-snapshot.ts` (`runGasSnapshot()`), `gas-report.ts` (`runGasReport()`), `deploy.ts`, `deploy-status.ts`, `storage-layout.ts`

**Pure analysis**: `pattern-matcher.ts` (heuristic regex + disclaimer), `scwe-search.ts`, `erc-compliance.ts`, `proxy-safety.ts`, `adversarial-analysis.ts`, `access-control-matrix.ts`, `dependency-graph.ts`, `natspec.ts`, `natspec-parser.ts`

**Utilities**: `tool-checker.ts` (CLI availability), `version-checker.ts` (npm version check)

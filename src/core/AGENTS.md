# src/core/ — Shared Analysis Logic

Protocol-agnostic analysis logic reusable by both MCP and LSP. CLI wrappers, pure parsers, and AST-based vulnerability detectors.

## RULES

- **NEVER import from `mcp/` or `lsp/`** — core is protocol-agnostic
- May import from `knowledge/` only
- Each file < 300 LOC logic
- `execSync` calls are acceptable here
- Returns result objects (`{ success, findings, error }`) — never throws for expected failures
- I/O separated from pure logic: `run*()` for execution, `parse*`/`format*` for logic

## KEY FILE GROUPS

**Security scanners**: `slither.ts`, `solhint.ts`, `aderyn.ts` — each has `run*()`, `parse*()`, `check*Installed()`

**Foundry wrappers**: `compile.ts` (`runCompile()`), `contract-inspect.ts` (`runForgeInspect()`, `formatInspectResult()`), `test-runner.ts` (`runTests()`, `runSingleTest()`), `gas-snapshot.ts` (`runGasSnapshot()`), `gas-report.ts` (`runGasReport()`), `deploy.ts`, `deploy-status.ts`, `storage-layout.ts`

**Pure analysis**: `pattern-matcher.ts` (AST-first + regex fallback, orchestrates detection pipeline), `scwe-search.ts`, `erc-compliance.ts`, `proxy-safety.ts`, `adversarial-analysis.ts`, `access-control-matrix.ts`, `dependency-graph.ts`, `natspec.ts`, `natspec-parser.ts`

**AST detection layer** (`@solidity-parser/parser`):

- `ast-parse.ts` — tolerant parsing + LRU cache (32 entries). `parseSolidity(code) → ParseResult`
- `ast-validators.ts` — 12 independent pure AST validator predicates (modifier checks, pragma analysis, contract kind, etc.)
- `ast-context-filter.ts` — Phase 2 post-filter: reduces regex false positives using AST context (7 SCWE-specific rules)
- `ast-detector-registry.ts` — `DetectorResult` interface, `ASTDetector` interface, `registerDetector()`, `runASTDetectors()`
- `ast-utils.ts` — shared utilities: `findExternalCalls()`, `findStateUpdates()`, `checkCEIPattern()`, `findAllFunctions()`, etc.
- `ast-detectors/` — 8 self-registering detector modules:
  - `reentrancy.ts` (SCWE-046)
  - `access-control.ts` (SCWE-005, SCWE-016, SCWE-038, SCWE-049)
  - `external-calls.ts` (SCWE-035, SCWE-048, SCWE-059, SCWE-073, SCWE-079)
  - `arithmetic.ts` (SCWE-047, SCWE-074)
  - `code-quality.ts` (SCWE-060, SCWE-063, SCWE-067, SCWE-097)
  - `randomness.ts` (SCWE-024, SCWE-065)
  - `signature.ts` (SCWE-055)
  - `dos.ts` (SCWE-050, SCWE-058, SCWE-071, SCWE-075)
  - `index.ts` (barrel import triggers self-registration)

**Utilities**: `tool-checker.ts` (CLI availability), `version-checker.ts` (npm version check)

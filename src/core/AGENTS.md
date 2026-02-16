# src/core/ — Shared Analysis Logic

## OVERVIEW

Protocol-agnostic analysis logic reusable by both MCP and LSP. Each file wraps one external CLI tool or provides one analysis function. 23 files total.

## FILES

### CLI Wrappers (Security Scanners)

| File                | Purpose                             | Key Exports                                                       |
| ------------------- | ----------------------------------- | ----------------------------------------------------------------- |
| `slither.ts`        | Slither CLI wrapper + JSON parser   | `runSlither()`, `parseSlitherJson()`, `checkSlitherInstalled()`   |
| `slither-format.ts` | Slither output formatting           | `formatSlitherFindings()`                                         |
| `solhint.ts`        | Solhint CLI wrapper + output parser | `runSolhint()`, `parseSolhintOutput()`, `checkSolhintInstalled()` |
| `aderyn.ts`         | Aderyn CLI wrapper + JSON parser    | `runAderyn()`, `parseAderynJson()`, `checkAderynInstalled()`      |

### CLI Wrappers (Foundry)

| File                    | Purpose                          | Key Exports                                 |
| ----------------------- | -------------------------------- | ------------------------------------------- |
| `compile.ts`            | Forge compilation + ABI/bytecode | `runCompile()`, `getAbi()`, `getBytecode()` |
| `test-runner.ts`        | Forge test execution             | `runTests()`, `runSingleTest()`             |
| `test-runner-format.ts` | Test output formatting           | `formatTestResults()`                       |
| `gas-snapshot.ts`       | Gas snapshot analysis            | `runGasSnapshot()`, `parseGasSnapshot()`    |
| `gas-report.ts`         | Gas estimation                   | `runEstimateGas()`                          |
| `storage-layout.ts`     | Storage layout inspection        | `runInspectStorage()`                       |
| `deploy.ts`             | Dry-run deployment simulation    | `runDryRunDeploy()`                         |
| `deploy-status.ts`      | Foundry broadcast log parsing    | `checkDeploymentStatus()`                   |

### Analysis (Pure Logic)

| File                       | Purpose                              | Key Exports                                   |
| -------------------------- | ------------------------------------ | --------------------------------------------- |
| `pattern-matcher.ts`       | Regex vulnerability detection        | `matchPatterns()`, `PatternMatch`             |
| `scwe-search.ts`           | SCWE knowledge base search           | `searchVulnerabilities()`, `getRemediation()` |
| `erc-compliance.ts`        | ERC standard compliance checking     | `checkERCCompliance()`                        |
| `proxy-safety.ts`          | Proxy/upgrade anti-pattern detection | `checkProxySafety()`                          |
| `adversarial-analysis.ts`  | Feature → attack scenario mapping    | `analyzeAdversarialScenarios()`               |
| `access-control-matrix.ts` | Function visibility/modifier matrix  | `generateAccessControlMatrix()`               |
| `dependency-graph.ts`      | Import/inheritance graph + Mermaid   | `extractContractDependencies()`               |
| `natspec.ts`               | NatSpec validation/generation        | `validateNatSpec()`, `generateNatSpec()`      |
| `natspec-parser.ts`        | NatSpec comment extraction           | `parseNatSpecComments()`                      |

### Utilities

| File                 | Purpose                         | Key Exports                            |
| -------------------- | ------------------------------- | -------------------------------------- |
| `tool-checker.ts`    | CLI tool availability on PATH   | `isCliAvailable()`, `getToolVersion()` |
| `version-checker.ts` | npm registry version comparison | `checkForUpdates()`                    |

## RULES

- **NEVER import from `mcp/` or `lsp/`** — core is protocol-agnostic
- May import from `knowledge/` only
- Each file < 200 LOC logic
- `execSync` calls are acceptable here (MCP tools use sync; LSP uses `cli-runner.ts` for async)
- Returns result objects (`{ success, findings, error }`) — never throws for expected failures
- I/O separated from pure logic: execution (`run*`) vs. parsing/formatting (`parse*`, `format*`)

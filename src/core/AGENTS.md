# src/core/ — Shared Analysis Logic

## OVERVIEW

Pure analysis logic reusable by both MCP and LSP. No protocol-specific code. Each file wraps one external CLI tool or provides one analysis function.

## FILES

| File                 | Purpose                             | Exports                                                                               |
| -------------------- | ----------------------------------- | ------------------------------------------------------------------------------------- |
| `slither.ts`         | Slither CLI wrapper + JSON parser   | `runSlither()`, `parseSlitherJson()`, `checkSlitherInstalled()`, `SlitherFinding`     |
| `solhint.ts`         | Solhint CLI wrapper + output parser | `runSolhint()`, `parseSolhintOutput()`, `checkSolhintInstalled()`, `SolhintViolation` |
| `aderyn.ts`          | Aderyn CLI wrapper + JSON parser    | `runAderyn()`, `parseAderynJson()`, `checkAderynInstalled()`, `AderynFinding`         |
| `compile.ts`         | Foundry compilation                 | `runCompile()`, `getAbi()`, `getBytecode()`, `checkForgeInstalled()`                  |
| `test-runner.ts`     | Foundry test runner                 | `runTests()`, `runSingleTest()`                                                       |
| `gas-snapshot.ts`    | Gas snapshot analysis               | `runGasSnapshot()`, `parseGasSnapshot()`                                              |
| `gas-report.ts`      | Gas estimation + storage            | `runEstimateGas()`, `runInspectStorage()`                                             |
| `deploy.ts`          | Dry-run deployment                  | `runDryRunDeploy()`, `checkDeploymentStatus()`                                        |
| `natspec.ts`         | NatSpec validation/generation       | `validateNatSpec()`, `generateNatSpec()`                                              |
| `scwe-search.ts`     | SCWE search/check/remediation       | `searchVulnerabilities()`, `checkVulnerability()`, `getRemediation()`                 |
| `pattern-matcher.ts` | Regex vulnerability detection       | `matchPatterns()`, `PatternMatch`                                                     |

## RULES

- **NEVER import from `mcp/` or `lsp/`** — core is protocol-agnostic
- May import from `knowledge/` only
- Each file < 200 LOC logic
- `execSync` calls are acceptable here (MCP tools use sync; LSP uses `cli-runner.ts` for async)

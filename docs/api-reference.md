# API Reference

## Tools (5)

| Tool                 | Description                                                                                                                                                                     | Key Parameters                                                                                                                                                                                                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run_security_scan`  | Static security analysis with Slither, Aderyn, or Solhint (CLI required), or `"patterns"`: AST detectors (22 SCWE IDs) with regex fallback on inline code, no CLI               | `tool`: `"slither"` \| `"aderyn"` \| `"solhint"` \| `"patterns"`, `path?`, `detectors?`, `exclude?`, `jsonOutput?`, `outputFormat?`, `files?`, `rules?`, `code?` / `checkIds?` (patterns only; `code` required)                                                                                                                                 |
| `analyze_contract`   | Multi-analysis: adversarial scenarios, proxy safety, ERC compliance, access control, or dependency graph                                                                        | `analysis`: `"adversarial"` \| `"proxy_safety"` \| `"erc_compliance"` \| `"access_control"` \| `"dependencies"`, `code`, `categories?`, `standard?`                                                                                                                                                                                             |
| `lookup_knowledge`   | Load a methodology guide, search the OWASP SCWE database, or look up one SCWE ID with remediation. Precedence: `guide` → `vulnerabilityId` → `query`; no arguments lists guides | `guide?` (see `guide://list`), `vulnerabilityId?`, `query?`, `filters?`                                                                                                                                                                                                                                                                         |
| `check_code_quality` | `"style"`: Solidity Style Guide check, or auto-format with forge fmt (`fix`). `"natspec"`: validate NatSpec or generate templates (`generate`)                                  | `check`: `"style"` \| `"natspec"`, `code`, `fix?` (style), `generate?` (natspec)                                                                                                                                                                                                                                                                |
| `run_foundry`        | Foundry build, artifact inspection, tests, gas report/snapshot, deployment simulation (never broadcasts) and broadcast status                                                   | `action`: `"build"` \| `"inspect"` \| `"test"` \| `"gas_report"` \| `"gas_snapshot"` \| `"deploy_simulate"` \| `"deploy_status"`, plus `path?`, `contractName?`, `inspect?`, `testFilter?`, `verbosity?`, `fuzz?`, `testContract?`, `testFunction?`, `functionName?`, `compare?`, `scriptPath?`, `rpcUrl?`, `forkBlockNumber?`, `broadcastDir?` |

### Migrating from 0.8.x

| Old tool (0.8.x)                                             | New call                                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `scan_vulnerability_patterns { code, checkIds }`             | `run_security_scan { tool: "patterns", code, checkIds }`                         |
| `search_vulnerabilities { query, vulnerabilityId, filters }` | `lookup_knowledge { query, vulnerabilityId, filters }`                           |
| `get_guide { topic }`                                        | `lookup_knowledge { guide }` (no arguments lists guides)                         |
| `check_code_style { code, fix }`                             | `check_code_quality { check: "style", code, fix }`                               |
| `check_natspec { code, generate }`                           | `check_code_quality { check: "natspec", code, generate }`                        |
| `compile_contract { path, contractName }`                    | `run_foundry { action: "build", path, contractName }`                            |
| `compile_contract { contractName, inspect }`                 | `run_foundry { action: "inspect", contractName, inspect }`                       |
| `run_tests { ... }`                                          | `run_foundry { action: "test", ... }`                                            |
| `analyze_gas { mode: "report", ... }`                        | `run_foundry { action: "gas_report", contractName, functionName }`               |
| `analyze_gas { mode: "snapshot", compare }`                  | `run_foundry { action: "gas_snapshot", compare }`                                |
| `manage_deployment { action: "simulate", ... }`              | `run_foundry { action: "deploy_simulate", scriptPath, rpcUrl, forkBlockNumber }` |
| `manage_deployment { action: "status", broadcastDir }`       | `run_foundry { action: "deploy_status", broadcastDir }`                          |

## Resources (14)

### Methodology Guides

| URI               | Description                                                              |
| ----------------- | ------------------------------------------------------------------------ |
| `guide://list`    | List all methodology guides and references                               |
| `guide://{topic}` | Get a guide as markdown (e.g., `guide://code-review`, `guide://foundry`) |

### OWASP Smart Contract Top 10

| URI              | Description                                                                |
| ---------------- | -------------------------------------------------------------------------- |
| `sctop10://list` | List all 10 OWASP Smart Contract Top 10 categories                         |
| `sctop10://{id}` | Detailed info about a specific SC Top 10 category (e.g., `sctop10://SC01`) |

### OWASP SCWE Vulnerability Database

| URI                          | Description                                                              |
| ---------------------------- | ------------------------------------------------------------------------ |
| `scwe://list`                | List all OWASP SCWE entries (156 vulnerabilities) with ID and title      |
| `scwe://{id}`                | Get a specific SCWE entry by ID (e.g., `scwe://SCWE-046`)                |
| `scwe://category/{category}` | List SCWE entries by SCSVS category (e.g., `scwe://category/SCSVS-CODE`) |

### ERC Standards

| URI                | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `erc://list`       | List all supported ERC standards                                    |
| `erc://{standard}` | Get an abbreviated ERC core-interface excerpt (e.g., `erc://ERC20`) |

### Adversarial Scenarios

| URI                                 | Description                                                                  |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| `adversarial://list`                | List all adversarial attack scenarios grouped by category                    |
| `adversarial://category/{category}` | Get scenarios by attack category (e.g., `adversarial://category/reentrancy`) |
| `adversarial://scenario/{id}`       | Get a specific attack scenario by ID (e.g., `adversarial://scenario/AS-001`) |

### Tool References

| URI                   | Description                                            |
| --------------------- | ------------------------------------------------------ |
| `slither://detectors` | List all available Slither detectors with descriptions |
| `solhint://rules`     | List all available Solhint rules with descriptions     |

## Prompts (7)

| Prompt                 | Description                                                              | Key Arguments                                                                  |
| ---------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `security_audit`       | Comprehensive security audit for Solidity contracts (quick or deep mode) | `code`, `mode?`: `"quick"` \| `"deep"`                                         |
| `vulnerability_fix`    | Remediation guide and fix for a specific SCWE vulnerability              | `vulnerabilityId`, `code?`                                                     |
| `code_review`          | Comprehensive Solidity code review focusing on security, gas, or style   | `code`, `focus?`: `"security"` \| `"gas"` \| `"style"`                         |
| `best_practices_check` | Check Solidity code against modern best practices                        | `code`                                                                         |
| `optimize_gas`         | Measure-first gas optimization analysis with optional storage layout     | `code`, `storageLayout?`                                                       |
| `generate_erc`         | Generate guidance for implementing an ERC standard                       | `standard`: `"ERC20"` \| `"ERC721"` \| `"ERC1155"` \| `"ERC4626"`, `features?` |
| `adversarial_analysis` | Guided adversarial scenario analysis from an attacker's perspective      | `code`, `categories?`                                                          |

# API Reference

## Tools (10)

### Security Analysis

| Tool                          | Description                                                                                                               | Key Parameters                                                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `run_security_scan`           | Run security analysis using Slither, Aderyn, or Solhint                                                                   | `tool`: `"slither"` \| `"aderyn"` \| `"solhint"`, `path?`, `detectors?`, `exclude?`, `jsonOutput?`, `files?`, `rules?`                              |
| `search_vulnerabilities`      | Search the OWASP SCWE database by query, or look up a specific vulnerability by ID for remediation                        | `query?`, `vulnerabilityId?`, `filters?`                                                                                                            |
| `scan_vulnerability_patterns` | Scan Solidity code for vulnerabilities using AST-based detectors (22 SCWE IDs) with regex fallback for remaining patterns | `code`, `checkIds?`                                                                                                                                 |
| `analyze_contract`            | Multi-analysis: adversarial scenarios, proxy safety, ERC compliance, access control, or dependency graph                  | `analysis`: `"adversarial"` \| `"proxy_safety"` \| `"erc_compliance"` \| `"access_control"` \| `"dependencies"`, `code`, `categories?`, `standard?` |

### Compilation & Testing

| Tool               | Description                                                                           | Key Parameters                                                               |
| ------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `compile_contract` | Compile Solidity contracts using Foundry, or inspect ABI, bytecode, or storage layout | `path?`, `contractName?`, `inspect?`: `"abi"` \| `"bytecode"` \| `"storage"` |
| `run_tests`        | Run Foundry tests, optionally targeting a single test with trace output               | `testFilter?`, `verbosity?`, `fuzz?`, `testContract?`, `testFunction?`       |

### Gas & Deployment

| Tool                | Description                                                                                  | Key Parameters                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `analyze_gas`       | Gas usage analysis via snapshots or function-level estimates                                 | `mode`: `"snapshot"` \| `"report"`, `contractName?`, `functionName?`, `compare?`                    |
| `manage_deployment` | Simulate a deployment script (dry-run, never broadcasts) or check previous deployment status | `action`: `"simulate"` \| `"status"`, `scriptPath?`, `rpcUrl?`, `forkBlockNumber?`, `broadcastDir?` |

### Code Quality

| Tool               | Description                                                                     | Key Parameters      |
| ------------------ | ------------------------------------------------------------------------------- | ------------------- |
| `check_natspec`    | Validate NatSpec documentation or generate templates for undocumented functions | `code`, `generate?` |
| `check_code_style` | Check Solidity code against the Style Guide, or auto-format with forge fmt      | `code`, `fix?`      |

## Resources (12)

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

| URI                | Description                                                        |
| ------------------ | ------------------------------------------------------------------ |
| `erc://list`       | List all supported ERC standards                                   |
| `erc://{standard}` | Get ERC standard interface and documentation (e.g., `erc://ERC20`) |

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
| `optimize_gas`         | Analyze Solidity code for gas optimizations with optional storage layout | `code`, `includeStorage?`                                                      |
| `generate_erc`         | Generate guidance for implementing an ERC standard                       | `standard`: `"ERC20"` \| `"ERC721"` \| `"ERC1155"` \| `"ERC4626"`, `features?` |
| `adversarial_analysis` | Guided adversarial scenario analysis from an attacker's perspective      | `code`, `categories?`                                                          |

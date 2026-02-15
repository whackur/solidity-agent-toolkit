# API Reference

## Tools

### Security Analysis

| Tool | Description |
|------|-------------|
| `match_vulnerability_patterns` | Detect vulnerability patterns in Solidity code using regex-based heuristics mapped to SCWE IDs |
| `search_vulnerabilities` | Search OWASP SCWE vulnerabilities by query string and optional filters |
| `check_vulnerability` | Check Solidity code for potential vulnerabilities using pattern matching against SCWE examples |
| `get_remediation` | Get detailed remediation guidance and fixed code examples for a specific SCWE vulnerability |
| `run_slither` | Run Slither static analysis on Solidity contracts and map findings to SCWE IDs |
| `list_slither_detectors` | List all available Slither detectors with descriptions |
| `run_aderyn` | Run Aderyn security analysis on Solidity code to detect vulnerabilities |
| `run_solhint` | Run Solhint linter on Solidity files and return violations |
| `list_solhint_rules` | List all available Solhint rules with descriptions |

### Compilation & Testing

| Tool | Description |
|------|-------------|
| `compile_contract` | Compile Solidity contracts using Foundry (forge build) |
| `get_abi` | Get the ABI for a compiled Solidity contract |
| `get_bytecode` | Get the bytecode for a compiled Solidity contract |
| `run_tests` | Run Foundry tests and return summary of results |
| `run_single_test` | Run a single Foundry test with detailed trace output |

### Gas & Storage

| Tool | Description |
|------|-------------|
| `gas_snapshot` | Generate gas usage snapshot for all test functions using forge snapshot |
| `inspect_storage` | Inspect storage layout of a Solidity contract |
| `estimate_gas` | Get gas usage estimates for contract functions |

### Deployment

| Tool | Description |
|------|-------------|
| `dry_run_deploy` | Simulate a deployment script using forge script (dry-run only, never broadcasts) |
| `check_deployment_status` | Check the status of previous deployments by reading broadcast files |

### Code Quality

| Tool | Description |
|------|-------------|
| `validate_natspec` | Validate NatSpec documentation in Solidity code |
| `generate_natspec` | Generate NatSpec documentation templates for undocumented functions |
| `check_style` | Check Solidity code against the official Solidity Style Guide |
| `format_code` | Format Solidity code using forge fmt |

## Resources

| URI | Description |
|-----|-------------|
| `sctop10://list` | List of all 10 OWASP Smart Contract Top 10 vulnerabilities |
| `sctop10://{id}` | Detailed info about a specific SC Top 10 vulnerability (SC01–SC10) |
| `scwe://list` | List all OWASP SCWE entries with ID and title |
| `scwe://{id}` | Get a specific SCWE entry by ID (e.g., `scwe://SCWE-046`) |
| `scwe://category/{category}` | List SCWE entries by SCSVS category (e.g., `scwe://category/SCSVS-CODE`) |
| `erc://{standard}` | Get ERC standard interface and documentation (ERC20, ERC721, ERC1155, ERC4626) |

## Prompts

| Prompt | Description |
|--------|-------------|
| `security_audit` | Comprehensive security audit for Solidity contracts (quick or deep mode) |
| `vulnerability_fix` | Remediation guide and fix for a specific SCWE vulnerability |
| `code_review` | Comprehensive Solidity code review focusing on security, gas, or style |
| `best_practices_check` | Check Solidity code against modern best practices |
| `optimize_gas` | Analyze Solidity code for gas optimizations with optional storage layout analysis |
| `generate_erc` | Generate guidance for implementing an ERC standard (ERC20, ERC721, ERC1155, ERC4626) |

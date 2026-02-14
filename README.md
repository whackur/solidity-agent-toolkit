# solidity-agent-toolkit

MCP server providing Solidity smart contract security analysis tools, OWASP knowledge base, and development utilities for AI agents.

Built on the [Model Context Protocol](https://modelcontextprotocol.io/) — works with Claude Desktop, Cursor, opencode, and any MCP-compatible client.

## Installation

Run directly with npx (no install needed):

```bash
npx solidity-agent-toolkit
```

Or install globally:

```bash
pnpm add -g solidity-agent-toolkit
```

## MCP Client Setup

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "solidity-agent-toolkit": {
      "command": "npx",
      "args": ["-y", "solidity-agent-toolkit"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP configuration:

```json
{
  "mcpServers": {
    "solidity-agent-toolkit": {
      "command": "npx",
      "args": ["-y", "solidity-agent-toolkit"]
    }
  }
}
```

### opencode

Add to your `opencode.json`:

```json
{
  "mcp": {
    "solidity-agent-toolkit": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "solidity-agent-toolkit"]
    }
  }
}
```

## Available Tools

### Security Analysis

| Tool                           | Description                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `match_vulnerability_patterns` | Detect vulnerability patterns in Solidity code using regex-based heuristics mapped to SCWE IDs |
| `search_vulnerabilities`       | Search OWASP SCWE vulnerabilities by query string and optional filters                         |
| `check_vulnerability`          | Check Solidity code for potential vulnerabilities using pattern matching against SCWE examples |
| `get_remediation`              | Get detailed remediation guidance and fixed code examples for a specific SCWE vulnerability    |
| `run_slither`                  | Run Slither static analysis on Solidity contracts and map findings to SCWE IDs                 |
| `list_slither_detectors`       | List all available Slither detectors with descriptions                                         |
| `run_aderyn`                   | Run Aderyn security analysis on Solidity code to detect vulnerabilities                        |
| `run_solhint`                  | Run Solhint linter on Solidity files and return violations                                     |
| `list_solhint_rules`           | List all available Solhint rules with descriptions                                             |

### Compilation & Testing

| Tool               | Description                                            |
| ------------------ | ------------------------------------------------------ |
| `compile_contract` | Compile Solidity contracts using Foundry (forge build) |
| `get_abi`          | Get the ABI for a compiled Solidity contract           |
| `get_bytecode`     | Get the bytecode for a compiled Solidity contract      |
| `run_tests`        | Run Foundry tests and return summary of results        |
| `run_single_test`  | Run a single Foundry test with detailed trace output   |

### Gas & Storage

| Tool              | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| `gas_snapshot`    | Generate gas usage snapshot for all test functions using forge snapshot |
| `inspect_storage` | Inspect storage layout of a Solidity contract                           |
| `estimate_gas`    | Get gas usage estimates for contract functions                          |

### Deployment

| Tool                      | Description                                                                      |
| ------------------------- | -------------------------------------------------------------------------------- |
| `dry_run_deploy`          | Simulate a deployment script using forge script (dry-run only, never broadcasts) |
| `check_deployment_status` | Check the status of previous deployments by reading broadcast files              |

### Code Quality

| Tool               | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| `validate_natspec` | Validate NatSpec documentation in Solidity code                     |
| `generate_natspec` | Generate NatSpec documentation templates for undocumented functions |
| `check_style`      | Check Solidity code against the official Solidity Style Guide       |
| `format_code`      | Format Solidity code using forge fmt                                |

## Available Resources

| URI                          | Description                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------ |
| `sctop10://list`             | List of all 10 OWASP Smart Contract Top 10 vulnerabilities                     |
| `sctop10://{id}`             | Detailed info about a specific SC Top 10 vulnerability (SC01-SC10)             |
| `scwe://list`                | List all OWASP SCWE entries with ID and title                                  |
| `scwe://{id}`                | Get a specific SCWE entry by ID (e.g., `scwe://SCWE-046`)                      |
| `scwe://category/{category}` | List SCWE entries by SCSVS category (e.g., `scwe://category/SCSVS-CODE`)       |
| `erc://{standard}`           | Get ERC standard interface and documentation (ERC20, ERC721, ERC1155, ERC4626) |

## Available Prompts

| Prompt                 | Description                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `security_audit`       | Comprehensive security audit for Solidity contracts (quick or deep mode)             |
| `vulnerability_fix`    | Remediation guide and fix for a specific SCWE vulnerability                          |
| `code_review`          | Comprehensive Solidity code review focusing on security, gas, or style               |
| `best_practices_check` | Check Solidity code against modern best practices                                    |
| `optimize_gas`         | Analyze Solidity code for gas optimizations with optional storage layout analysis    |
| `generate_erc`         | Generate guidance for implementing an ERC standard (ERC20, ERC721, ERC1155, ERC4626) |

## Prerequisites

The toolkit works best with these tools installed on your system:

| Tool                                            | Required For                                                                                                        | Install                                                     |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| [Foundry](https://book.getfoundry.sh/)          | `compile_contract`, `run_tests`, `gas_snapshot`, `inspect_storage`, `estimate_gas`, `dry_run_deploy`, `format_code` | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| [Slither](https://github.com/crytic/slither)    | `run_slither`, `list_slither_detectors`                                                                             | `pip3 install slither-analyzer`                             |
| [Aderyn](https://github.com/Cyfrin/aderyn)      | `run_aderyn`                                                                                                        | `brew install cyfrin/tap/aderyn`                            |
| [Solhint](https://github.com/protofire/solhint) | `run_solhint`, `list_solhint_rules`                                                                                 | `pnpm add -g solhint`                                       |

Tools that don't require external dependencies (pattern matching, SCWE search, NatSpec validation, style checking, all resources, and all prompts) work out of the box.

## Development

```bash
pnpm install
pnpm build            # Compile TypeScript
pnpm dev              # Start MCP server (stdio transport)
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm typecheck        # Type-check without emitting
```

## License

MIT

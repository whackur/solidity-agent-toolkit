# solidity-agent-toolkit

MCP server + LSP server providing Solidity smart contract security analysis tools, OWASP knowledge base, and development utilities for AI agents.

Built on [Model Context Protocol](https://modelcontextprotocol.io/) and [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) — works with Claude Desktop, Cursor, opencode, VSCode, IntelliJ, Neovim, and any MCP/LSP-compatible client.

## Quick Start

```bash
# Run MCP server (no install needed)
npx solidity-agent-toolkit

# Register with Claude Code
claude mcp add solidity-agent-toolkit -- npx -y solidity-agent-toolkit@latest
```

### MCP Client Config (Claude Desktop, Cursor, etc.)

```json
{
  "mcpServers": {
    "solidity-agent-toolkit": {
      "command": "npx",
      "args": ["-y", "solidity-agent-toolkit@latest"]
    }
  }
}
```

See [MCP Setup](docs/mcp-setup.md) for client-specific instructions.

### Solidity UML CLI

The package also ships the standalone `sol2uml-light` command for generating Solidity UML and storage diagrams, provided by the [`sol2uml-light`](https://www.npmjs.com/package/sol2uml-light) dependency. SVG is the default output; PNG rendering uses resvg and does not require a browser. The CLI runs from a client's shell; this MCP server does not expose a tool to execute it.

```bash
npx --yes --package=solidity-agent-toolkit sol2uml-light --help
npx --yes --package=solidity-agent-toolkit sol2uml-light ./contracts
```

### Local Development

```bash
git clone --recurse-submodules https://github.com/whackur/solidity-agent-toolkit.git

# If already cloned without submodules
git submodule update --init

# Update submodule to latest remote commit
git submodule update --remote
```

## Features

**5 MCP Tools** — `run_security_scan` (Slither, Aderyn, Solhint, or no-CLI AST pattern detection with regex fallback covering 22 SCWE IDs), `analyze_contract` (adversarial, proxy safety, ERC compliance, access control, dependencies), `lookup_knowledge` (methodology guides and OWASP SCWE search), `check_code_quality` (style guide, formatting, NatSpec), `run_foundry` (build, inspect, test, gas, deployment simulation). See [Migrating from 0.8.x](docs/api-reference.md#migrating-from-08x) for the old tool names.

**14 MCP Resources** — Methodology guides (`guide://`), OWASP Smart Contract Top 10, SCWE vulnerability database (156 entries), ERC standard interfaces, adversarial scenarios, Slither detectors, Solhint rules

**7 MCP Prompts** — Security audit, vulnerability fix, code review, best practices, gas optimization, ERC generation, adversarial analysis

**LSP Server** — Real-time AST + pattern diagnostics, CLI diagnostics on save, OWASP SCWE hover info, remediation code actions

**Methodology Guides** — Code review & security (audit methodology, secure patterns, OWASP SCWE), adversarial analysis, gas optimization, ERC standards, Foundry and Hardhat development, and Solidity UML/repository architecture diagrams. Served through `lookup_knowledge` and `guide://{topic}`; server instructions tell agents which guide to load for each task.

## Documentation

| Document                               | Description                                        |
| -------------------------------------- | -------------------------------------------------- |
| [Installation](docs/installation.md)   | Install, update, uninstall, version pinning        |
| [MCP Setup](docs/mcp-setup.md)         | Claude Desktop, Cursor, opencode, VSCode, IntelliJ |
| [LSP Setup](docs/lsp-setup.md)         | VSCode, IntelliJ, Neovim, Sublime Text             |
| [API Reference](docs/api-reference.md) | All tools, resources, and prompts                  |
| [Development](docs/development.md)     | Prerequisites, commands, architecture              |

## Contributing

All GitHub Issues, PRs (title/description/comments), commit messages, code comments, and documentation **must be in English only**.

## License

MIT

# solidity-agent-toolkit

MCP server + LSP server + Agent Skills providing Solidity smart contract security analysis tools, OWASP knowledge base, and development utilities for AI agents.

Built on [Model Context Protocol](https://modelcontextprotocol.io/) and [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) — works with Claude Desktop, Cursor, opencode, VSCode, IntelliJ, Neovim, and any MCP/LSP-compatible client.

## Quick Start

```bash
# Run MCP server (no install needed)
npx solidity-agent-toolkit

# Install Agent Skills for AI coding agents
npx skills add whackur/solidity-agent-toolkit
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

### Local Development

```bash
git clone --recurse-submodules https://github.com/whackur/solidity-agent-toolkit.git

# If already cloned without submodules
git submodule update --init

# Update submodule to latest remote commit
git submodule update --remote
```

## Features

**10 MCP Tools** — Security scanning (Slither, Aderyn, Solhint), heuristic pattern detection, OWASP SCWE knowledge search, contract structural analysis (adversarial, proxy safety, ERC compliance, access control, dependencies), compilation & inspection (Foundry), test runner, gas analysis, deployment simulation, code quality (NatSpec, style guide, formatting)

**12 MCP Resources** — OWASP Smart Contract Top 10, SCWE vulnerability database (156 entries), ERC standard interfaces, adversarial scenarios, Slither detectors, Solhint rules

**7 MCP Prompts** — Security audit, vulnerability fix, code review, best practices, gas optimization, ERC generation, adversarial analysis

**LSP Server** — Real-time pattern diagnostics, CLI diagnostics on save, OWASP SCWE hover info, remediation code actions

**7 Agent Skills** — Security best practices, Foundry development, Hardhat development, gas optimization, code review methodology, ERC standards, adversarial analysis

## Documentation

| Document                               | Description                                        |
| -------------------------------------- | -------------------------------------------------- |
| [Installation](docs/installation.md)   | Install, update, uninstall, version pinning        |
| [MCP Setup](docs/mcp-setup.md)         | Claude Desktop, Cursor, opencode, VSCode, IntelliJ |
| [LSP Setup](docs/lsp-setup.md)         | VSCode, IntelliJ, Neovim, Sublime Text             |
| [API Reference](docs/api-reference.md) | All tools, resources, and prompts                  |
| [Agent Skills](docs/agent-skills.md)   | Skill descriptions and installation                |
| [Development](docs/development.md)     | Prerequisites, commands, architecture              |

## Contributing

All GitHub Issues, PRs (title/description/comments), commit messages, code comments, and documentation **must be in English only**.

## License

MIT

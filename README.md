# solidity-agent-toolkit

Give AI agents tools to scan Solidity contracts, inspect contract relationships and permissions, generate contract diagrams, look up OWASP security guidance, and run Foundry development workflows. The package provides an MCP server for agent tool calls, an LSP server for editor diagnostics, and a standalone `sol2uml-light` CLI for contract diagrams.

Connect an [MCP](https://modelcontextprotocol.io/)-compatible client such as Claude Code, Claude Desktop, or Cursor to ask questions such as “Find vulnerabilities in this contract,” “Check its access controls,” or “Run the tests and compare gas usage.” Connect the [LSP](https://microsoft.github.io/language-server-protocol/) server separately for editor diagnostics, OWASP hover information, and remediation code actions.

For “Draw this Solidity repository's architecture,” the agent loads the architecture guide and calls `generate_diagram` to return an SVG or PNG artifact. The MCP tool reads paths from the server host's filesystem and does not need client shell access; see [Architecture diagrams](#architecture-diagrams) for the exact call flow.

## Quick Start

Requires **Node.js 24+** and npm. External scanners and Foundry are optional; install them only for the features listed in [MCP tools](#mcp-tools). See [Installation](docs/installation.md) for installation and update options.

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

See [MCP Setup](docs/mcp-setup.md) for client-specific instructions. With `@latest`, a new server launch checks for the latest published version; restart an already running server to pick up updates.

### Solidity UML CLI

The package also ships the standalone `sol2uml-light` command for generating Solidity UML and storage diagrams, provided by the [`sol2uml-light`](https://www.npmjs.com/package/sol2uml-light) dependency. The MCP `generate_diagram` tool runs it on the MCP server and returns an embedded artifact; use the standalone command when you want to run sol2uml-light yourself. SVG is the default output; PNG rendering uses resvg and does not require a browser.

```bash
npx --yes --package=solidity-agent-toolkit sol2uml-light --help
mkdir -p ./artifacts
npx --yes --package=solidity-agent-toolkit sol2uml-light class ./contracts --outputFormat svg --outputFileName ./artifacts/contracts.svg
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

### MCP tools

| Tool                 | When to use it                                                                                           | Input and result                                                                                                                                                                                                                                               | External requirements                                                                                            |
| -------------------- | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `run_security_scan`  | Find potential vulnerabilities or run a scanner.                                                         | `tool: "patterns"` scans supplied Solidity `code` with AST detectors and regex fallback covering 22 SCWE IDs. Other modes run Slither, Aderyn, or Solhint on local files and return findings.                                                                  | None for `patterns`; the selected scanner CLI for other modes, plus its project setup.                           |
| `analyze_contract`   | Inspect attack scenarios, proxy safety, ERC compliance, access controls, or dependencies.                | Supplied Solidity `code` and an `analysis` mode produce a report; `dependencies` includes a Mermaid relationship graph. It does not recursively load repository files or execute `sol2uml-light`.                                                              | None.                                                                                                            |
| `generate_diagram`   | Draw a Solidity class overview, detailed UML, or local storage layout.                                   | `path` is one server-local Solidity file or directory. `view` defaults to `overview`; choose `detailed` for members or `storage` with `contractName`. SVG is default; PNG is supported. Artifacts are returned inline, with optional `outputPath` persistence. | Bundled `sol2uml-light`; no client shell, Foundry, solc, or network access required.                             |
| `lookup_knowledge`   | Load a methodology guide or look up a vulnerability and its remediation.                                 | Use `guide`, `query`, or `vulnerabilityId` for Markdown guidance or OWASP SCWE results. No arguments lists the guides. It does not analyze code or execute guide commands.                                                                                     | None.                                                                                                            |
| `check_code_quality` | Check Solidity style or NatSpec documentation, format code, or generate documentation templates.         | Supplied Solidity `code` with `check: "style"` or `"natspec"` returns violations, formatted code (`fix: true`), or NatSpec templates (`generate: true`).                                                                                                       | None for checks and templates; Foundry for formatting.                                                           |
| `run_foundry`        | Build contracts, inspect artifacts, run tests, measure gas, simulate deployment, or read broadcast logs. | Select an `action` to return build/test results, ABI/bytecode/storage layout, gas reports/snapshots, or deployment information. Deployment simulation never broadcasts transactions.                                                                           | Foundry for forge actions and the corresponding local project; deployment status reads existing broadcast files. |

See the [API Reference](docs/api-reference.md#tools-6) for mode-specific parameters and [Migrating from 0.8.x](docs/api-reference.md#migrating-from-08x) for old tool names. Local file and Foundry operations run in the MCP server's environment; the server must be able to access the intended project.

### Architecture diagrams

For Solidity repository architecture or contract relationship diagrams, the agent follows this flow:

1. Call `lookup_knowledge` with `{ "guide": "architecture-diagrams" }`, or read `guide://architecture-diagrams`, to load the workflow.
2. Call the MCP tool with a Solidity path on the server host. For example: `{"name":"generate_diagram","arguments":{"path":"./contracts","view":"overview","format":"svg"}}`.
3. The default `overview` hides members and groups contracts by folders. Use `view: "detailed"` to show members, or `view: "storage"` with `contractName` to show a contract's local storage layout. The response always embeds the artifact; set `outputPath` to also save it on the server, creating missing parent folders without overwriting an existing file.

Paths are resolved in the MCP server's environment, and each call accepts one local Solidity file or directory. The tool fails for inaccessible paths, unsupported file types, unmatched storage contracts, invalid output extensions, or diagrams over 5 MiB; generation is limited to 60 seconds. A client may display the returned SVG or PNG inline depending on its support. `analyze_contract` with `analysis: "dependencies"` remains a separate source-analysis feature that returns Mermaid text for supplied source. Explicit whole-repository or off-chain architecture requests use repository inspection and a Mermaid system diagram, supplemented by generated Solidity UML where relevant. See the [architecture guide](guides/architecture-diagrams.md) for storage-layout caveats and failure handling.

### Resources, prompts, and editor support

**14 MCP Resources** — Methodology guides (`guide://`), OWASP Smart Contract Top 10, SCWE vulnerability database (156 entries), ERC standard interfaces, adversarial scenarios, Slither detectors, Solhint rules

**7 MCP Prompts** — Security audit, vulnerability fix, code review, best practices, gas optimization, ERC generation, adversarial analysis

**LSP Server** — Real-time AST + pattern diagnostics, CLI diagnostics on save, OWASP SCWE hover info, remediation code actions

**Methodology Guides** — Code review & security (audit methodology, secure patterns, OWASP SCWE), adversarial analysis, gas optimization, ERC standards, Foundry and Hardhat development, Glamsterdam hardfork impact, and Solidity UML/repository architecture diagrams. Served through `lookup_knowledge` and `guide://{topic}`; server instructions tell agents which guide to load for each task.

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

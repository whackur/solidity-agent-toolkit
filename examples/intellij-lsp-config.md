# IntelliJ LSP Setup

## MCP Server (via JetBrains AI MCP)

**Settings → Tools → AI Assistant → MCP Servers → +**

| Field     | Value                       |
| --------- | --------------------------- |
| Name      | `solidity-agent-toolkit`    |
| Command   | `npx`                       |
| Arguments | `-y solidity-agent-toolkit` |
| Transport | `stdio`                     |

## LSP Server

**Settings → Languages & Frameworks → Language Servers → +**

| Field         | Value                           |
| ------------- | ------------------------------- |
| Name          | `Solidity Security LSP`         |
| Command       | `npx`                           |
| Arguments     | `-y solidity-agent-toolkit-lsp` |
| File patterns | `*.sol`                         |

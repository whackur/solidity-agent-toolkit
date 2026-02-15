# MCP Client Setup

The MCP server communicates over **stdio** transport. Configure your MCP client to launch the server as a child process.

> To always receive updates automatically, use `solidity-agent-toolkit@latest` in your config.
> See [Installation — Updating](./installation.md#updating) for details.

## Claude Desktop

Config file location:

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

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

## Cursor

Add to your Cursor MCP configuration:

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

## opencode

Add to your `opencode.json`:

```json
{
  "mcp": {
    "solidity-agent-toolkit": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "solidity-agent-toolkit@latest"]
    }
  }
}
```

## VSCode

If using an MCP-compatible VSCode extension (e.g., Cline, Continue, or GitHub Copilot MCP):

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

## IntelliJ

In **Settings > Tools > AI Assistant > MCP Servers**, add:

| Field     | Value                              |
| --------- | ---------------------------------- |
| Name      | `solidity-agent-toolkit`           |
| Command   | `npx`                              |
| Arguments | `-y solidity-agent-toolkit@latest` |
| Transport | `stdio`                            |

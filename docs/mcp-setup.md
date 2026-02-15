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

Add to `.cursor/mcp.json` in your project root:

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
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "solidity-agent-toolkit": {
      "type": "local",
      "command": ["npx", "-y", "solidity-agent-toolkit@latest"],
      "enabled": true
    }
  }
}
```

## VSCode

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "solidity-agent-toolkit": {
      "command": "npx",
      "args": ["-y", "solidity-agent-toolkit@latest"]
    }
  }
}
```

## IntelliJ

Go to **Settings > Tools > AI Assistant > Model Context Protocol (MCP)**, click **+**, and paste:

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

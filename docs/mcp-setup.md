# MCP Client Setup

The MCP server communicates over **stdio** transport. Configure your MCP client to launch the server as a child process.

Install **Node.js 24 or later** with npm, and make sure `node` and `npx` are available on the MCP client's `PATH`. See [Installation](./installation.md#requirements) for requirements. Merge the examples into your existing configuration, preserving other servers.

Use `solidity-agent-toolkit@latest` to resolve the latest published version when the client launches the server. Restart the server to pick up updates; an already running process does not update itself. See [Installation — Updating](./installation.md#updating) for details.

## Codex

Register the server with the Codex CLI:

```bash
codex mcp add solidity-agent-toolkit -- npx -y solidity-agent-toolkit@latest
```

Alternatively, add this entry to `~/.codex/config.toml`:

```toml
[mcp_servers.solidity-agent-toolkit]
command = "npx"
args = ["-y", "solidity-agent-toolkit@latest"]
```

Codex CLI and the IDE extension share this configuration. Run `codex mcp list` to check registration, then start a new session and use `/mcp` in the CLI to check the connection. See the [official Codex MCP documentation](https://developers.openai.com/codex/mcp).

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

Restart Claude Desktop after saving. See the [official local MCP setup guide](https://modelcontextprotocol.io/docs/develop/connect-local-servers).

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

See the [official Cursor MCP documentation](https://cursor.com/help/customization/mcp).

## OpenCode

For **OpenCode V2**, add to `opencode.json` in your project root:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "solidity-agent-toolkit": {
        "type": "local",
        "command": ["npx", "-y", "solidity-agent-toolkit@latest"]
      }
    }
  }
}
```

V2 connects servers automatically; use `disabled: true` to disable one. For **OpenCode V1**, use the legacy structure instead:

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

V2 also accepts supported V1 configuration for compatibility; converting an existing configuration is optional. See the [OpenCode migration guide](https://opencode.ai/docs/migrate-v1/#mcp-servers). Run `opencode mcp list` to check the connection. See the [official OpenCode MCP documentation](https://opencode.ai/docs/mcp-servers/).

## VS Code (GitHub Copilot)

Add to `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "solidity-agent-toolkit": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "solidity-agent-toolkit@latest"]
    }
  }
}
```

See the [official VS Code MCP configuration reference](https://code.visualstudio.com/docs/agents/reference/mcp-configuration).

## IntelliJ IDEA (AI Assistant)

Go to **Settings > Tools > AI Assistant > Model Context Protocol (MCP)**, click **Add**, select **STDIO**, and paste into **JSON configuration**:

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

Choose the server level (global or project), apply the configuration, and check the connection status. See the [official AI Assistant MCP documentation](https://www.jetbrains.com/help/ai-assistant/mcp.html).

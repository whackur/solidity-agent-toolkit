# Installation

## Requirements

- **Node.js** 18 or later
- **npm**, **pnpm**, or **yarn** package manager

External tools (Foundry, Slither, Aderyn, Solhint) are optional — features that don't require them work out of the box.

## Quick Start

Run directly without installing:

```bash
npx solidity-agent-toolkit
```

This starts the MCP server over stdio. Most MCP clients (Claude Desktop, Cursor, etc.) call this command automatically — see [MCP Setup](./mcp-setup.md).

## Global Installation

If you prefer a persistent install:

```bash
# npm
npm install -g solidity-agent-toolkit

# pnpm
pnpm add -g solidity-agent-toolkit

# yarn
yarn global add solidity-agent-toolkit
```

After installation, both commands are available system-wide:

```bash
solidity-agent-toolkit       # MCP server
solidity-agent-toolkit-lsp   # LSP server
```

## Agent Skills Installation

[Agent Skills](./agent-skills.md) can be installed independently from the MCP/LSP servers:

```bash
npx skills add whackur/solidity-agent-toolkit
```

## Updating

### npx Users

`npx` caches packages locally. To ensure you're running the latest version:

```bash
# Option 1: Use @latest tag (recommended)
npx solidity-agent-toolkit@latest

# Option 2: Clear npx cache, then run
npx clear-npx-cache
npx solidity-agent-toolkit
```

**Tip for MCP clients:** Update your MCP config to use `@latest` so you always get the newest version automatically:

```json
{
  "command": "npx",
  "args": ["-y", "solidity-agent-toolkit@latest"]
}
```

### Global Installation

```bash
# npm
npm update -g solidity-agent-toolkit

# pnpm
pnpm update -g solidity-agent-toolkit

# yarn
yarn global upgrade solidity-agent-toolkit
```

Check your current version:

```bash
npm list -g solidity-agent-toolkit
```

### Agent Skills

Re-run the install command to update to the latest version:

```bash
npx skills add whackur/solidity-agent-toolkit
```

## Uninstalling

### Global Installation

```bash
# npm
npm uninstall -g solidity-agent-toolkit

# pnpm
pnpm remove -g solidity-agent-toolkit

# yarn
yarn global remove solidity-agent-toolkit
```

### npx Cache

npx does not require uninstallation, but you can clear the cache:

```bash
npx clear-npx-cache
```

### MCP Client Config

Remove the `solidity-agent-toolkit` entry from your MCP client configuration file. See [MCP Setup](./mcp-setup.md) for file locations.

### Agent Skills

```bash
npx skills remove whackur/solidity-agent-toolkit
```

## Version Pinning

To lock a specific version (e.g., for reproducible CI environments):

```bash
# Global install with exact version
npm install -g solidity-agent-toolkit@0.1.0

# Or in MCP config
{
  "command": "npx",
  "args": ["-y", "solidity-agent-toolkit@0.1.0"]
}
```

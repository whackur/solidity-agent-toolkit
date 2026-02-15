# LSP Client Setup

The LSP server provides real-time security diagnostics, OWASP SCWE hover info, and remediation code actions for `.sol` files. It communicates over **stdio** transport.

## Quick Test

Run the LSP server manually to verify it works:

```bash
npx solidity-agent-toolkit-lsp
```

## VSCode

Install a generic LSP client extension (e.g., [vscode-languageclient](https://github.com/AstroNvim/astrolsp)) or add to `.vscode/settings.json`:

```json
{
  "solidity-security-lsp.serverPath": "solidity-agent-toolkit-lsp",
  "solidity-security-lsp.trace.server": "verbose"
}
```

## IntelliJ

**Settings > Languages & Frameworks > Language Servers > +**:

| Field | Value |
|-------|-------|
| Name | `Solidity Security LSP` |
| Command | `npx -y solidity-agent-toolkit-lsp` |
| File patterns | `*.sol` |

## Neovim

Using [nvim-lspconfig](https://github.com/neovim/nvim-lspconfig):

```lua
local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.solidity_security then
  configs.solidity_security = {
    default_config = {
      cmd = { 'npx', '-y', 'solidity-agent-toolkit-lsp' },
      filetypes = { 'solidity' },
      root_dir = lspconfig.util.root_pattern(
        'foundry.toml',
        'hardhat.config.ts',
        'hardhat.config.js',
        '.git'
      ),
    },
  }
end

lspconfig.solidity_security.setup({})
```

## Sublime Text

Install the [LSP](https://packagecontrol.io/packages/LSP) package, then add to **Settings > Package Settings > LSP > Settings**:

```json
{
  "clients": {
    "solidity-security": {
      "enabled": true,
      "command": ["npx", "-y", "solidity-agent-toolkit-lsp"],
      "selector": "source.solidity",
      "schemes": ["file"]
    }
  }
}
```

## LSP Features

| Feature | Trigger | Description |
|---------|---------|-------------|
| Pattern diagnostics | On every keystroke | Regex-based vulnerability detection mapped to SCWE IDs |
| CLI diagnostics | On file save | Slither, Solhint, and Aderyn analysis (debounced) |
| Hover info | Hover over diagnostic | OWASP SCWE description, remediation, and CWE mapping |
| Code actions | Quick fix menu | View remediation guidance and fixed code examples |

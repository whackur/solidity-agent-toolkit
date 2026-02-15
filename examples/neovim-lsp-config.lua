local lspconfig = require('lspconfig')
local configs = require('lspconfig.configs')

if not configs.solidity_security then
  configs.solidity_security = {
    default_config = {
      cmd = { 'npx', '-y', 'solidity-agent-toolkit-lsp' },
      filetypes = { 'solidity' },
      root_dir = lspconfig.util.root_pattern('foundry.toml', 'hardhat.config.ts', 'hardhat.config.js', '.git'),
    },
  }
end

lspconfig.solidity_security.setup({})

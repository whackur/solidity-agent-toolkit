# Agent Skills

This toolkit includes 7 [Agent Skills](https://agentskills.io/) that follow the agentskills.io specification. They are auto-detectable by 35+ AI coding agents including Claude Code, Cursor, Codex, OpenCode, Antigravity, VSCode, and more.

Skills work **standalone** as AI coding guidelines. When paired with the MCP server, agents can also run automated analysis tools.

## Available Skills

| Skill                              | Description                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------- |
| `solidity-security-best-practices` | CEI pattern, reentrancy prevention, access control, OWASP SCWE Top 10                     |
| `solidity-foundry-development`     | Project setup, testing patterns, fuzz/invariant/fork testing, cheatcodes, deployment      |
| `solidity-hardhat-development`     | Hardhat 3 setup, ESM-first config, Solidity-native tests, Ignition deployment, multichain |
| `solidity-gas-optimization`        | Storage packing, custom errors, immutables, calldata, assembly, Solady                    |
| `solidity-code-review`             | Structured audit methodology, severity classification, review checklist                   |
| `solidity-erc-standards`           | ERC20, ERC721, ERC1155, ERC4626 implementation guidelines and pitfalls                    |
| `solidity-adversarial-analysis`    | Adversarial threat modeling, attack scenario construction, multi-step exploit analysis    |

## Installation

Install all skills at once:

```bash
npx skills add whackur/solidity-agent-toolkit
```

## Updating

Re-run the install command to update to the latest version:

```bash
npx skills add whackur/solidity-agent-toolkit
```

## Uninstalling

```bash
npx skills remove whackur/solidity-agent-toolkit
```

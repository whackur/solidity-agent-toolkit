# skills/ — Agent Skills

## OVERVIEW

7 Agent Skills following the [agentskills.io](https://agentskills.io) open specification. Auto-detectable by 35+ AI coding agents. Install via `npx skills add whackur/solidity-agent-toolkit`.

## STRUCTURE

```
skills/
├── solidity-security-best-practices/
│   ├── SKILL.md                        # Security thinking framework, OWASP Top 10
│   └── references/owasp-scwe-top10.md  # SC01–SC10 quick reference + MCP mappings
├── solidity-foundry-development/
│   ├── SKILL.md                        # Setup, testing, cheatcodes, deployment
│   └── references/foundry-cheatsheet.md
├── solidity-hardhat-development/
│   ├── SKILL.md                        # Hardhat 3 setup, ESM, Ignition, multichain
│   └── references/hardhat-cheatsheet.md
├── solidity-gas-optimization/
│   └── SKILL.md                        # Storage packing, custom errors, assembly, Solady
├── solidity-code-review/
│   ├── SKILL.md                        # Audit methodology, severity classification
│   ├── references/audit-checklist.md   # 40+ checkbox items by SCSVS category
│   └── references/solidity-style-guide.md  # Style conventions + check_style rule IDs
├── solidity-erc-standards/
│   ├── SKILL.md                        # ERC20/721/1155/4626 guidelines
│   └── references/erc-interfaces.md    # Interface definitions + pitfall table + SCWE
└── solidity-adversarial-analysis/
    └── SKILL.md                        # Adversarial threat modeling, attack scenarios
```

## SKILL.md FORMAT

```yaml
---
name: lowercase-with-hyphens # ≤64 chars, MUST match directory name
description: What + when + triggers # ≤1024 chars, trigger keywords here
license: MIT
metadata:
  author: whackur
  version: "0.1.0"
---
# H1 Title

## When to Apply
- Bullet list of activation criteria

## Content sections...

## Enhanced with MCP
- Optional section listing relevant MCP tools

## References
- Links to references/ files
```

## VERSIONING

Skill versions and package version (`package.json`) are **independent** tracks but follow the same release cadence.

- **Package version** — bump when MCP/LSP code changes (tools, resources, prompts, server logic)
- **Skill version** — bump at **release time** (tag-based), NOT on every edit

**Rule: Do NOT bump `metadata.version` on every SKILL.md edit.** Version bumps happen at release time based on git tags. During development, all skills stay at the current version. Do NOT bump `package.json` for skill-only changes, and vice versa.

## ADDING A NEW SKILL

1. Create `skills/{skill-name}/SKILL.md` — name = lowercase + hyphens only
2. Add `references/` subdir if content exceeds 250 lines (progressive disclosure)
3. Update `README.md` Agent Skills table
4. Validate: frontmatter parses with `gray-matter`, body ≤250 lines, description ≤1024 chars

## ANTI-PATTERNS

- **NO trigger keywords in body** — triggers belong ONLY in `description` frontmatter field
- **NO MCP-dependent instructions** — skills must be useful standalone, MCP is optional enhancement
- **NO body over 250 lines** — move detailed content to `references/` for progressive disclosure
- **NO uppercase or spaces in `name` field** — spec requires lowercase alphanumeric + hyphens
- **NO verbatim copy of MCP prompt templates** — skills provide guidelines, not prompt engineering
- **NO duplicate content across skills** — if two skills cover similar ground, consolidate or cross-reference

# skills/ — Agent Skills

## OVERVIEW

5 Agent Skills following the [agentskills.io](https://agentskills.io) open specification. Auto-detectable by 35+ AI coding agents. Install via `npx skills add whackur/solidity-agent-toolkit`.

## STRUCTURE

```
skills/
├── solidity-security-best-practices/
│   ├── SKILL.md                        # CEI, reentrancy, access control, OWASP Top 10
│   └── references/owasp-scwe-top10.md  # SC01–SC10 quick reference
├── solidity-foundry-development/
│   ├── SKILL.md                        # Setup, testing, cheatcodes, deployment
│   └── references/foundry-cheatsheet.md
├── solidity-gas-optimization/
│   └── SKILL.md                        # Storage packing, custom errors, assembly, Solady
├── solidity-code-review/
│   ├── SKILL.md                        # Audit methodology, severity classification
│   └── references/audit-checklist.md   # 40+ checkbox items by SCSVS category
└── solidity-erc-standards/
    ├── SKILL.md                        # ERC20/721/1155/4626 guidelines
    └── references/erc-interfaces.md    # Full interface definitions + pitfall table
```

## SKILL.md FORMAT

```yaml
---
name: lowercase-with-hyphens    # ≤64 chars, MUST match directory name
description: What + when + triggers  # ≤1024 chars, trigger keywords here
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

Skill versions and package version (`package.json`) are **independent**. They start at the same value but evolve separately.

- **Package version** — bump when MCP/LSP code changes (tools, resources, prompts, server logic)
- **Skill version** — bump when SKILL.md content changes (guidelines, examples, references)

**Rule: If you edit a SKILL.md, bump that skill's `metadata.version`.** Do NOT bump `package.json` for skill-only changes, and vice versa.

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
- **NO Hardhat-specific skill** — project is Foundry-focused; Hardhat can be added later

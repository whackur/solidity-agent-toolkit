# skills/ — Agent Skills

7 Agent Skills following the [agentskills.io](https://agentskills.io) spec. Install via `npx skills add whackur/solidity-agent-toolkit`.

## SKILL.md FORMAT

```yaml
---
name: lowercase-with-hyphens # <=64 chars, must match directory name
description: What + when + triggers # <=1024 chars
license: MIT
metadata:
  author: whackur
  version: "0.5.3"
---
# Title
## When to Apply
## Content...
## Enhanced with MCP  (optional — list relevant MCP tools)
## References         (links to references/ files)
```

## VERSIONING

Skill versions are **synced** with `package.json`. Use `pnpm version <semver>` — it auto-updates every `skills/*/SKILL.md` via `scripts/sync-skill-versions.mjs`. **Never bump `metadata.version` manually.**

## ADDING A SKILL

1. Create `skills/{skill-name}/SKILL.md`
2. Add `references/` subdir if content exceeds 250 lines
3. Validate: frontmatter parses with gray-matter, body <=250 lines, description <=1024 chars

## ANTI-PATTERNS

- No trigger keywords in body — triggers belong ONLY in `description` frontmatter
- No MCP-dependent instructions — skills must work standalone
- No body over 250 lines — move detail to `references/`
- No uppercase or spaces in `name` field
- No duplicate content across skills

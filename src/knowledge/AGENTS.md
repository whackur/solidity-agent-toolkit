# src/knowledge/ — OWASP Data Layer

Parses OWASP SCS git submodule (`data/owasp-scs/`) into typed structures. Regex-based, fragile to upstream format changes.

## DATA FLOW

```
data/owasp-scs/docs/SCWE/*.md   → scwe-parser.ts  → SCWEEntry[]
data/owasp-scs/docs/sctop10/*.md → top10-parser.ts → SCTop10Entry[]
```

## KEY PARSERS

- `scwe-parser.ts` — 156 SCWE entries. `loadAllSCWE()`, `getSCWEById()`, `searchSCWE()`. Cached after first call, `_resetCache()` for tests.
- `top10-parser.ts` — 10 SC Top 10 entries. `loadAllTop10()`, `getTop10ById()`, `searchTop10()`. Same caching pattern.
- `top10-scwe-mappings.ts` — SC Top 10 → SCWE ID mappings

## LOC-EXEMPT DATA FILES

`vulnerability-patterns.ts`, `adversarial-scenarios.ts`, `style-rules.ts`, `slither-mappings.ts`, `erc-interfaces.ts`, `contract-features.ts`, `proxy-patterns.ts`

## PARSING GOTCHAS

- **gray-matter** parses YAML frontmatter — `alias` field normalized to `string[]`
- First solidity code block = vulnerable example, second = fixed (heuristic)
- Section regex matches `## Description`, `## Remediation` etc. — breaks if upstream renames headings

## RULES

- **NEVER modify `data/owasp-scs/`** — it is a git submodule, read-only
- **NEVER hardcode SCWE count** — use `loadAllSCWE().length`

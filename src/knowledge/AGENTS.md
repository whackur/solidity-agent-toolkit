# src/knowledge/ — OWASP Data Layer

## OVERVIEW

Parses OWASP SCS git submodule (`data/owasp-scs/`) into typed structures. Regex-based, fragile to upstream format changes.

## DATA FLOW

```
data/owasp-scs/docs/SCWE/*.md  →  scwe-parser.ts   →  SCWEEntry[]
data/owasp-scs/docs/sctop10/*.md →  top10-parser.ts  →  SCTop10Entry[]
                                    index.ts          →  unified search API
```

## KEY TYPES

| Type | Source | Used By |
|------|--------|---------|
| `SCWEEntry` | `scwe-parser.ts` | Resources (`scwe://`), search tools |
| `SCTop10Entry` | `top10-parser.ts` | Resources (`sctop10://`) |
| `VulnerabilityPattern` | `vulnerability-patterns.ts` | Pattern matcher tool |
| `StyleRule` / `StyleViolation` | `style-rules.ts` | Style guide checker |
| `SlitherDetectorMapping` | `slither-mappings.ts` | Slither tool enrichment |

## ENTRY POINTS FOR CONSUMERS

| Function | File | Purpose |
|----------|------|---------|
| `loadAllSCWE()` | `scwe-parser.ts` | Load all 156 entries (cached) |
| `getSCWEById(id)` | `scwe-parser.ts` | Single entry lookup |
| `searchSCWE(query)` | `scwe-parser.ts` | Text search in title/description |
| `loadAllTop10()` | `top10-parser.ts` | Load all 10 SC Top 10 entries |
| `getTop10ById(id)` | `top10-parser.ts` | Single Top 10 lookup |
| `VULNERABILITY_PATTERNS` | `vulnerability-patterns.ts` | 32+ regex patterns array |
| `getScweIdForDetector(d)` | `slither-mappings.ts` | Slither detector → SCWE mapping |
| `checkAllRules(code)` | `style-rules.ts` | Run all style checks |

## PARSING GOTCHAS

- **gray-matter** parses YAML frontmatter — `alias` field comes as string, normalized to `string[]`
- **Example extraction**: First solidity code block = vulnerable, second = fixed (heuristic)
- **Section extraction**: Regex matches `## Description`, `## Remediation` etc. — breaks if upstream renames headings
- **Caching**: `loadAllSCWE()` / `loadAllTop10()` cache after first call. Use `_resetCache()` in tests only.
- **SC Top 10 mitigations**: SC01 uses paragraphs not bullets — parser falls back to paragraph splitting

## ANTI-PATTERNS

- **NEVER modify `data/owasp-scs/`** — it's a git submodule, read-only
- **NEVER hardcode SCWE count** — use `loadAllSCWE().length` (currently 156, may grow)
- Exempt from 200 LOC limit: `vulnerability-patterns.ts` (static data), `style-rules.ts` (rule defs)

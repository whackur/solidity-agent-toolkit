# src/knowledge/ — OWASP Data Layer

## OVERVIEW

Parses OWASP SCS git submodule (`data/owasp-scs/`) into typed structures. Regex-based, fragile to upstream format changes.

## DATA FLOW

```
data/owasp-scs/docs/SCWE/*.md  →  scwe-parser.ts   →  SCWEEntry[]
data/owasp-scs/docs/sctop10/*.md →  top10-parser.ts  →  SCTop10Entry[]
                                    index.ts          →  unified search API
```

## FILES

| File                        | Purpose                                          | LOC Exempt? |
| --------------------------- | ------------------------------------------------ | ----------- |
| `index.ts`                  | Unified entry point — re-exports all parsers     | —           |
| `scwe-parser.ts`            | Parses 156 SCWE entries from submodule markdown  | —           |
| `top10-parser.ts`           | Parses SC Top 10 categories from submodule       | —           |
| `vulnerability-patterns.ts` | 32+ heuristic regex patterns for vuln detection  | ✅ data     |
| `adversarial-scenarios.ts`  | 17 detailed attack scenarios (flash loans, etc.) | ✅ data     |
| `style-rules.ts`            | Solidity style guide rules + regex checks        | ✅ data     |
| `slither-mappings.ts`       | Maps 80+ Slither detector IDs → SCWE IDs         | ✅ data     |
| `top10-scwe-mappings.ts`    | Maps SC Top 10 categories → SCWE IDs             | ✅ data     |
| `erc-interfaces.ts`         | ERC-20/721/1155/4626 interface specs             | ✅ data     |
| `contract-features.ts`      | Regex patterns for contract type detection       | ✅ data     |
| `proxy-patterns.ts`         | 8 anti-patterns for upgradeable/proxy contracts  | ✅ data     |
| `feature-scwe-mappings.ts`  | AdversarialCategory → SCWE ID bidirectional maps | —           |
| `markdown-section.ts`       | Internal utility for regex escaping in parsing   | —           |

## KEY TYPES

| Type                           | Source                      | Used By                             |
| ------------------------------ | --------------------------- | ----------------------------------- |
| `SCWEEntry`                    | `scwe-parser.ts`            | Resources (`scwe://`), search tools |
| `SCTop10Entry`                 | `top10-parser.ts`           | Resources (`sctop10://`)            |
| `VulnerabilityPattern`         | `vulnerability-patterns.ts` | Pattern matcher tool                |
| `StyleRule` / `StyleViolation` | `style-rules.ts`            | Style guide checker                 |
| `SlitherDetectorMapping`       | `slither-mappings.ts`       | Slither tool enrichment             |

## ENTRY POINTS FOR CONSUMERS

| Function                    | File                        | Purpose                          |
| --------------------------- | --------------------------- | -------------------------------- |
| `loadAllSCWE()`             | `scwe-parser.ts`            | Load all 156 entries (cached)    |
| `getSCWEById(id)`           | `scwe-parser.ts`            | Single entry lookup              |
| `searchSCWE(query)`         | `scwe-parser.ts`            | Text search in title/description |
| `loadAllTop10()`            | `top10-parser.ts`           | Load all 10 SC Top 10 entries    |
| `getTop10ById(id)`          | `top10-parser.ts`           | Single Top 10 lookup             |
| `VULNERABILITY_PATTERNS`    | `vulnerability-patterns.ts` | 32+ regex patterns array         |
| `ADVERSARIAL_SCENARIOS`     | `adversarial-scenarios.ts`  | 17 attack scenario definitions   |
| `PROXY_ANTI_PATTERNS`       | `proxy-patterns.ts`         | 8 proxy safety patterns          |
| `ERC_STANDARDS`             | `erc-interfaces.ts`         | ERC interface specifications     |
| `CONTRACT_FEATURE_PATTERNS` | `contract-features.ts`      | Feature detection patterns       |
| `getScweIdForDetector(d)`   | `slither-mappings.ts`       | Slither detector → SCWE mapping  |
| `checkAllRules(code)`       | `style-rules.ts`            | Run all style checks             |
| `getScweIdsForCategories()` | `feature-scwe-mappings.ts`  | Categories → SCWE IDs            |
| `getCategoriesForScweId()`  | `feature-scwe-mappings.ts`  | SCWE ID → Categories (reverse)   |

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

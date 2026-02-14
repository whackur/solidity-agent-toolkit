# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-15
**Commit:** eb8ef69 (all work staged, uncommitted)
**Branch:** main

## OVERVIEW

MCP server providing Solidity smart contract security tools for AI agents. TypeScript + `@modelcontextprotocol/sdk@1.26.0` + `zod@4.3.6`. Wraps Foundry/Slither/Aderyn/Solhint CLIs and serves OWASP SCWE knowledge base (156 vulnerabilities) via MCP protocol.

## STRUCTURE

```
.
├── src/
│   ├── index.ts           # MCP server wiring ONLY (zero logic)
│   ├── tools/             # CLI tool wrappers (forge, slither, aderyn, solhint)
│   ├── resources/         # MCP Resource providers (scwe://, sctop10://, erc://)
│   ├── prompts/           # MCP Prompt templates (security audit, code review, gas)
│   ├── knowledge/         # OWASP data parsers + vulnerability patterns + style rules
│   ├── types/             # Shared type definitions
│   └── __tests__/         # Mirrors src/ structure
├── bin/cli.ts             # npx entry point (imports dist/src/index.js)
├── data/owasp-scs/        # Git submodule — OWASP SCS docs (DO NOT modify)
└── .sisyphus/rules/       # Mandatory architecture rules
```

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add new CLI tool wrapper | `src/tools/` | Follow canonical pattern in `src/tools/AGENTS.md` |
| Add new MCP resource | `src/resources/` | Use `ResourceTemplate` for dynamic URIs |
| Add new prompt template | `src/prompts/` | Split logic into `*-logic.ts` if complex |
| Modify OWASP parsing | `src/knowledge/` | See `src/knowledge/AGENTS.md` |
| Add tests | `src/__tests__/` | Mirror source structure, see `src/__tests__/AGENTS.md` |
| Register new tool/resource/prompt | `src/index.ts` | Import + call `registerXxx(server)` |

## CONVENTIONS

- **MCP SDK v1.26.0** — use `server.tool()`, `server.resource()`, `server.prompt()`. NOT v2 `registerTool`.
- **Import paths** — always `.js` extension: `from './tools/compile.js'` (NodeNext resolution)
- **Formatting** — double quotes, trailing commas, 100 char width (`.prettierrc`)
- **Unused vars** — prefix with `_` to satisfy ESLint
- **Test files** — relaxed lint rules (no-unused-vars, ban-ts-comment, no-explicit-any all `off`)

## ANTI-PATTERNS

- **NO `utils.ts` / `helpers.ts` / `common.ts`** — name files by purpose
- **NO business logic in `index.ts`** — registration calls only
- **NO `as any` in source** — allowed in tests only, use `_` prefix for unused vars
- **NO `@ts-ignore`** — use `@ts-expect-error` with description (tests only)
- **200 LOC hard limit** on logic per file — exempt: static data arrays, template literals
- **isError semantics** — `true` = execution failure (tool missing, crash); `false` = tool ran successfully (even if it found bugs)

## ARCHITECTURE RULES

Enforced by `.sisyphus/rules/modular-code-enforcement.md` (BLOCKING):

1. `index.ts` = entry point only (re-exports + wiring)
2. Every file = single responsibility
3. >200 LOC logic → split immediately
4. No catch-all files → name by purpose
5. I/O separate from pure logic

## COMMANDS

```bash
pnpm dev              # Start MCP server (stdio)
pnpm test             # vitest run (358 tests)
pnpm typecheck        # tsc --noEmit
pnpm build            # tsc → dist/
pnpm lint             # eslint src/
pnpm format           # prettier --write .
pnpm pack             # Create .tgz package
```

## NOTES

- **Git submodule required**: `git submodule update --init` before running/testing
- **External tools optional**: Foundry/Slither/Aderyn/Solhint checked at runtime, graceful fallback if missing
- **OWASP parser is fragile**: regex-based, assumes specific markdown heading structure in submodule
- **Package manager**: pnpm 10.29.3 exclusively (set in `packageManager` field)
- **MCP SDK v2 migration planned**: v2 is pre-alpha, current code uses v1 stable API

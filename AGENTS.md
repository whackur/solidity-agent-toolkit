# PROJECT KNOWLEDGE BASE

**Generated:** 2026-02-15
**Commit:** 2911031
**Branch:** develop

## OVERVIEW

MCP server + LSP server + Agent Skills providing Solidity smart contract security tools for AI agents and editors. TypeScript + `@modelcontextprotocol/sdk@1.26.0` + `vscode-languageserver@9.0.1` + `zod@4.3.6`. Wraps Foundry/Slither/Aderyn/Solhint CLIs, serves OWASP SCWE knowledge base (156 vulnerabilities) via MCP and LSP protocols, and ships 5 Agent Skills (agentskills.io spec) auto-detectable by 35+ AI coding agents.

## STRUCTURE

```
.
├── src/
│   ├── index.ts           # MCP entry point façade (≤5 lines)
│   ├── core/              # Shared analysis logic (CLI wrappers, parsers)
│   ├── mcp/               # MCP server
│   │   ├── server.ts      # MCP server creation + registration
│   │   ├── tools/         # MCP tool wrappers (thin, import from core/)
│   │   ├── resources/     # MCP Resource providers (scwe://, sctop10://, erc://)
│   │   └── prompts/       # MCP Prompt templates
│   ├── lsp/               # LSP server
│   │   ├── server.ts      # LSP connection + capability declaration
│   │   ├── diagnostics.ts # Diagnostic aggregator (pattern + CLI, debounced)
│   │   ├── pattern-diagnostics.ts  # Regex-based vulnerability detection
│   │   ├── cli-diagnostics.ts      # Slither/Solhint/Aderyn diagnostic adapters
│   │   ├── cli-runner.ts           # Async child_process.spawn wrapper
│   │   ├── severity-mapper.ts      # Tool severity → LSP DiagnosticSeverity
│   │   ├── hover-provider.ts       # OWASP SCWE hover info
│   │   └── code-actions.ts         # Remediation quick fixes
│   ├── knowledge/         # OWASP data parsers + vulnerability patterns + style rules
│   └── __tests__/         # Mirrors src/ structure
├── skills/                # Agent Skills (agentskills.io spec) — 5 SKILL.md files
│   ├── solidity-security-best-practices/
│   ├── solidity-foundry-development/
│   ├── solidity-gas-optimization/
│   ├── solidity-code-review/
│   └── solidity-erc-standards/
├── bin/
│   ├── cli.ts             # MCP entry point (npx solidity-agent-toolkit)
│   └── lsp.ts             # LSP entry point (npx solidity-agent-toolkit-lsp)
├── data/owasp-scs/        # Git submodule — OWASP SCS docs (DO NOT modify)
└── .sisyphus/rules/       # Mandatory architecture rules
```

## IMPORT DAG (MUST enforce)

```
knowledge/  → (no internal deps, only node:fs + gray-matter)
core/       → imports from knowledge/ only
mcp/        → imports from core/ and knowledge/
lsp/        → imports from core/ and knowledge/
```

**NEVER**: `core/` importing from `mcp/` or `lsp/`. **NEVER**: `mcp/` importing from `lsp/` or vice versa.

## WHERE TO LOOK

| Task                  | Location             | Notes                                    |
| --------------------- | -------------------- | ---------------------------------------- |
| Add new analysis tool | `src/core/`          | Pure logic, no MCP/LSP deps              |
| Add MCP tool wrapper  | `src/mcp/tools/`     | Thin wrapper importing from `core/`      |
| Add MCP resource      | `src/mcp/resources/` | Use `ResourceTemplate` for dynamic URIs  |
| Add MCP prompt        | `src/mcp/prompts/`   | Split logic into `*-logic.ts` if complex |
| Add LSP feature       | `src/lsp/`           | See `src/lsp/AGENTS.md`                  |
| Modify OWASP parsing  | `src/knowledge/`     | See `src/knowledge/AGENTS.md`            |
| Add tests             | `src/__tests__/`     | Mirror source structure                  |
| Register new MCP tool | `src/mcp/server.ts`  | Import + call `registerXxx(server)`      |
| Add/edit Agent Skill  | `skills/`            | See `skills/AGENTS.md`                   |

## CONVENTIONS

- **MCP SDK v1.26.0** — use `server.tool()`, `server.resource()`, `server.prompt()`. NOT v2 `registerTool`.
- **LSP SDK v9.0.1** — `vscode-languageserver/node.js` + `vscode-languageserver-textdocument`
- **Import paths** — always `.js` extension: `from './core/compile.js'` (NodeNext resolution)
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
- **NO cross-layer imports** — `core/` must never import from `mcp/` or `lsp/`

## ARCHITECTURE RULES

Enforced by `.sisyphus/rules/modular-code-enforcement.md` (BLOCKING):

1. `index.ts` = entry point only (re-exports + wiring)
2. Every file = single responsibility
3. > 200 LOC logic → split immediately
4. No catch-all files → name by purpose
5. I/O separate from pure logic

## COMMANDS

```bash
pnpm dev              # Start MCP server (stdio)
pnpm lsp              # Start LSP server (stdio)
pnpm test             # vitest run (~390 tests)
pnpm typecheck        # tsc --noEmit
pnpm build            # tsc → dist/
pnpm lint             # eslint src/
pnpm format           # prettier --write .
```

## NOTES

- **Git submodule required**: `git submodule update --init` before running/testing
- **External tools optional**: Foundry/Slither/Aderyn/Solhint checked at runtime, graceful fallback if missing
- **OWASP parser is fragile**: regex-based, assumes specific markdown heading structure in submodule
- **Package manager**: pnpm 10.29.3 exclusively (set in `packageManager` field)
- **MCP SDK v2 migration planned**: v2 is pre-alpha, current code uses v1 stable API
- **Two bin entries**: `solidity-agent-toolkit` (MCP) and `solidity-agent-toolkit-lsp` (LSP) — both use stdio transport
- **Agent Skills**: 5 skills in `skills/` follow [agentskills.io](https://agentskills.io) spec. Install via `npx skills add whackur/solidity-agent-toolkit`. See `skills/AGENTS.md`

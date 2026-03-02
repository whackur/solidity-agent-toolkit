# PROJECT KNOWLEDGE BASE

---

## OVERVIEW

MCP server + LSP server + 7 Agent Skills for Solidity smart contract security. TypeScript, wraps Foundry/Slither/Aderyn/Solhint CLIs, serves OWASP SCWE knowledge base (156 vulnerabilities) via MCP and LSP protocols.

## STRUCTURE

```
src/
├── index.ts           # MCP entry (wiring only, <=5 lines)
├── core/              # Pure analysis logic (CLI wrappers, parsers)
├── mcp/               # MCP server: 10 tools, 12 resources, 7 prompts
├── lsp/               # LSP server (diagnostics, hover, code actions)
├── knowledge/         # OWASP data parsers, vulnerability patterns, style rules
└── __tests__/         # Mirrors src/ structure
skills/                # 7 Agent Skills (agentskills.io spec)
bin/                   # CLI entry points (cli.ts, lsp.ts)
data/owasp-scs/        # Git submodule — READ ONLY
```

**Import DAG** (strict, never violate):

```
knowledge/  → (no internal deps)
core/       → knowledge/
mcp/        → core/, knowledge/
lsp/        → core/, knowledge/
```

`core/` NEVER imports from `mcp/` or `lsp/`. `mcp/` NEVER imports from `lsp/` or vice versa.

## CODE STYLE

- **Formatting** (`.prettierrc`): Double quotes, trailing commas, 2-space indent, 100 char width, semicolons
- **Imports**: Always `.js` extension for local imports (NodeNext). Use `import type` for type-only imports.
- **Naming**: `camelCase` functions/vars, `PascalCase` types/interfaces, `UPPER_SNAKE_CASE` exported constants
- **Files**: Named by purpose — never `utils.ts`, `helpers.ts`, `common.ts`
- **Exports**: Named exports only. No default exports.
- **Unused vars**: Prefix with `_`. ESLint enforces `argsIgnorePattern: "^_"`

## TYPE SAFETY

- `strict: true`, target ESNext, module NodeNext
- **NO** `as any` in source (allowed in tests only for mocks)
- **NO** `@ts-ignore` — use `@ts-expect-error` with description (tests only)
- Zod v4 for MCP tool schema validation
- Content literals use `"text" as const` for type narrowing

## ERROR HANDLING

- **MCP tools**: `isError: true` = execution failure. Absent/`false` = success (even if findings found)
- **Core functions**: Return result objects (`{ success, error?, findings }`), never throw for expected failures

## ARCHITECTURE RULES

1. `index.ts` = entry point only (re-exports + wiring, <=5 lines)
2. Every file = single responsibility; name by purpose
3. **200 LOC hard limit** on logic (exempt: static data arrays, template literals)
4. I/O separate from pure logic (CLI execution vs. output parsing)
5. Complex prompt logic split into `*-logic.ts` files

## TESTING

- **Framework**: vitest 4.x, node environment, globals enabled
- **Mocking**: CLI tools via `vi.mock("child_process")` + `vi.mocked(execSync)`
- **Conventions**: `beforeEach` → fresh McpServer + `vi.clearAllMocks()`
- Knowledge tests use real submodule data (not mocked) — `git submodule update --init` required
- Relaxed ESLint in tests: `no-unused-vars`, `ban-ts-comment`, `no-explicit-any` all off

## MCP SDK

SDK v1.26.0 — use `server.registerTool()` (NOT deprecated `server.tool()`).

```typescript
export function registerXxxTools(server: McpServer): void {
  server.registerTool(
    "tool_name",
    {
      description: "...",
      inputSchema: {
        /* zod */
      },
    },
    async (args) => ({ content: [{ type: "text" as const, text: result }] }),
  );
}
// Register in mcp/server.ts: import + call registerXxxTools(server)
```

## GIT RULES

- NEVER add `Co-authored-by` or `Signed-off-by` trailers unless user explicitly provides them
- Commit messages in English only

## VERSIONING

`pnpm version <semver>` syncs package.json + all `skills/*/SKILL.md` versions. Never bump SKILL.md manually.

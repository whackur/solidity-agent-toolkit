# PROJECT KNOWLEDGE BASE

---

## OVERVIEW

MCP server + LSP server + 6 Agent Skills for Solidity smart contract security. TypeScript, wraps Foundry/Slither/Aderyn/Solhint CLIs, serves OWASP SCWE knowledge base (156 vulnerabilities) via MCP and LSP protocols.

## STRUCTURE

```
src/
├── index.ts           # MCP entry (wiring only, <=5 lines)
├── core/              # Pure analysis logic (CLI wrappers, parsers, AST detectors)
│   └── ast-detectors/ # 8 AST detector modules (self-registering)
├── mcp/               # MCP server: 10 tools, 12 resources, 7 prompts
├── lsp/               # LSP server (diagnostics, hover, code actions)
├── knowledge/         # OWASP data parsers, vulnerability patterns, style rules
└── __tests__/         # Mirrors src/ structure
skills/                # 6 Agent Skills (agentskills.io spec)
bin/                   # CLI entry points (cli.ts, lsp.ts)
data/owasp-scs/        # Git submodule — READ ONLY

**Import DAG** (strict, never violate):

```

knowledge/ → (no internal deps)
core/ → knowledge/
mcp/ → core/, knowledge/
lsp/ → core/, knowledge/

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

Modular architecture is a BLOCKING policy — when you touch a file that violates these, refactor FIRST, then continue your task.

1. **`index.ts` = entry point ONLY** — re-exports + factory/wiring calls (e.g. `registerXxxTools(server)`). NEVER business logic, helper functions, type definitions beyond re-exports, or handler bodies.
2. **No catch-all files** — `utils.ts`, `helpers.ts`, `common.ts` are BANNED as top-level grab-bags. Name every file by its single purpose (`tool-checker.ts`, `json-parser.ts` — never `utils.ts`).
3. **Single Responsibility** — every `.ts` file has ONE nameable purpose. Self-test: if you can't describe it in one short phrase, split it. Split when a file has 2+ unrelated exports, mixes I/O with pure logic, or mixes types with implementation.
4. **300 LOC hard limit** on logic. Count: imports, declarations, control flow, expressions, returns. Exclude: blank lines, comments, static data arrays (e.g. `VULNERABILITY_PATTERNS`), and prompt template literals. When in doubt, round up and split.
5. I/O separate from pure logic (CLI execution vs. output parsing).
6. Complex prompt logic split into `*-logic.ts` files.

## VULNERABILITY DETECTION ARCHITECTURE

Two-layer detection: AST detectors (primary) + regex patterns (fallback).

```

matchPatterns(code, checkIds?)
→ parseSolidity(code) # @solidity-parser/parser + LRU cache
→ runASTDetectors(ast, code) # 8 detectors, 22 SCWE IDs
→ regex fallback (uncovered IDs) # 32 patterns, ~10 SCWE IDs not in AST
→ filterByASTContext() # Phase 2 supplementary FP filter
→ dedup + sort → PatternMatch[]

````

**AST detectors** (`src/core/ast-detectors/`): Self-register via `registerDetector()` on import. Barrel import `index.ts` triggers all registrations. Each detector is a pure function: `(ast, code) → DetectorResult[]`.

**Regex fallback** (`src/knowledge/vulnerability-patterns.ts`): 32 regex patterns. Only runs for SCWE IDs NOT covered by AST detectors. On AST parse failure, all regex patterns run.

**Key rule**: AST detectors MUST NOT import from `mcp/` or `lsp/`. They import only from `ast-detector-registry.ts`, `ast-validators.ts`, and `ast-utils.ts`.
## TESTING

- **Framework**: vitest 4.x, node environment, globals enabled
- **Mocking**: CLI tools via `vi.mock("child_process")` + `vi.mocked(execSync)`
- **Conventions**: `beforeEach` → fresh McpServer + `vi.clearAllMocks()`
- Knowledge tests use real submodule data (not mocked) — `git submodule update --init` required
- Relaxed ESLint in tests: `no-unused-vars`, `ban-ts-comment`, `no-explicit-any` all off

## MCP SDK

SDK v1.29.0 — use `server.registerTool()` (NOT deprecated `server.tool()`).

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
````

## GIT RULES

- NEVER add `Co-authored-by` or `Signed-off-by` trailers unless user explicitly provides them
- Commit messages in English only

## VERSIONING

`pnpm version <semver>` syncs package.json + all `skills/*/SKILL.md` versions. Never bump SKILL.md manually.

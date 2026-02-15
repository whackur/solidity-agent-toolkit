# PROJECT KNOWLEDGE BASE

## OVERVIEW

MCP server + LSP server + Agent Skills providing Solidity smart contract security tools for AI agents and editors. TypeScript + `@modelcontextprotocol/sdk@1.26.0` + `vscode-languageserver@9.0.1` + `zod@4.3.6`. Wraps Foundry/Slither/Aderyn/Solhint CLIs, serves OWASP SCWE knowledge base (156 vulnerabilities) and adversarial attack scenarios via MCP and LSP protocols, and ships 7 Agent Skills (agentskills.io spec).

## COMMANDS

```bash
pnpm test                                         # vitest run (~496 tests)
pnpm test -- src/__tests__/tools/slither.test.ts   # single test file
pnpm test -- -t "maps reentrancy"                  # single test by name pattern
pnpm test:watch                                    # vitest watch mode
pnpm typecheck                                     # tsc --noEmit
pnpm build                                         # tsc → dist/
pnpm lint                                          # eslint src/
pnpm lint:fix                                      # eslint --fix
pnpm format                                        # prettier --write .
pnpm format:check                                  # prettier --check .
pnpm dev                                           # MCP server (stdio)
pnpm lsp                                           # LSP server (stdio)
```

**Prerequisites**: `git submodule update --init` before running/testing. pnpm 10.29.3 exclusively.

## STRUCTURE

```
src/
├── index.ts           # MCP entry (≤5 lines, wiring only)
├── core/              # Pure analysis logic (CLI wrappers, parsers)
├── mcp/               # MCP server (tools/, resources/, prompts/)
├── lsp/               # LSP server (diagnostics, hover, code actions)
├── knowledge/         # OWASP data parsers, vulnerability patterns, style rules
└── __tests__/         # Mirrors src/ structure
skills/                # 7 Agent Skills (agentskills.io spec, SKILL.md files)
bin/                   # CLI entry points (cli.ts, lsp.ts)
data/owasp-scs/        # Git submodule — READ ONLY, never modify
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

**Formatting** (`.prettierrc`): Double quotes, trailing commas, 2-space indent, 100 char width, semicolons.

**Imports**: Always `.js` extension for local imports (NodeNext): `from "./core/compile.js"`. Use `import type` for type-only imports: `import type { McpServer } from "...";`.

**Naming**: `camelCase` for functions/variables, `PascalCase` for types/interfaces, `UPPER_SNAKE_CASE` for exported constants (`VULNERABILITY_PATTERNS`, `SLITHER_SCWE_MAPPINGS`). Files named by purpose — never `utils.ts`, `helpers.ts`, `common.ts`.

**Unused variables**: Prefix with `_` (e.g., `_unused`). ESLint enforces `argsIgnorePattern: "^_"`.

**Exports**: Named exports only. Re-export types from tool wrappers: `export type { SlitherResult } from "../../core/slither.js";`.

## ERROR HANDLING

**MCP tool returns**: `isError: true` = execution failure (tool missing, crash). `isError: false` = tool ran successfully, even if it found bugs.

```typescript
// Tool not installed → isError: true
return { content: [{ type: "text" as const, text: result.error }], isError: true };
// Tool found vulnerabilities → isError: false (tool worked correctly)
return {
  content: [{ type: "text" as const, text: formatFindings(result.findings) }],
  isError: false,
};
```

**Core functions**: Return result objects (`{ success: boolean; error?: string; findings: ... }`), never throw for expected failures.

## TYPE SAFETY

- `strict: true`, target ESNext, module NodeNext
- **NO** `as any` in source (allowed in tests only for mocks)
- **NO** `@ts-ignore` — use `@ts-expect-error` with description (tests only)
- Zod v4 for MCP tool schema validation
- Content literals use `"text" as const` for type narrowing

## ARCHITECTURE RULES

Enforced by `.sisyphus/rules/modular-code-enforcement.md` (BLOCKING):

1. `index.ts` = entry point only (re-exports + wiring, ≤5 lines)
2. Every file = single responsibility; name by purpose
3. **200 LOC hard limit** on logic per file (exempt: static data arrays, template literals)
4. I/O separate from pure logic (CLI execution vs. output parsing)
5. Complex prompt logic split into `*-logic.ts` files

## TESTING

**Framework**: vitest 4.x, node environment, globals enabled.

**Structure**: One test file per source module, mirroring `src/` structure.

**Mocking** (CLI tools via `execSync`):

```typescript
import { vi } from "vitest";
import { execSync } from "child_process";
vi.mock("child_process");
vi.mocked(execSync).mockReturnValue("mock output");
```

**MCP private access**:

```typescript
// @ts-expect-error — accessing private for testing
const prompt = server._registeredPrompts["security_audit"];
```

**Conventions**: `beforeEach` → fresh `McpServer` + `vi.clearAllMocks()`. Knowledge tests use real submodule data (not mocked). Relaxed ESLint in tests: `no-unused-vars`, `ban-ts-comment`, `no-explicit-any` all off.

## MCP SDK PATTERNS

SDK v1.26.0 — `server.tool()`, `server.resource()`, `server.prompt()`. NOT v2 API.

```typescript
// Tool registration pattern (mcp/tools/*.ts)
export function registerXxxTools(server: McpServer): void {
  server.tool(
    "tool_name",
    "description",
    {
      /* zod schema */
    },
    async (args) => {
      const result = coreFunction(args);
      return { content: [{ type: "text" as const, text: result }], isError: false };
    },
  );
}
// Register in mcp/server.ts: import + call registerXxxTools(server)
```

## WHERE TO LOOK

| Task                  | Location             | Notes                                    |
| --------------------- | -------------------- | ---------------------------------------- |
| Add analysis tool     | `src/core/`          | Pure logic, no MCP/LSP deps              |
| Add MCP tool wrapper  | `src/mcp/tools/`     | Thin wrapper importing from `core/`      |
| Add MCP resource      | `src/mcp/resources/` | `ResourceTemplate` for dynamic URIs      |
| Add MCP prompt        | `src/mcp/prompts/`   | Split logic into `*-logic.ts` if complex |
| Add LSP feature       | `src/lsp/`           | See `src/lsp/AGENTS.md`                  |
| Modify OWASP parsing  | `src/knowledge/`     | See `src/knowledge/AGENTS.md`            |
| Add tests             | `src/__tests__/`     | Mirror source structure                  |
| Register new MCP tool | `src/mcp/server.ts`  | Import + call `registerXxx(server)`      |
| Add/edit Agent Skill  | `skills/`            | See `skills/AGENTS.md`                   |

## VERSIONING

| Artifact        | Version location                            | Bump when                        |
| --------------- | ------------------------------------------- | -------------------------------- |
| MCP/LSP package | `package.json` `version`                    | Code in `src/` or `bin/` changes |
| Agent Skills    | Each `skills/*/SKILL.md` `metadata.version` | That skill's content changes     |

Independent tracks. Do NOT cross-bump.

## NOTES

- External tools (Foundry/Slither/Aderyn/Solhint) are optional; checked at runtime with graceful fallback
- OWASP parser is regex-based and fragile to upstream markdown format changes
- Two bin entries: `solidity-agent-toolkit` (MCP) and `solidity-agent-toolkit-lsp` (LSP), both stdio
- Sub-directory AGENTS.md: `src/knowledge/`, `src/__tests__/`, `src/mcp/`, `src/core/`, `skills/`

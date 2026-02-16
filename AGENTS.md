# PROJECT KNOWLEDGE BASE

## CRITICAL: PULL REQUEST TARGET BRANCH (NEVER DELETE THIS SECTION)

> **THIS SECTION MUST NEVER BE REMOVED OR MODIFIED**

### Git Workflow

```
main (deployed/published)
   ↑
develop (integration branch)
   ↑
feature branches (your work)
```

### Rules (MANDATORY)

| Rule | Description |
|------|-------------|
| **ALL PRs → `develop`** | Every pull request MUST target the `develop` branch |
| **NEVER PR → `main`** | PRs to `main` are **automatically rejected** by CI |
| **"Create a PR" = target `develop`** | When asked to create a new PR, it ALWAYS means targeting `develop` |
| **Merge commit ONLY** | Squash merge is **disabled** in this repo. Always use merge commit when merging PRs. |

### Why This Matters

- `main` = production/published npm package
- `develop` = integration branch where features are merged and tested
- Feature branches → `develop` → (after testing) → `main`
- Squash merge is disabled at the repository level — attempting it will fail

## CRITICAL: ENGLISH-ONLY POLICY (NEVER DELETE THIS SECTION)

> **THIS SECTION MUST NEVER BE REMOVED OR MODIFIED**

### All Project Communications MUST Be in English

| Context | Language Requirement |
|---------|---------------------|
| **GitHub Issues** | English ONLY |
| **Pull Requests** | English ONLY (title, description, comments) |
| **Commit Messages** | English ONLY |
| **Code Comments** | English ONLY |
| **Documentation** | English ONLY |
| **AGENTS.md files** | English ONLY |

**If you're not comfortable writing in English, use translation tools. Broken English is fine. Non-English is not acceptable.**

---

## OVERVIEW

MCP server + LSP server + Agent Skills providing Solidity smart contract security tools for AI agents and editors. TypeScript + `@modelcontextprotocol/sdk@1.26.0` + `vscode-languageserver@9.0.1` + `zod@4.3.6`. Wraps Foundry/Slither/Aderyn/Solhint CLIs, serves OWASP SCWE knowledge base (156 vulnerabilities) and adversarial attack scenarios via MCP and LSP protocols, and ships 7 Agent Skills (agentskills.io spec).

## COMMANDS

```bash
pnpm test                                         # vitest run (~636 tests, 45 files)
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
├── mcp/               # MCP server: 10 tools, 12 resources, 7 prompts
│   ├── server.ts      # createMcpServer() — all registrations
│   ├── tools/         # 11 files → 10 consolidated tools
│   ├── resources/     # 6 files → 12 resources
│   └── prompts/       # 8 files → 7 prompts
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

**Naming**: `camelCase` functions/variables, `PascalCase` types/interfaces, `UPPER_SNAKE_CASE` exported constants. Files named by purpose — never `utils.ts`, `helpers.ts`, `common.ts`.

**Unused variables**: Prefix with `_` (e.g., `_unused`). ESLint enforces `argsIgnorePattern: "^_"`.

**Exports**: Named exports only. No default exports. Re-export types from tool wrappers.

## ERROR HANDLING

**MCP tool returns**: `isError: true` = execution failure (tool missing, crash). `isError: false` or absent = tool ran successfully, even if it found bugs.

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

Consolidated tools use enum/optional params to combine related operations:

```typescript
// Example: mode enum merges two tools into one
const schema = z.object({
  mode: z.enum(["snapshot", "report"]),
  compare: z.boolean().optional(),
});
```

## WHERE TO LOOK

| Task                  | Location             | Notes                                    |
| --------------------- | -------------------- | ---------------------------------------- |
| Add analysis tool     | `src/core/`          | Pure logic, no MCP/LSP deps              |
| Add MCP tool wrapper  | `src/mcp/tools/`     | Thin wrapper importing from `core/`      |
| Add MCP resource      | `src/mcp/resources/` | `registerResource` or `ResourceTemplate` |
| Add MCP prompt        | `src/mcp/prompts/`   | Split logic into `*-logic.ts` if complex |
| Add LSP feature       | `src/lsp/`           | See `src/lsp/AGENTS.md`                  |
| Modify OWASP parsing  | `src/knowledge/`     | See `src/knowledge/AGENTS.md`            |
| Add tests             | `src/__tests__/`     | Mirror source structure                  |
| Register new MCP tool | `src/mcp/server.ts`  | Import + call `registerXxx(server)`      |
| Add/edit Agent Skill  | `skills/`            | See `skills/AGENTS.md`                   |

## VERSIONING

Package and skill versions are **synced** — a single `pnpm version <semver>` bumps both. The `version` lifecycle hook runs `scripts/sync-skill-versions.mjs` to update every `skills/*/SKILL.md`. Do NOT bump SKILL.md versions manually.

## GIT COMMIT RULES

- **NEVER** add `Co-authored-by`, `Signed-off-by`, or any git trailers that attribute authorship to accounts not explicitly specified by the user.
- Commit messages must only reflect the actual author configured in local git config.
- If the user explicitly provides a `Co-authored-by` trailer, include it verbatim — never modify, add, or remove names/emails.

## NOTES

- External tools (Foundry/Slither/Aderyn/Solhint) are optional; checked at runtime with graceful fallback
- OWASP parser is regex-based and fragile to upstream markdown format changes
- Two bin entries: `solidity-agent-toolkit` (MCP) and `solidity-agent-toolkit-lsp` (LSP), both stdio
- Sub-directory AGENTS.md files: `src/knowledge/`, `src/__tests__/`, `src/mcp/`, `src/core/`, `src/lsp/`, `skills/`

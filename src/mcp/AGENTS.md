# src/mcp/ — MCP Server

MCP protocol layer. Thin wrappers around `core/` functions. 5 tools, 14 resources, 7 prompts.

## CONVENTIONS

- Tool files are thin wrappers: import from `../../core/xxx.js`, call `server.registerTool()`
- MCP SDK v1.29.0 — `server.registerTool()` for tools (`server.tool()` is deprecated)
- `isError: true` = tool execution failure; absent or `false` = success
- Schema uses Zod `.shape` property for inline schema extraction
- Complex prompt logic split into `*-logic.ts` files to stay under 300 LOC
- **NEVER import from `lsp/`**

## TOOL DESCRIPTION FORMAT

```
[ROLE_PHRASE]. [HOW_IT_WORKS]. [EXTERNAL_DEP if applicable].
Trigger: "[example user queries]"
NOT for: "[disambiguation]"    <- only for scan vs. knowledge lookup
```

- 150-400 chars per description
- Negative routing (`NOT for:`) only on: `run_security_scan`, `lookup_knowledge`
- `inputSchema` field descriptions provide sub-routing within consolidated tools

## STRUCTURE

- `server.ts` — `createMcpServer()` + `startMcpServer()`, all registrations
- `server-instructions.ts` — `instructions` sent on initialize; routes agents to the right guide (replaces former Agent Skills auto-triggering). Keep it in sync with the guide catalog.
- `tools/` — 5 thin registration files (`security-scan`, `contract-analysis`, `knowledge-lookup`, `code-quality`, `foundry`) plus per-domain `*-handlers.ts` and shared `tool-result.ts`
- `resources/` — 7 files, 14 resources (scwe://, sctop10://, erc://, adversarial://, slither://, solhint://, guide://)
- `prompts/` — 8 files, 7 prompts (3 have split `*-logic.ts` files)

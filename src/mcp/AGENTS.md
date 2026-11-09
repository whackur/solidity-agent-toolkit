# src/mcp/ — MCP Server

MCP protocol layer. Thin wrappers around `core/` functions. Public tools and parameters are documented in [`../../docs/api-reference.md`](../../docs/api-reference.md); this file does not maintain a duplicate tool inventory.

## CONVENTIONS

- Tool files are thin wrappers: import from `../../core/xxx.js`, call `server.registerTool()`
- Use the supported MCP SDK `server.registerTool()` API for tools (`server.tool()` is deprecated)
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
- `tools/` — thin registration files and per-domain `*-handlers.ts`; use the API reference for the public tool list and parameters
- `resources/` — 7 files, 14 resources (scwe://, sctop10://, erc://, adversarial://, slither://, solhint://, guide://)
- `prompts/` — 8 files, 7 prompts (3 have split `*-logic.ts` files)

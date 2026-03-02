# src/mcp/ — MCP Server

MCP protocol layer. Thin wrappers around `core/` functions. 10 tools, 12 resources, 7 prompts.

## CONVENTIONS

- Tool files are thin wrappers: import from `../../core/xxx.js`, call `server.registerTool()`
- MCP SDK v1.26.0 — `server.registerTool()` for tools (`server.tool()` is deprecated)
- `isError: true` = tool execution failure; absent or `false` = success
- Schema uses Zod `.shape` property for inline schema extraction
- Complex prompt logic split into `*-logic.ts` files to stay under 200 LOC
- **NEVER import from `lsp/`**

## TOOL DESCRIPTION FORMAT

```
[ROLE_PHRASE]. [HOW_IT_WORKS]. [EXTERNAL_DEP if applicable].
Trigger: "[example user queries]"
NOT for: "[disambiguation]"    <- only for 3-tool vuln cluster
```

- 150-400 chars per description
- Negative routing (`NOT for:`) only on: `run_security_scan`, `scan_vulnerability_patterns`, `search_vulnerabilities`
- `inputSchema` field descriptions provide sub-routing within consolidated tools

## STRUCTURE

- `server.ts` — `createMcpServer()` + `startMcpServer()`, all registrations
- `tools/` — 11 files, 10 tools (deploy split into deploy.ts + deploy-handlers.ts for LOC)
- `resources/` — 6 files, 12 resources (scwe://, sctop10://, erc://, adversarial://, slither://, solhint://)
- `prompts/` — 8 files, 7 prompts (3 have split `*-logic.ts` files)

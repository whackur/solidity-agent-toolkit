# src/mcp/ — MCP Server

## OVERVIEW

MCP protocol layer. Thin wrappers around `core/` functions, registered via `server.tool()`, `server.resource()`, `server.prompt()`.

## STRUCTURE

```
mcp/
├── server.ts       # createMcpServer() + startMcpServer() — all registrations
├── tools/          # One file per tool group
│   ├── slither.ts  # registerSlitherTools(server)
│   ├── solhint.ts  # registerSolhintTools(server)
│   └── ...
├── resources/      # MCP Resource providers
│   ├── scwe-resources.ts    # scwe:// URI handler
│   ├── top10-resources.ts   # sctop10:// URI handler
│   └── erc-standards.ts     # erc:// URI handler
└── prompts/        # MCP Prompt templates
    ├── security-audit.ts
    ├── code-review.ts
    └── ...
```

## CONVENTIONS

- Tool files are thin wrappers: import from `../../core/xxx.js`, call `server.tool(name, desc, schema, handler)`
- MCP SDK v1.26.0 API only (`server.tool()`, NOT `registerTool`)
- `isError: true` = tool execution failure; absent or `false` = success
- Schema uses Zod `.shape` property for inline schema extraction
- **NEVER import from `lsp/`**

# src/**tests**/ — Test Conventions

## OVERVIEW

vitest tests mirroring `src/` structure. ~390 tests, 27 files. CLI tools are mocked; knowledge layer uses real OWASP data.

## STRUCTURE

```
__tests__/
├── server.test.ts                   # Basic McpServer instantiation
├── integration/full-server.test.ts  # End-to-end with InMemoryTransport
├── tools/*.test.ts                  # One per MCP tool (imports from ../../mcp/tools/)
├── resources/*.test.ts              # One per MCP resource (imports from ../../mcp/resources/)
├── prompts/*.test.ts                # One per MCP prompt (imports from ../../mcp/prompts/)
├── knowledge/*.test.ts              # Parser tests (use real data)
└── lsp/*.test.ts                    # LSP tests (severity, diagnostics, hover, code actions)
```

## MOCKING PATTERNS

### CLI tools (execSync)

```typescript
import { vi } from "vitest";
import { execSync } from "child_process";
vi.mock("child_process");

// In test:
vi.mocked(execSync).mockReturnValue("mock output");

// Non-zero exit (tool found issues):
vi.mocked(execSync).mockImplementation(() => {
  const err = new Error("exit 1") as any;
  err.stdout = '{"findings": [...]}';
  throw err;
});
```

### MCP Server internals (private access)

```typescript
// @ts-expect-error — accessing private for testing
const prompt = server._registeredPrompts["security_audit"];
const result = await prompt.callback(args, { requestId: "1" });
```

### Integration test (Client + InMemoryTransport)

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
await client.connect(clientTransport);
const { tools } = await client.listTools();
```

## CONVENTIONS

- `beforeEach`: fresh `McpServer` + `vi.clearAllMocks()`
- Knowledge tests use **real submodule data** (not mocked) — `git submodule update --init` required
- `@ts-expect-error` allowed for private property access
- `as any` allowed for mock object construction
- Relaxed ESLint: `no-unused-vars`, `ban-ts-comment`, `no-explicit-any` all off

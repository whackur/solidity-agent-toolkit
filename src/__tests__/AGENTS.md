# src/\_\_tests\_\_/ — Test Conventions

vitest tests mirroring `src/` structure. CLI tools are mocked; knowledge layer uses real OWASP submodule data.

## MOCKING PATTERNS

### CLI tools (execSync)

```typescript
import { vi } from "vitest";
import { execSync } from "child_process";
vi.mock("child_process");
vi.mocked(execSync).mockReturnValue("mock output");

// Non-zero exit:
vi.mocked(execSync).mockImplementation(() => {
  const err = new Error("exit 1") as any;
  err.stdout = '{"findings": [...]}';
  throw err;
});
```

### Filesystem (fs)

```typescript
vi.mock("fs");
vi.mocked(existsSync).mockReturnValue(true);
vi.mocked(readFileSync).mockReturnValue('{"abi": [...]}');
```

### MCP Server mock

```typescript
mockServer = {
  registerTool: vi.fn((name: string, config: any, handler: any) => {
    registeredTools.set(name, {
      description: config.description,
      schema: config.inputSchema,
      handler,
    });
  }),
} as any;
```

### MCP Server internals (private access)

```typescript
// @ts-expect-error — accessing private for testing
const prompt = server._registeredPrompts["security_audit"];
const result = await prompt.callback(args, { requestId: "1" });
```

### Integration test

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
await server.connect(serverTransport);
await client.connect(clientTransport);
```

## CONVENTIONS

- `beforeEach`: fresh `McpServer` + `vi.clearAllMocks()`
- Knowledge tests use **real submodule data** — `git submodule update --init` required
- Knowledge parsers expose `_resetCache()` for clean state between tests
- `@ts-expect-error` allowed for private property access
- `as any` allowed for mock object construction
- Relaxed ESLint: `no-unused-vars`, `ban-ts-comment`, `no-explicit-any` all off
- All mocks defined per-file — no shared mock files or global setup

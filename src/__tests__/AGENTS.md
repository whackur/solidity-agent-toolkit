# src/\_\_tests\_\_/ — Test Conventions

## OVERVIEW

vitest tests mirroring `src/` structure. ~636 tests, 45 files. CLI tools are mocked; knowledge layer uses real OWASP submodule data.

## STRUCTURE

```
__tests__/
├── server.test.ts                    # Basic McpServer instantiation
├── integration/full-server.test.ts   # End-to-end with InMemoryTransport (10 tools, 12 resources, 7 prompts)
├── tools/                            # 18 files — one per consolidated MCP tool / core wrapper
│   ├── slither.test.ts               # run_security_scan (tool: "slither")
│   ├── aderyn.test.ts                # run_security_scan (tool: "aderyn")
│   ├── solhint.test.ts               # run_security_scan (tool: "solhint")
│   ├── compile.test.ts               # compile_contract (+ inspect: abi/bytecode/storage)
│   ├── test-runner.test.ts           # run_tests (+ testContract/testFunction)
│   ├── gas-analysis.test.ts          # analyze_gas (mode: "snapshot")
│   ├── gas-inspection.test.ts        # analyze_gas (mode: "report")
│   ├── deploy.test.ts                # manage_deployment (action: simulate/status)
│   ├── natspec.test.ts               # check_natspec (validate/generate)
│   ├── style-guide.test.ts           # check_code_style (check/fix)
│   ├── scwe-search.test.ts           # search_vulnerabilities
│   ├── vuln-pattern-matcher.test.ts  # scan_vulnerability_patterns
│   ├── adversarial.test.ts           # analyze_contract (analysis: "adversarial")
│   ├── proxy-safety.test.ts          # analyze_contract (analysis: "proxy_safety")
│   ├── erc-compliance.test.ts        # analyze_contract (analysis: "erc_compliance")
│   ├── access-control.test.ts        # analyze_contract (analysis: "access_control")
│   └── dependency-graph.test.ts      # analyze_contract (analysis: "dependencies")
├── core/                             # 5 files — shared logic tests
│   ├── tool-checker.test.ts          # CLI availability detection
│   ├── version-checker.test.ts       # npm registry version checks
│   ├── gas-snapshot.test.ts          # Gas snapshot parsing
│   ├── gas-report.test.ts            # Gas estimation + storage layout
│   └── adversarial-analysis.test.ts  # Feature → scenario mapping
├── knowledge/                        # 7 files — parser tests (real submodule data)
│   ├── scwe-parser.test.ts           # 156 SCWE entries, search, caching
│   ├── top10-parser.test.ts          # SC Top 10 entries
│   ├── top10-scwe-mappings.test.ts   # Top 10 → SCWE ID mappings
│   ├── adversarial-scenarios.test.ts # 17 attack scenarios
│   ├── contract-features.test.ts     # Feature detection patterns
│   ├── erc-interfaces.test.ts        # ERC standard definitions
│   └── proxy-patterns.test.ts        # Proxy anti-patterns
├── lsp/                              # 5 files — LSP server tests
│   ├── pattern-diagnostics.test.ts   # Regex-based real-time diagnostics
│   ├── cli-diagnostics.test.ts       # Slither/Solhint/Aderyn diagnostic parsing
│   ├── severity-mapper.test.ts       # Tool severity → LSP severity mapping
│   ├── hover-provider.test.ts        # SCWE hover content
│   └── code-actions.test.ts          # QuickFix remediation actions
├── prompts/                          # 5 files — MCP prompt template tests
│   ├── security-audit.test.ts
│   ├── code-review.test.ts
│   ├── gas-optimization.test.ts
│   ├── erc-patterns.test.ts
│   └── adversarial-analysis.test.ts
└── resources/                        # 4 files — MCP resource tests
    ├── scwe-resources.test.ts
    ├── top10-resources.test.ts
    ├── erc-standards.test.ts
    └── adversarial-resources.test.ts
```

## MOCKING PATTERNS

### CLI tools (execSync)

```typescript
import { vi } from "vitest";
import { execSync } from "child_process";
vi.mock("child_process");

// Success:
vi.mocked(execSync).mockReturnValue("mock output");

// Non-zero exit (tool found issues):
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

### MCP Server mock (tool registration)

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
- Knowledge parsers expose `_resetCache()` for clean state between tests
- `@ts-expect-error` allowed for private property access
- `as any` allowed for mock object construction
- Relaxed ESLint: `no-unused-vars`, `ban-ts-comment`, `no-explicit-any` all off
- No shared mock files or global setup — all mocks defined per-file
- No skipped tests (`test.skip` / `describe.skip`) in the codebase

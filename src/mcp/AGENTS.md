# src/mcp/ — MCP Server

## OVERVIEW

MCP protocol layer. Thin wrappers around `core/` functions, registered via `server.registerTool()`, `server.resource()`, `server.prompt()`. 10 tools, 12 resources, 7 prompts.

## STRUCTURE

```
mcp/
├── server.ts              # createMcpServer() + startMcpServer() — all registrations
├── tools/                 # One file per tool group (10 files → 10 tools)
│   ├── security-scan.ts         # registerSecurityScanTools(server) — run_security_scan (slither/aderyn/solhint)
│   ├── compile.ts               # registerCompileTools(server) — compile_contract (+ inspect abi/bytecode/storage)
│   ├── test-runner.ts           # registerTestRunnerTools(server) — run_tests (+ single test via testContract/testFunction)
│   ├── gas-analysis.ts          # registerGasTools(server) — analyze_gas (snapshot/report modes)
│   ├── deploy.ts                # registerDeployTools(server) — manage_deployment (simulate/status actions)
│   ├── deploy-handlers.ts       # Deploy handler helpers (simulate + status logic, split for LOC)
│   ├── natspec.ts               # registerNatSpecTools(server) — check_natspec (validate or generate)
│   ├── style-guide.ts           # registerStyleGuideTools(server) — check_code_style (check or fix)
│   ├── vulnerability-search.ts  # registerVulnerabilitySearchTools(server) — search_vulnerabilities (+ remediation)
│   ├── vulnerability-patterns.ts # registerVulnerabilityPatternTools(server) — scan_vulnerability_patterns (scwe/regex)
│   └── contract-analysis.ts     # registerContractAnalysisTools(server) — analyze_contract (adversarial/proxy/erc/access/deps)
├── resources/             # MCP Resource providers (6 files → 12 resources)
│   ├── scwe-resources.ts  # scwe://list, scwe://{id}, scwe://category/{category}
│   ├── top10-resources.ts # sctop10://list, sctop10://{id}
│   ├── erc-standards.ts   # erc://list, erc://{standard}
│   ├── adversarial-resources.ts  # adversarial://list, adversarial://category/{category}, adversarial://scenario/{id}
│   ├── slither-resources.ts      # slither://detectors
│   └── solhint-resources.ts      # solhint://rules
└── prompts/               # MCP Prompt templates (8 files → 7 prompts)
    ├── security-audit.ts        # security_audit prompt
    ├── security-audit-logic.ts  # security_audit generation logic (split for LOC)
    ├── code-review.ts           # code_review prompt
    ├── gas-optimization.ts      # optimize_gas prompt
    ├── erc-patterns.ts          # generate_erc prompt
    ├── erc-patterns-logic.ts    # generate_erc generation logic (split for LOC)
    ├── adversarial-analysis.ts        # adversarial_analysis prompt
    └── adversarial-analysis-logic.ts  # adversarial_analysis generation logic
```

## CONVENTIONS

- Tool files are thin wrappers: import from `../../core/xxx.js`, call `server.registerTool(name, { description, inputSchema }, handler)`
- MCP SDK v1.26.0 API — `server.registerTool()` for tools (`server.tool()` is deprecated)
- `isError: true` = tool execution failure; absent or `false` = success
- Schema uses Zod `.shape` property for inline schema extraction
- Complex prompt logic split into `*-logic.ts` files to stay under 200 LOC
- **NEVER import from `lsp/`**

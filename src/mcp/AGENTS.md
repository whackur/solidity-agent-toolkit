# src/mcp/ — MCP Server

## OVERVIEW

MCP protocol layer. Thin wrappers around `core/` functions, registered via `server.tool()`, `server.resource()`, `server.prompt()`. 24 tools, 9 resources, 7 prompts.

## STRUCTURE

```
mcp/
├── server.ts              # createMcpServer() + startMcpServer() — all registrations
├── tools/                 # One file per tool group (12 files → 24 tools)
│   ├── slither.ts         # registerSlitherTools(server) — run_slither, list_slither_detectors
│   ├── solhint.ts         # registerSolhintTools(server) — run_solhint, list_solhint_rules
│   ├── aderyn.ts          # registerAderynTools(server) — run_aderyn
│   ├── compile.ts         # registerCompileTools(server) — compile_contract, get_abi, get_bytecode
│   ├── test-runner.ts     # registerTestTools(server) — run_tests, run_single_test
│   ├── gas-analysis.ts    # registerGasTools(server) — gas_snapshot, inspect_storage, estimate_gas
│   ├── deploy.ts          # registerDeployTools(server) — dry_run_deploy, check_deployment_status
│   ├── natspec.ts         # registerNatspecTools(server) — validate_natspec, generate_natspec
│   ├── scwe-search.ts     # registerScweTools(server) — search_vulnerabilities, check_vulnerability, get_remediation
│   ├── style-guide.ts     # registerStyleTools(server) — check_style, format_code
│   ├── vuln-pattern-matcher.ts  # registerPatternTools(server) — match_vulnerability_patterns
│   └── adversarial.ts     # registerAdversarialTools(server) — analyze_adversarial_scenarios
├── resources/             # MCP Resource providers (4 files → 9 resources)
│   ├── scwe-resources.ts  # scwe://list, scwe://{id}, scwe://category/{category}
│   ├── top10-resources.ts # sctop10://list, sctop10://{id}
│   ├── erc-standards.ts   # erc://{standard}
│   └── adversarial-resources.ts  # adversarial://list, adversarial://category/{category}, adversarial://scenario/{id}
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

- Tool files are thin wrappers: import from `../../core/xxx.js`, call `server.tool(name, desc, schema, handler)`
- MCP SDK v1.26.0 API only (`server.tool()`, NOT `registerTool`)
- `isError: true` = tool execution failure; absent or `false` = success
- Schema uses Zod `.shape` property for inline schema extraction
- Complex prompt logic split into `*-logic.ts` files to stay under 200 LOC
- **NEVER import from `lsp/`**

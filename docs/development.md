# Development

## Prerequisites

| Tool                                            | Required For                                | Install                                                     |
| ----------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| [Node.js](https://nodejs.org/) 22+              | Runtime                                     | [nodejs.org](https://nodejs.org/)                           |
| [pnpm](https://pnpm.io/) 10.x                   | Package manager                             | `npm install -g pnpm`                                       |
| [Foundry](https://book.getfoundry.sh/)          | Compilation, testing, gas, deployment tools | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| [Slither](https://github.com/crytic/slither)    | `run_security_scan` (tool: slither)         | `pip3 install slither-analyzer`                             |
| [Aderyn](https://github.com/Cyfrin/aderyn)      | `run_security_scan` (tool: aderyn)          | `brew install cyfrin/tap/aderyn`                            |
| [Solhint](https://github.com/protofire/solhint) | `run_security_scan` (tool: solhint)         | `pnpm add -g solhint`                                       |

Foundry, Slither, Aderyn, and Solhint are **optional** — features that don't require them (pattern matching, SCWE search, NatSpec validation, style checking, all resources, and all prompts) work out of the box.

## Setup

```bash
git clone https://github.com/whackur/solidity-agent-toolkit.git
cd solidity-agent-toolkit
git submodule update --init
pnpm install
```

## Commands

```bash
pnpm build            # Compile TypeScript (tsc -> dist/)
pnpm dev              # Start MCP server (stdio)
pnpm lsp              # Start LSP server (stdio)
pnpm test             # Run tests (vitest)
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage
pnpm typecheck        # Type-check without emitting (tsc --noEmit)
pnpm lint             # ESLint
pnpm lint:fix         # ESLint with auto-fix
pnpm format           # Prettier format
pnpm format:check     # Prettier check
pnpm fix              # ESLint fix + Prettier format (combined)
```

## Architecture

```
src/
├── index.ts           # MCP entry point (≤5 lines, wiring only)
├── core/              # Shared analysis logic (CLI wrappers, parsers, AST detectors) — 41 files
│   ├── ast-parse.ts      # Solidity parser with LRU cache
│   ├── ast-validators.ts # 12 pure AST validator predicates
│   ├── ast-context-filter.ts # Phase 2 FP reduction via AST context
│   ├── ast-detector-registry.ts # Detector interface + registry
│   ├── ast-utils.ts      # Shared AST utilities (CEI analysis, call detection)
│   ├── ast-detectors/    # 8 self-registering detector modules (22 SCWE IDs)
│   ├── pattern-matcher.ts # Detection orchestrator (AST-first, regex fallback)
│   └── ...               # CLI wrappers, formatters, pure analysis
├── mcp/               # MCP server: 10 tools, 12 resources, 7 prompts
│   ├── server.ts      # createMcpServer() — all registrations
│   ├── tools/         # 11 files → 10 consolidated tools
│   ├── resources/     # 6 files → 12 resources
│   └── prompts/       # 8 files → 7 prompts
├── lsp/               # LSP server (diagnostics, hover, code actions)
│   ├── server.ts      # LSP connection + capabilities
│   ├── diagnostics.ts # Diagnostic aggregator (AST + pattern + CLI)
│   └── ...            # hover, code actions, severity mapping
├── knowledge/         # OWASP data parsers, vulnerability patterns, style rules — 12 files
└── __tests__/         # Test files (mirrors src/ structure) — 49 files

skills/                # 7 Agent Skills (agentskills.io spec)
bin/                   # CLI entry points (MCP + LSP)
data/owasp-scs/        # Git submodule — OWASP SCS docs (read-only)
```

### Import Rules

```
knowledge/  ->  (no internal deps)
core/       ->  knowledge/ only
mcp/        ->  core/ + knowledge/
lsp/        ->  core/ + knowledge/
```

`core/` must never import from `mcp/` or `lsp/`. `mcp/` and `lsp/` must never import from each other.

## Testing

```bash
pnpm test                                         # Run all tests (~725 tests, 48 files)
pnpm test -- src/__tests__/tools/slither.test.ts   # Run a single test file
pnpm test -- -t "maps reentrancy"                  # Run tests matching name pattern
pnpm test:watch                                    # Watch mode
pnpm test:coverage                                 # Generate coverage report
```

Test files live in `src/__tests__/` and mirror the source structure.

# Development

## Prerequisites

| Tool | Required For | Install |
|------|-------------|---------|
| [Node.js](https://nodejs.org/) 18+ | Runtime | [nodejs.org](https://nodejs.org/) |
| [pnpm](https://pnpm.io/) 10.x | Package manager | `npm install -g pnpm` |
| [Foundry](https://book.getfoundry.sh/) | Compilation, testing, gas, deployment tools | `curl -L https://foundry.paradigm.xyz \| bash && foundryup` |
| [Slither](https://github.com/crytic/slither) | `run_slither`, `list_slither_detectors` | `pip3 install slither-analyzer` |
| [Aderyn](https://github.com/Cyfrin/aderyn) | `run_aderyn` | `brew install cyfrin/tap/aderyn` |
| [Solhint](https://github.com/protofire/solhint) | `run_solhint`, `list_solhint_rules` | `pnpm add -g solhint` |

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
├── index.ts           # MCP entry point (facade)
├── core/              # Shared analysis logic (CLI wrappers, parsers)
├── mcp/               # MCP server (tools, resources, prompts)
│   ├── server.ts      # Server creation + registration
│   ├── tools/         # MCP tool wrappers (thin, import from core/)
│   ├── resources/     # Resource providers (scwe://, sctop10://, erc://)
│   └── prompts/       # Prompt templates
├── lsp/               # LSP server (diagnostics, hover, code actions)
│   ├── server.ts      # LSP connection + capabilities
│   ├── diagnostics.ts # Diagnostic aggregator
│   └── ...
├── knowledge/         # OWASP data parsers + vulnerability patterns
└── __tests__/         # Test files (mirrors src/ structure)

skills/                # Agent Skills (agentskills.io spec)
bin/                   # CLI entry points (MCP + LSP)
data/owasp-scs/        # Git submodule — OWASP SCS docs
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
pnpm test                    # Run all tests (~390 tests)
pnpm test -- --grep "slither"  # Run tests matching pattern
pnpm test:coverage           # Generate coverage report
```

Test files live in `src/__tests__/` and mirror the source structure.

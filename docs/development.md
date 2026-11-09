# Development

## Prerequisites

| Tool                                            | Required For                                | Install                                                     |
| ----------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------- |
| [Node.js](https://nodejs.org/) 24+              | Runtime                                     | [nodejs.org](https://nodejs.org/)                           |
| [pnpm](https://pnpm.io/) 11.28.8                | Package manager                             | `npm install -g pnpm@11.28.8`                               |
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

TypeScript 7 is installed as `@typescript/native` and provides `tsc` for `pnpm typecheck` and `pnpm build`. The `typescript` alias points to the official TypeScript 6 compatibility package, keeping its compiler API available to `typescript-eslint`; its compiler is also available as `pnpm exec tsc6`.

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
├── mcp/               # MCP server: 6 tools, 14 resources, 7 prompts
│   ├── server.ts      # createMcpServer() — all registrations
│   ├── tools/         # 6 tool registrations + per-domain handler files
│   ├── resources/     # 7 files → 14 resources
│   └── prompts/       # 8 files → 7 prompts
├── lsp/               # LSP server (diagnostics, hover, code actions)
│   ├── server.ts      # LSP connection + capabilities
│   ├── diagnostics.ts # Diagnostic aggregator (AST + pattern + CLI)
│   └── ...            # hover, code actions, severity mapping
├── knowledge/         # OWASP data parsers, vulnerability patterns, style rules — 12 files
└── __tests__/         # Test files (mirrors src/ structure) — 49 files

guides/                # Methodology guides served by lookup_knowledge / guide://{topic}
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

## Release

The `v*` tag workflow first verifies that the tag matches the root package version and points at the push event commit, then runs the test suite, typecheck, lint, and build. It packs once with lifecycle scripts disabled, installs that exact archive in an isolated temporary consumer, and smoke-tests the published MCP (including diagram generation), LSP, and `sol2uml-light` commands. The archive and its SHA-512 integrity are uploaded as an immutable artifact named for the workflow run and attempt; separate jobs publish those exact bytes to npm and create or recover the GitHub Release with the tested `.tgz` attached.

Before the first publish, configure `solidity-agent-toolkit` on npm with a GitHub Actions trusted publisher for owner `whackur`, repository `solidity-agent-toolkit`, workflow `release.yml`, and environment `release`, and allow direct publishing. The publish job uses OIDC and requires no npm token secret. Stable versions use the `latest` dist-tag and prereleases use `next`. It refuses to replace a published version with different bytes and refuses a new version lower than npm's current stable `latest`; after publishing, it waits up to 20 minutes for npm's registry to expose the same integrity before allowing the GitHub Release job to run.

If a workflow fails after verification, rerun failed jobs so they consume the already verified artifact for that run attempt. Rerunning all jobs creates a new attempt artifact and rebuilds the archive; the publish job proceeds only if its integrity matches any version already on npm. After a registry visibility timeout, wait until npm exposes the version before rerunning the publish job; it skips publishing only after the exact registry integrity matches the tested archive. The GitHub Release job is also idempotent: it uploads a missing tested asset, accepts an existing identical asset, and fails if the release already has different bytes under that filename. Older versions are created without marking them as the latest release.

For a patch release, update and commit the root `package.json` version, then create and push its matching tag (for example, `git tag v0.9.4` and `git push origin v0.9.4`).

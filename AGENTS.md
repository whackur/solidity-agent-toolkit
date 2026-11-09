# Solidity Agent Toolkit Agent Guide

> `CLAUDE.md` is a symlink to this file; edit `AGENTS.md` only. Read an untracked `AGENTS.local.md` when present; keep checkout-specific access and machine facts there.

## Scope and sources of truth

Keep this guide at or below 200 physical lines and limited to durable safety, architecture, compatibility, and verification rules. Keep tracked source, tests, and documentation in English; write each Markdown prose paragraph and list item on one physical line. Put scope-specific rules in the nearest `AGENTS.md` and long-lived design or runbooks in `docs/`.

- Public MCP tools, resources, prompts, and parameters: [`docs/api-reference.md`](docs/api-reference.md).
- Development setup, commands, architecture, and testing: [`docs/development.md`](docs/development.md).
- User installation and runtime requirements: [`docs/installation.md`](docs/installation.md).

Update the relevant documentation when a change affects a public API, CLI, configuration, or user workflow. Read the nearest scoped `AGENTS.md` before changing a covered area.

## Architecture and compatibility

- Keep the import DAG: `knowledge/` has no internal dependencies; `core/` may import `knowledge/`; `mcp/` and `lsp/` may import `core/` and `knowledge/`, but never each other. `core/` must not import from `mcp/` or `lsp/`.
- AST detectors are pure functions; their project-local imports are limited to `ast-detector-registry.ts`, `ast-validators.ts`, and `ast-utils.ts`, and they must not import from `mcp/` or `lsp/`.
- Keep `index.ts` files limited to re-exports and wiring. `src/index.ts` is wiring only and stays at five lines or fewer.
- Give each source file one clear responsibility; avoid generic grab-bag names such as `utils.ts`, `helpers.ts`, or `common.ts`. Keep logic files within 300 logical lines, excluding blank lines, comments, static data arrays, and prompt templates; split mixed I/O and pure logic, and separate types from implementation when they have mixed responsibilities.
- If a touched file violates these architecture rules, refactor it first, then continue the requested change.
- Preserve the public MCP, LSP, CLI, configuration, and package contracts unless the request explicitly changes them. When a contract changes, update all affected package surfaces and documentation together.
- Keep `data/owasp-scs/` read-only; it is a Git submodule. Do not commit edits to its contents.

## TypeScript and MCP

- Keep TypeScript strict and use the configured NodeNext module behavior in the toolkit root; narrower package guides override root defaults. Use `.js` extensions for local imports, `import type` for type-only imports, and named exports.
- Follow `.prettierrc` and ESLint for formatting and lint rules. Use `PascalCase` for types, `UPPER_SNAKE_CASE` for exported constants, and prefix intentionally unused arguments with `_`.
- Do not introduce `any`, use `as any`, or use `@ts-ignore` in source. Tests may use `any` for mocks; use a described `@ts-expect-error` only when a test needs an intentional type error.
- Use the supported MCP SDK `server.registerTool()` API. For MCP tool results, `isError: true` means execution failed; absent or `false` means success, including when findings are returned. Expected core failures should use result objects rather than thrown exceptions.
- Use `"text" as const` for MCP content literals when needed for type narrowing.
- Do not log credentials, tokens, private endpoints, or connection strings. Add controls only for a concrete security or authority risk, preserve required protections, avoid unnecessary user steps, and explain failures in clear user-facing language.

## Development and verification

- Use `pnpm` for repository scripts. Launch package JavaScript binaries with `process.execPath` for cross-platform behavior.
- When changing bundled CLI execution or artifact-return contracts, verify an actual MCP tool call from an installed package archive.
- Select verification for the changed surface. Prose-only documentation or guide edits need focused Markdown, link, and content checks; they do not need the full runtime suite. For source changes, run the focused checks that cover the changed behavior and run the integrated suite once; repeat only when new evidence justifies it.
- Knowledge tests use real OWASP submodule data rather than mocks; initialize it with `git submodule update --init` before running those tests.
- Do not run concurrent installs or builds that write to the same output directory in one checkout. Report commands and results accurately; do not describe skipped checks as passing.
- Do not change package versions or make a release bump without an explicit release request.
- Use English commit messages and do not add `Co-authored-by` or `Signed-off-by` trailers unless the user explicitly supplies them.

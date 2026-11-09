# Solidity and Repository Architecture Diagrams

## Choose the diagram scope

- For a Solidity repository or contract architecture/composition request, default to a generated `sol2uml-light` class diagram from the requested Solidity source roots, even when the user does not say "UML".
- For inheritance, interface, library, struct, enum, or contract relationship diagrams, use the standalone `sol2uml-light` CLI.
- If the user explicitly asks for the whole repository, directory structure, services, APIs, or off-chain architecture, inspect the relevant repository files and draw a Mermaid system diagram; include a generated `sol2uml-light` diagram as a supplement when Solidity relationships are relevant.
- Keep the scopes clear: `sol2uml-light` parses Solidity source and does not explain off-chain services or the whole repository architecture.

## Generate Solidity UML with the CLI

When local shell access is available, inspect the requested source roots, run the bundled `sol2uml-light` CLI, and verify the output file exists and is non-empty. For Solidity repository architecture/composition requests, do not replace this step with a hand-authored SVG or Mermaid diagram; SVG is a supported CLI output format.

For an installed package or repository checkout, select an explicit Solidity source root and output path:

```bash
mkdir -p ./artifacts
npx --yes --package=solidity-agent-toolkit sol2uml-light class ./contracts --outputFormat svg --outputFileName ./artifacts/contracts.svg
```

Use `--outputFormat png` and a `.png` output path when PNG is requested. `svg` is the default format. The `class` command accepts a Solidity file, folder, or comma-separated file/folder list; a folder is searched recursively for `.sol` files by default. Use `--subfolders <number>` only when the requested scope needs a recursion-depth limit, and choose the input root to avoid including unrelated contracts.

The CLI is standalone, and this MCP server does not expose a tool to execute it. If the client has no local shell access, use `analyze_contract` with `analysis: "dependencies"` only for Solidity source supplied in the conversation, then present a Mermaid fallback and state that no CLI artifact was generated. Do not recursively scan a repository or imply that the fallback covers source that was not supplied.

After successful generation, report the actual CLI command and verified artifact path. `sol2uml-light` does not use the Solidity compiler, so parsed UML can differ from compiler semantics; its CLI help documents fixed-size arrays declared with expressions as one sizing limitation. Report CLI failures clearly and do not claim an artifact was generated unless the output file was verified.

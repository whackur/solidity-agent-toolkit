# Solidity and Repository Architecture Diagrams

## Choose the diagram scope

- For a Solidity repository or contract architecture/composition request, call the `generate_diagram` MCP tool by default, even when the user does not say "UML".
- Use the `detailed` view for inheritance, interface, library, struct, enum, and member relationships that need class details.
- Use the `storage` view when the user asks about storage slots or layout; provide the target `contractName`.
- If the user explicitly asks for the whole repository, directory structure, services, APIs, or off-chain architecture, inspect the relevant repository files and draw a Mermaid system diagram; add generated `generate_diagram` output when Solidity relationships are relevant.
- Keep the scopes clear: generated diagrams parse Solidity source and do not explain off-chain services or the whole repository architecture.

## Generate a Solidity diagram with MCP

Load this guide, inspect the requested Solidity source root, then call `generate_diagram`. The tool reads files from the MCP server's filesystem; the path must be accessible to the server process, which may run in a different machine or container from the agent client.

The default view is `overview`, which hides member details and clusters contracts by source folder while retaining the high-level contract relationships and source labels. For example:

```json
{
  "name": "generate_diagram",
  "arguments": { "path": "./contracts", "view": "overview", "format": "svg" }
}
```

Choose `view: "detailed"` to include contract members. Choose `view: "storage"` with a `contractName` for the local storage layout:

```json
{
  "name": "generate_diagram",
  "arguments": {
    "path": "./contracts/Vault.sol",
    "view": "storage",
    "contractName": "Vault",
    "format": "svg"
  }
}
```

`format` defaults to `svg`; use `png` when requested. The tool returns the diagram as an embedded SVG resource or PNG image, so no client shell is needed. If a persistent server-side file is useful, include `outputPath`; missing parent directories are created and existing files or symlinks are never overwritten. Without `outputPath`, temporary output is removed after the artifact is returned. The tool accepts one local `.sol` file or directory, runs for up to 60 seconds, and rejects artifacts larger than 5 MiB. Report inaccessible paths, missing contract names, CLI failures, and other generation errors clearly; do not claim a diagram was created after an error.

### Storage layout limits

The `storage` view parses source and does not use the Solidity compiler, so its output can differ from compiler layout. Fixed-size arrays declared with expressions may fail to be sized. Long fixed arrays show the first and last two slots by default. Offline output shows layout only; it does not include mapping values or dynamic-array lengths. When the chosen folder contains duplicate contract names, select a narrower file or directory so the intended `contractName` is unique.

## Use the standalone CLI

The package also ships the standalone `sol2uml-light` binary for direct CLI use. For an installed package or repository checkout, select an explicit Solidity source root and output path:

```bash
mkdir -p ./artifacts
npx --yes --package=solidity-agent-toolkit sol2uml-light class ./contracts --outputFormat svg --outputFileName ./artifacts/contracts.svg
```

The class command accepts a Solidity file or directory; directories are searched recursively for `.sol` files by default. The MCP tool accepts one path and does not expose arbitrary CLI flags. The CLI does accept comma-separated paths and other CLI-only options.

## Mermaid and wider repository architecture

`analyze_contract` with `analysis: "dependencies"` returns a Mermaid relationship graph only for Solidity source supplied in the conversation. Use it as a limited fallback when no server-local Solidity path is available, and state that no SVG or PNG artifact was generated. Do not recursively scan a repository to produce this supplied-source fallback.

When the user explicitly asks for a whole-repository or off-chain system map, inspect relevant files and draw Mermaid for directories, services, APIs, and relationships. Supplement it with the generated Solidity diagram when appropriate.

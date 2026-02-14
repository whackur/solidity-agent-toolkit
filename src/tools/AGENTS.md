# src/tools/ — CLI Tool Wrappers

## OVERVIEW

Each file wraps one external CLI tool (Foundry, Slither, Aderyn, Solhint) as MCP tools. Pure CLI subprocess calls — no library imports from wrapped tools.

## CANONICAL PATTERN

Every tool file follows this exact structure:

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";

// 1. Zod schemas (top of file)
const MySchema = z.object({ path: z.string().optional() });

// 2. Installation check
function checkMyToolInstalled(): boolean {
  try {
    execSync("mytool --version", { stdio: "ignore" });
    return true;
  } catch { return false; }
}

// 3. Single exported registration function
export function registerMyTools(server: McpServer): void {
  server.tool("run_mytool", "Description", MySchema, async ({ path }) => {
    if (!checkMyToolInstalled()) {
      return { content: [{ type: "text", text: "Install: ..." }], isError: true };
    }
    // ... execute and format
    return { content: [{ type: "text", text: formatted }] };
  });
}
```

## execSync OPTIONS

Always use: `{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"], maxBuffer: 10 * 1024 * 1024 }`

Many security tools exit non-zero when they find issues. Capture `error.stdout`:
```typescript
try { output = execSync(cmd, opts); }
catch (error: any) { output = error.stdout || ""; if (!output) throw error; }
```

## isError SEMANTICS (CRITICAL)

| Situation | isError | Why |
|-----------|---------|-----|
| Tool not installed | `true` | Environment failure |
| CLI crashed / invalid args | `true` | Execution failure |
| Compilation errors found | `false` | Tool ran, found problems |
| Test failures found | `false` | Tool ran, found problems |
| Lint violations found | `false` | Tool ran, found problems |
| Zero findings | `false` | Success |

## WHERE TO LOOK

| Tool | File | CLI |
|------|------|-----|
| Compile | `compile.ts` | `forge build --json` |
| Test runner | `test-runner.ts` | `forge test --json` |
| Gas analysis | `gas-analysis.ts` | `forge snapshot`, `forge inspect` |
| Deploy dry-run | `deploy.ts` | `forge script` (NEVER --broadcast) |
| Slither | `slither.ts` | `slither . --json -` |
| Aderyn | `aderyn.ts` | `aderyn --output json` |
| Solhint | `solhint.ts` | `solhint -f json` |
| Style check | `style-guide.ts` | Pure logic (no CLI) |
| NatSpec | `natspec.ts` | Pure logic (no CLI) |
| SCWE search | `scwe-search.ts` | Pure logic (knowledge layer) |
| Pattern match | `vuln-pattern-matcher.ts` | Pure logic (regex) |

## ANTI-PATTERNS

- **NEVER bundle CLI binaries** — users install separately (AGPL/GPL safe via mere aggregation)
- **NEVER `--broadcast`** in deploy tools — dry-run only, safety critical
- **NEVER mix registration with heavy parsing** — extract to `*-logic.ts` if >200 LOC
- Output is always **Markdown-formatted text** in `content[0].text`

# src/prompts/ — MCP Prompt Templates

## OVERVIEW

Prompt templates that inject OWASP knowledge + checklists into LLM conversations. No LLM calls — templates only.

## PATTERN

```typescript
// Registration file: security-audit.ts
export function registerSecurityAuditPrompts(server: McpServer): void {
  server.prompt("security_audit", "...", schema, async (args) => {
    return { messages: [{ role: "user", content: { type: "text", text: buildPrompt(args) } }] };
  });
}

// Logic file (if complex): security-audit-logic.ts
export function buildAuditPrompt(code: string, level: string): string { ... }
```

**Split rule**: If prompt building logic > ~50 lines, extract to `*-logic.ts`.

## FILES

| File | Prompts | Notes |
|------|---------|-------|
| `security-audit.ts` | `security_audit`, `vulnerability_fix` | Uses knowledge layer (Top10 + SCWE) |
| `security-audit-logic.ts` | — | Prompt building helpers |
| `code-review.ts` | `code_review`, `best_practices_check` | Focus: security/gas/style/all |
| `erc-patterns.ts` | `generate_erc` | ERC20/721/1155/4626 |
| `erc-patterns-logic.ts` | — | ERC standard data + security guidance |
| `gas-optimization.ts` | `optimize_gas` | 10 gas optimization categories |

## CONVENTIONS

- Return `{ messages: [{ role: "user", content: { type: "text", text } }] }` — always user role
- Template text in template literals is **exempt** from 200 LOC limit
- Import knowledge from `../knowledge/` — never duplicate OWASP data

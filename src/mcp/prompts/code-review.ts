import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

function buildReviewPrompt(code: string, focus: "security" | "gas" | "style" | "all"): string {
  const sections: string[] = [];

  if (focus === "security" || focus === "all") {
    sections.push(`
### Security Review Checklist (OWASP Top 10 & Common Patterns)
- **Reentrancy**: Check for external calls before state changes (Checks-Effects-Interactions pattern).
- **Access Control**: Verify that sensitive functions have appropriate modifiers (e.g., \`onlyOwner\`, \`onlyRole\`).
- **Integer Overflow/Underflow**: Ensure Solidity 0.8+ is used or SafeMath for older versions.
- **Flash Loan Attacks**: Check for price manipulation vulnerabilities in DeFi integrations.
- **Front-running**: Evaluate if transaction ordering can be exploited (e.g., sandwich attacks).
- **Denial of Service**: Look for loops that can exceed gas limits or unexpected reverts.
- **Logic Errors**: Verify that the business logic matches the intended design.
- **Unchecked Return Values**: Ensure return values of low-level calls (\`call\`, \`delegatecall\`, \`send\`, \`transfer\`) are handled.
- **Centralization Risks**: Identify privileged roles that could compromise the system.
- **Oracle Manipulation**: Check if the contract relies on easily manipulatable price feeds.`);
  }

  if (focus === "gas" || focus === "all") {
    sections.push(`
### Gas Optimization Checklist
- **Storage Packing**: Group state variables and struct members of smaller types (e.g., \`uint128\`, \`bool\`) to fit in 32-byte slots.
- **Calldata vs Memory**: Use \`calldata\` for read-only function arguments in external functions.
- **Immutable & Constant**: Use \`immutable\` for constructor-set values and \`constant\` for hardcoded values.
- **Unchecked Blocks**: Use \`unchecked { ... }\` for arithmetic that cannot overflow to save gas (Solidity 0.8+).
- **Loop Optimizations**: Avoid state variable access in loops; cache length and use prefix increments (\`++i\`).
- **Short-circuiting**: Order boolean expressions to fail fast.
- **Visibility**: Use \`external\` instead of \`public\` if the function is not called internally.
- **Uint256 vs Smaller Types**: Use \`uint256\` for general arithmetic unless packing storage.
- **Custom Errors**: Use \`error\` instead of \`require\` strings to save gas on deployment and revert.`);
  }

  if (focus === "style" || focus === "all") {
    sections.push(`
### Solidity Style Guide Checklist
- **Naming Conventions**: 
  - Contracts, Structs, Events, Enums: \`PascalCase\`
  - Functions, Variables, Modifiers: \`camelCase\`
  - Constants: \`UPPER_CASE_WITH_UNDERSCORES\`
- **Function Ordering**: constructor → receive → fallback → external → public → internal → private.
- **Modifier Ordering**: visibility → mutability → virtual → override → custom.
- **NatSpec Documentation**: Use \`///\` or \`/** ... */\` for all public/external functions.
- **Indentation**: Use 4 spaces per indentation level.
- **Import Grouping**: Group imports at the top of the file, after the pragma.`);
  }

  return `Please perform a comprehensive code review of the following Solidity smart contract. Focus on ${focus.toUpperCase()} aspects.

${sections.join("\n")}

---
**CODE TO REVIEW:**
\`\`\`solidity
${code}
\`\`\`

Provide your findings in a structured format, highlighting the issue, its severity, and a recommended fix.`;
}

function buildBestPracticesPrompt(code: string): string {
  return `Please check the following Solidity code against modern best practices (Solidity 0.8+).

### Best Practices Checklist:
- **Access Control**: Are sensitive functions protected by \`Ownable\` or \`AccessControl\`?
- **Reentrancy Guards**: Are state-changing external calls protected by \`nonReentrant\` modifiers?
- **Integer Handling**: Is the code leveraging Solidity 0.8's built-in overflow checks?
- **Event Emission**: Are important state changes (e.g., ownership transfers, parameter updates) emitting events?
- **Error Handling**: Are custom errors (\`error\`) used instead of \`require\` strings for better gas efficiency and clarity?
- **Upgradability**: If using proxies, are storage gaps and initialization patterns correctly implemented?
- **Pull over Push**: Are payments handled via a withdrawal pattern rather than direct transfers?
- **Interface Usage**: Are external contracts interacted with via well-defined interfaces?

---
**CODE TO CHECK:**
\`\`\`solidity
${code}
\`\`\`

Provide a summary of which best practices are followed and which ones need improvement.`;
}

export function registerCodeReviewPrompts(server: McpServer) {
  server.prompt(
    "code_review",
    "Generate a structured code review checklist for Solidity. " +
      "Covers security (OWASP Top 10 patterns), gas optimization, and style guide compliance. " +
      "Set 'focus' to narrow the review scope: security, gas, style, or all (default). " +
      "Use when: 'review my code', 'check my contract for issues', 'code review'.",
    {
      code: z.string().describe("The Solidity code to review"),
      focus: z
        .enum(["security", "gas", "style", "all"])
        .optional()
        .default("all")
        .describe("The focus area of the review"),
    },
    async ({ code, focus }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: buildReviewPrompt(code, focus || "all"),
            },
          },
        ],
      };
    },
  );

  server.prompt(
    "best_practices_check",
    "Generate a best practices audit for Solidity 0.8+ code. " +
      "Checks access control, reentrancy guards, event emission, error handling, upgradability, and more. " +
      "Use when: 'check best practices', 'is my code following standards?', 'modernize my contract'.",
    {
      code: z.string().describe("The Solidity code to check"),
    },
    async ({ code }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: buildBestPracticesPrompt(code),
            },
          },
        ],
      };
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { validateNatSpec, generateNatSpec, formatValidationResults } from "../../core/natspec.js";

export type { FunctionSignature, NatSpecIssue, NatSpecDoc } from "../../core/natspec.js";
export {
  parseFunctions,
  extractNatSpec,
  validateNatSpec,
  generateNatSpec,
} from "../../core/natspec.js";

export function registerNatSpecTools(server: McpServer): void {
  server.tool(
    "validate_natspec",
    "Validate NatSpec documentation in Solidity code, checking for missing @notice, @param, and @return tags",
    {
      code: z.string().describe("Solidity source code to validate"),
    },
    async ({ code }) => {
      const issues = validateNatSpec(code);
      return {
        content: [{ type: "text" as const, text: formatValidationResults(issues) }],
        isError: false,
        _meta: { readOnlyHint: true },
      };
    },
  );

  server.tool(
    "generate_natspec",
    "Generate NatSpec documentation templates for functions missing documentation",
    {
      code: z.string().describe("Solidity source code to add NatSpec to"),
    },
    async ({ code }) => {
      const result = generateNatSpec(code);
      return {
        content: [
          {
            type: "text" as const,
            text: "Generated NatSpec templates:\n\n```solidity\n" + result + "\n```",
          },
        ],
        isError: false,
        _meta: { readOnlyHint: true },
      };
    },
  );
}

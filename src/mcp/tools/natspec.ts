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
  server.registerTool(
    "check_natspec",
    {
      description:
        "Validate or generate NatSpec documentation for Solidity code. No external tools required. " +
        "Default: check for missing @dev, @param, @return tags and report issues. " +
        "Set generate=true to produce NatSpec templates for undocumented functions. " +
        "Use when: 'check documentation', 'generate NatSpec', 'add comments to my contract'.",
      inputSchema: {
        code: z.string().describe("Solidity source code to check"),
        generate: z
          .boolean()
          .optional()
          .describe("If true, generate NatSpec templates instead of validating"),
      },
    },
    async ({ code, generate }) => {
      if (generate) {
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
      }

      const issues = validateNatSpec(code);
      return {
        content: [{ type: "text" as const, text: formatValidationResults(issues) }],
        isError: false,
        _meta: { readOnlyHint: true },
      };
    },
  );
}

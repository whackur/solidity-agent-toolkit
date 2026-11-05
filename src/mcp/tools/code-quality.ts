import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { handleNatSpecCheck, handleStyleCheck } from "./code-quality-handlers.js";

export function registerCodeQualityTools(server: McpServer): void {
  server.registerTool(
    "check_code_quality",
    {
      description:
        "Check Solidity code quality. 'style': report Solidity Style Guide violations (12 rules: naming, " +
        "ordering, spacing) or auto-format with forge fmt (fix=true, requires Foundry). 'natspec': " +
        "report missing @dev/@param/@return tags or generate templates (generate=true). " +
        "Trigger: 'check code style', 'format my contract', 'check documentation', 'generate NatSpec'.",
      inputSchema: {
        check: z
          .enum(["style", "natspec"])
          .describe("style: Solidity Style Guide rules / forge fmt | natspec: NatSpec docs"),
        code: z.string().describe("Solidity source code to check"),
        fix: z
          .boolean()
          .optional()
          .describe("style only: if true, format the code using forge fmt instead of checking"),
        generate: z
          .boolean()
          .optional()
          .describe("natspec only: if true, generate NatSpec templates instead of validating"),
      },
    },
    async ({ check, code, fix, generate }) =>
      check === "style" ? handleStyleCheck(code, fix) : handleNatSpecCheck(code, generate),
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { matchPatterns, formatMatches } from "../../core/pattern-matcher.js";

export type { PatternMatch } from "../../core/pattern-matcher.js";
export { matchPatterns } from "../../core/pattern-matcher.js";

export function registerPatternMatcherTool(server: McpServer): void {
  server.tool(
    "match_vulnerability_patterns",
    "Detect vulnerability patterns in Solidity code using regex-based heuristics mapped to SCWE IDs",
    {
      code: z.string().describe("Solidity source code to analyze"),
      checkIds: z
        .array(z.string())
        .optional()
        .describe("Optional list of SCWE IDs to limit checks to"),
    },
    async ({ code, checkIds }) => {
      const matches = matchPatterns(code, checkIds);
      return {
        content: [{ type: "text" as const, text: formatMatches(matches) }],
        isError: false,
      };
    },
  );
}

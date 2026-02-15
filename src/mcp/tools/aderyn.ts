import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runAderyn } from "../../core/aderyn.js";

export type { AderynFinding } from "../../core/aderyn.js";

const RunAderynSchema = z.object({
  path: z
    .string()
    .optional()
    .describe("Path to Solidity file or directory to analyze (defaults to current directory)"),
  outputFormat: z
    .enum(["json", "markdown"])
    .optional()
    .default("json")
    .describe("Output format for results (json or markdown)"),
});

export function registerAderynTools(server: McpServer): void {
  server.tool(
    "run_aderyn",
    "Run Aderyn security analysis on Solidity code to detect vulnerabilities and security issues",
    RunAderynSchema.shape,
    async ({ path, outputFormat = "json" }) => {
      try {
        const result = runAderyn(path, outputFormat);
        return {
          content: [{ type: "text" as const, text: result.text }],
          ...(result.isError ? { isError: true } : {}),
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error running Aderyn analysis: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

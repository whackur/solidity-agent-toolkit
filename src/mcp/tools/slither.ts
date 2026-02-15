import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { runSlither, listSlitherDetectors, formatFindings } from "../../core/slither.js";

export type { SlitherFinding, SlitherResult } from "../../core/slither.js";
export { runSlither, listSlitherDetectors } from "../../core/slither.js";

export function registerSlitherTools(server: McpServer): void {
  server.tool(
    "run_slither",
    "Run Slither static analysis on Solidity contracts and map findings to SCWE IDs",
    {
      path: z.string().optional().describe("Path to Solidity project (default: current directory)"),
      detectors: z
        .array(z.string())
        .optional()
        .describe('Specific detectors to run (e.g., ["reentrancy-eth", "tx-origin"])'),
      exclude: z.array(z.string()).optional().describe("Detectors to exclude from analysis"),
      jsonOutput: z
        .boolean()
        .optional()
        .describe("Return raw JSON output instead of formatted text"),
    },
    async ({ path, detectors, exclude, jsonOutput }) => {
      const result = runSlither(path, detectors, exclude);

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: result.error || "Analysis failed" }],
          isError: true,
        };
      }

      if (jsonOutput) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.findings, null, 2),
            },
          ],
          isError: false,
        };
      }

      return {
        content: [{ type: "text" as const, text: formatFindings(result.findings) }],
        isError: false,
      };
    },
  );

  server.tool(
    "list_slither_detectors",
    "List all available Slither detectors with descriptions",
    {},
    async () => {
      const output = listSlitherDetectors();

      return {
        content: [{ type: "text" as const, text: output }],
        isError: output.includes("not installed"),
      };
    },
  );
}

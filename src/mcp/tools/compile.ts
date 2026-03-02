import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
  runCompile,
  formatCompilationResult,
} from "../../core/compile.js";
import { runForgeInspect, formatInspectResult } from "../../core/contract-inspect.js";

const CompileContractSchema = z.object({
  path: z.string().optional().describe("Path to specific contract or directory to compile"),
  contractName: z.string().optional().describe("Contract name (required for inspect modes)"),
  inspect: z
    .enum(["abi", "bytecode", "storage"])
    .optional()
    .describe(
      "Instead of compiling, inspect a compiled contract's ABI, bytecode, or storage layout",
    ),
});

export function registerCompileTools(server: McpServer): void {
  server.registerTool(
    "compile_contract",
    {
      description:
        "Compile Solidity contracts using Foundry (forge build), or inspect compiled artifacts. " +
        "Requires Foundry CLI installed. " +
        "Default: compile contracts and report errors/warnings. " +
        "Set 'inspect' to retrieve ABI, bytecode, or storage layout of a compiled contract. " +
        "Use when: 'compile my contract', 'show ABI', 'get bytecode', 'inspect storage layout'.",
      inputSchema: CompileContractSchema.shape,
    },
    async ({ path, contractName, inspect }) => {
      try {
        if (!checkForgeInstalled()) {
          return {
            content: [{ type: "text" as const, text: FORGE_INSTALL_INSTRUCTIONS }],
            isError: true,
          };
        }

        if (!isFoundryProject()) {
          return {
            content: [
              {
                type: "text" as const,
                text: "❌ **Not a Foundry Project**\n\nNo `foundry.toml` found in the current directory.\n\nTo initialize a Foundry project:\n```bash\nforge init\n```",
              },
            ],
            isError: true,
          };
        }

        // Inspect mode: ABI, bytecode, or storage layout
        if (inspect) {
          if (!contractName) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: "❌ **Missing Parameter**\n\n`contractName` is required when using inspect mode.",
                },
              ],
              isError: true,
            };
          }
          const inspectResult = runForgeInspect(contractName, inspect);
          return {
            content: [{ type: "text" as const, text: formatInspectResult(inspectResult) }],
            ...(inspectResult.success ? {} : { isError: true }),
          };
        }

        // Compile mode
        const result = runCompile(path, contractName);
        const formattedResult = formatCompilationResult(result);
        return { content: [{ type: "text" as const, text: formattedResult }] };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: `Error during compilation: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

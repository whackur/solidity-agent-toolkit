import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
  parseCompilationOutput,
  formatCompilationResult,
} from "../../core/compile.js";

const CompileContractSchema = z.object({
  path: z
    .string()
    .optional()
    .describe("Optional path to specific contract or directory to compile"),
  contractName: z.string().optional().describe("Optional specific contract name to compile"),
});

export function registerCompileTools(server: McpServer): void {
  server.tool(
    "compile_contract",
    "Compile Solidity contracts using Foundry (forge build). Returns compilation results, errors, and warnings.",
    CompileContractSchema.shape,
    async ({ path, contractName }) => {
      try {
        // Check if forge is installed
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text: FORGE_INSTALL_INSTRUCTIONS,
              },
            ],
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

        let command = "forge build --json";
        if (path) {
          command += ` ${path}`;
        }
        if (contractName) {
          command += ` --contracts ${contractName}`;
        }

        // Execute compilation
        let output: string;
        try {
          output = execSync(command, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          });
        } catch (error: unknown) {
          // forge build returns non-zero exit code on compilation errors
          // but still outputs JSON, so we capture stdout
          const execErr = error as Error & { stdout?: string; stderr?: string };
          output = execErr.stdout || "";
          if (!output) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Compilation Error**\n\n${execErr.message}\n\n${execErr.stderr || ""}`,
                },
              ],
            };
          }
        }

        // Parse and format results
        const result = parseCompilationOutput(output);
        const formattedResult = formatCompilationResult(result);

        return {
          content: [
            {
              type: "text" as const,
              text: formattedResult,
            },
          ],
        };
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

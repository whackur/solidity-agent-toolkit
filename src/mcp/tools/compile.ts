import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
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

const GetAbiSchema = z.object({
  contractName: z.string().describe('Contract name to get ABI for (e.g., "MyContract")'),
});

const GetBytecodeSchema = z.object({
  contractName: z.string().describe('Contract name to get bytecode for (e.g., "MyContract")'),
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

  server.tool(
    "get_abi",
    "Get the ABI (Application Binary Interface) for a compiled Solidity contract using forge inspect",
    GetAbiSchema.shape,
    async ({ contractName }) => {
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

        // Check if this is a Foundry project
        if (!isFoundryProject()) {
          return {
            content: [
              {
                type: "text" as const,
                text: "❌ **Not a Foundry Project**\n\nNo `foundry.toml` found in the current directory.",
              },
            ],
            isError: true,
          };
        }

        // Execute forge inspect
        const output = execSync(`forge inspect ${contractName} abi`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        });

        // Validate JSON
        try {
          const abi = JSON.parse(output);
          return {
            content: [
              {
                type: "text" as const,
                text: `**ABI for ${contractName}:**\n\n\`\`\`json\n${JSON.stringify(abi, null, 2)}\n\`\`\``,
              },
            ],
          };
        } catch {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ **Invalid ABI Output**\n\nReceived non-JSON output from forge inspect:\n\n${output}`,
              },
            ],
            isError: true,
          };
        }
      } catch (error: unknown) {
        const execErr = error as Error & { stderr?: string };
        const errorMessage = execErr.stderr || execErr.message || String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ **Error Getting ABI**\n\n${errorMessage}\n\nMake sure the contract is compiled first:\n\`\`\`bash\nforge build\n\`\`\``,
            },
          ],
          isError: true,
        };
      }
    },
  );

  server.tool(
    "get_bytecode",
    "Get the bytecode for a compiled Solidity contract using forge inspect",
    GetBytecodeSchema.shape,
    async ({ contractName }) => {
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

        // Check if this is a Foundry project
        if (!isFoundryProject()) {
          return {
            content: [
              {
                type: "text" as const,
                text: "❌ **Not a Foundry Project**\n\nNo `foundry.toml` found in the current directory.",
              },
            ],
            isError: true,
          };
        }

        // Execute forge inspect
        const output = execSync(`forge inspect ${contractName} bytecode`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "pipe"],
        }) as string | Buffer;

        const outputStr = Buffer.isBuffer(output) ? output.toString("utf-8") : output;
        const bytecode = outputStr.trim();

        // Validate bytecode format (should start with 0x)
        if (!bytecode.startsWith("0x")) {
          return {
            content: [
              {
                type: "text" as const,
                text: `❌ **Invalid Bytecode Output**\n\nReceived unexpected output from forge inspect:\n\n${bytecode}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: "text" as const,
              text: `**Bytecode for ${contractName}:**\n\n\`\`\`\n${bytecode}\n\`\`\`\n\n**Size:** ${(bytecode.length - 2) / 2} bytes`,
            },
          ],
        };
      } catch (error: unknown) {
        const execErr = error as Error & { stderr?: string };
        const errorMessage = execErr.stderr || execErr.message || String(error);
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ **Error Getting Bytecode**\n\n${errorMessage}\n\nMake sure the contract is compiled first:\n\`\`\`bash\nforge build\n\`\`\``,
            },
          ],
          isError: true,
        };
      }
    },
  );
}

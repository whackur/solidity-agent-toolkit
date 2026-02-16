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
import { parseStorageLayout, formatStorageLayout } from "../../core/gas-report.js";

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

type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
};

function handleInspect(mode: "abi" | "bytecode" | "storage", contractName: string): ToolResult {
  try {
    const output = execSync(`forge inspect ${contractName} ${mode}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (mode === "abi") {
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
    }

    if (mode === "bytecode") {
      const bytecode = output.trim();
      if (!bytecode.startsWith("0x")) {
        return {
          content: [
            {
              type: "text" as const,
              text: `❌ **Invalid Bytecode Output**\n\nReceived unexpected output:\n\n${bytecode}`,
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
    }

    // storage mode
    const slots = parseStorageLayout(output);
    const formatted = formatStorageLayout(slots, contractName);
    return { content: [{ type: "text" as const, text: formatted }] };
  } catch (error: unknown) {
    const execErr = error as Error & { stderr?: string };
    const errorMessage = execErr.stderr || execErr.message || String(error);
    return {
      content: [
        {
          type: "text" as const,
          text: `❌ **Error Inspecting ${contractName}**\n\n${errorMessage}\n\nMake sure the contract is compiled first:\n\`\`\`bash\nforge build\n\`\`\``,
        },
      ],
      isError: true,
    };
  }
}

export function registerCompileTools(server: McpServer): void {
  server.tool(
    "compile_contract",
    "Compile Solidity contracts using Foundry, or inspect a compiled contract's ABI, bytecode, " +
      "or storage layout. Set the inspect parameter to skip compilation and inspect artifacts " +
      "instead.",
    CompileContractSchema.shape,
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
          return handleInspect(inspect, contractName);
        }

        // Compile mode
        let command = "forge build --json";
        if (path) {
          command += ` ${path}`;
        }
        if (contractName) {
          command += ` --contracts ${contractName}`;
        }

        let output: string;
        try {
          output = execSync(command, {
            encoding: "utf-8",
            stdio: ["pipe", "pipe", "pipe"],
            maxBuffer: 10 * 1024 * 1024,
          });
        } catch (error: unknown) {
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

        const result = parseCompilationOutput(output);
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

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { join as _join } from "path";

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

interface CompilationError {
  severity: string;
  message: string;
  formattedMessage?: string;
  sourceLocation?: {
    file: string;
    start: number;
    end: number;
  };
}

interface CompilationResult {
  success: boolean;
  errors?: CompilationError[];
  warnings?: CompilationError[];
  contracts?: string[];
}

/**
 * Check if forge is installed on the system
 */
function checkForgeInstalled(): boolean {
  try {
    execSync("forge --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if current directory is a Foundry project
 */
function isFoundryProject(): boolean {
  return existsSync("foundry.toml");
}

/**
 * Get installation instructions for forge
 */
function getForgeInstallInstructions(): string {
  return `Forge is not installed. Please install Foundry:

**Installation:**
\`\`\`bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
\`\`\`

**Verify installation:**
\`\`\`bash
forge --version
\`\`\`

For more information, visit: https://book.getfoundry.sh/getting-started/installation`;
}

/**
 * Parse forge build JSON output
 */
function parseCompilationOutput(output: string | Buffer): CompilationResult {
  try {
    const outputStr = typeof output === "string" ? output : output.toString("utf-8");
    const lines = outputStr.trim().split("\n");
    const errors: CompilationError[] = [];
    const warnings: CompilationError[] = [];
    const contracts: Set<string> = new Set();

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const json = JSON.parse(line);

        // Handle compiler messages
        if (json.type === "diagnostic") {
          const diagnostic = json.data;
          const error: CompilationError = {
            severity: diagnostic.severity || "error",
            message: diagnostic.message || "",
            formattedMessage: diagnostic.formattedMessage,
          };

          if (diagnostic.sourceLocation) {
            error.sourceLocation = {
              file: diagnostic.sourceLocation.file || "",
              start: diagnostic.sourceLocation.start || 0,
              end: diagnostic.sourceLocation.end || 0,
            };
          }

          if (error.severity === "error") {
            errors.push(error);
          } else if (error.severity === "warning") {
            warnings.push(error);
          }
        }

        // Handle contract compilation success
        if (json.type === "contract") {
          const contractName = json.data?.name || json.contract;
          if (contractName) {
            contracts.add(contractName);
          }
        }
      } catch {
        // Skip lines that aren't valid JSON
        continue;
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      contracts: contracts.size > 0 ? Array.from(contracts) : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          severity: "error",
          message: `Failed to parse compilation output: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

/**
 * Format compilation result for display
 */
function formatCompilationResult(result: CompilationResult): string {
  let output = "";

  if (result.success) {
    output += "✅ **Compilation Successful**\n\n";

    if (result.contracts && result.contracts.length > 0) {
      output += `**Compiled Contracts:**\n`;
      for (const contract of result.contracts) {
        output += `- ${contract}\n`;
      }
      output += "\n";
    }

    if (result.warnings && result.warnings.length > 0) {
      output += `**Warnings (${result.warnings.length}):**\n`;
      for (const warning of result.warnings) {
        output += `\n⚠️  ${warning.message}\n`;
        if (warning.sourceLocation) {
          output += `   Location: ${warning.sourceLocation.file}\n`;
        }
      }
    }
  } else {
    output += "❌ **Compilation Failed**\n\n";

    if (result.errors && result.errors.length > 0) {
      output += `**Errors (${result.errors.length}):**\n`;
      for (const error of result.errors) {
        output += `\n🔴 ${error.message}\n`;
        if (error.sourceLocation) {
          output += `   Location: ${error.sourceLocation.file}\n`;
        }
        if (error.formattedMessage) {
          output += `\n${error.formattedMessage}\n`;
        }
      }
    }
  }

  return output;
}

export function registerCompileTools(server: McpServer): void {
  server.registerTool(
    "compile_contract",
    {
      description:
        "Compile Solidity contracts using Foundry (forge build). Returns compilation results, errors, and warnings.",
      inputSchema: CompileContractSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ path, contractName }) => {
      try {
        // Check if forge is installed
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text: getForgeInstallInstructions(),
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
                text: "❌ **Not a Foundry Project**\n\nNo `foundry.toml` found in the current directory.\n\nTo initialize a Foundry project:\n```bash\nforge init\n```",
              },
            ],
            isError: true,
          };
        }

        // Build forge command
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
        } catch (error: any) {
          // forge build returns non-zero exit code on compilation errors
          // but still outputs JSON, so we capture stdout
          output = error.stdout || "";
          if (!output) {
            return {
              content: [
                {
                  type: "text" as const,
                  text: `❌ **Compilation Error**\n\n${error.message}\n\n${error.stderr || ""}`,
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

  server.registerTool(
    "get_abi",
    {
      description:
        "Get the ABI (Application Binary Interface) for a compiled Solidity contract using forge inspect",
      inputSchema: GetAbiSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ contractName }) => {
      try {
        // Check if forge is installed
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text: getForgeInstallInstructions(),
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
      } catch (error: any) {
        const errorMessage = error.stderr || error.message || String(error);
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

  server.registerTool(
    "get_bytecode",
    {
      description: "Get the bytecode for a compiled Solidity contract using forge inspect",
      inputSchema: GetBytecodeSchema,
      annotations: { readOnlyHint: true },
    },
    async ({ contractName }) => {
      try {
        // Check if forge is installed
        if (!checkForgeInstalled()) {
          return {
            content: [
              {
                type: "text" as const,
                text: getForgeInstallInstructions(),
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
      } catch (error: any) {
        const errorMessage = error.stderr || error.message || String(error);
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

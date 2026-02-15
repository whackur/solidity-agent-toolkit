import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { execSync } from "child_process";
import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
} from "../../core/compile.js";

const GetAbiSchema = z.object({
  contractName: z.string().describe('Contract name to get ABI for (e.g., "MyContract")'),
});

const GetBytecodeSchema = z.object({
  contractName: z.string().describe('Contract name to get bytecode for (e.g., "MyContract")'),
});

export function registerCompileInspectTools(server: McpServer): void {
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

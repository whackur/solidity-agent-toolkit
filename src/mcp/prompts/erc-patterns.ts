import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildERCPrompt } from "./erc-patterns-logic.js";

export function registerERCPatternPrompts(server: McpServer): void {
  server.prompt(
    "generate_erc",
    "Generate guidance for implementing an ERC standard",
    {
      standard: z
        .enum(["ERC20", "ERC721", "ERC1155", "ERC4626"])
        .describe("The ERC standard to generate guidance for"),
      features: z
        .array(z.string())
        .optional()
        .describe("Optional features to include in the guidance"),
    },
    async ({ standard, features }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: buildERCPrompt(standard, features),
            },
          },
        ],
      };
    },
  );
}

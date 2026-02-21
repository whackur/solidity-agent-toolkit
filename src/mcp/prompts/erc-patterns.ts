import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { buildERCPrompt } from "./erc-patterns-logic.js";

export function registerERCPatternPrompts(server: McpServer): void {
  server.registerPrompt(
    "generate_erc",
    {
      description:
        "Generate implementation guidance for an ERC standard (ERC20, ERC721, ERC1155, ERC4626). " +
        "Returns required interface, security considerations, and optional feature recommendations. " +
        "Use when: 'how to implement ERC20', 'create a token', 'build an NFT contract'.",
      argsSchema: {
        standard: z
          .enum(["ERC20", "ERC721", "ERC1155", "ERC4626"])
          .describe("The ERC standard to generate guidance for"),
        features: z
          .array(z.string())
          .optional()
          .describe("Optional features to include in the guidance"),
      },
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

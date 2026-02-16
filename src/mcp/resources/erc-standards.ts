import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { getERCStandard, getSupportedERCStandards } from "../../knowledge/erc-interfaces.js";

export { getERCStandard } from "../../knowledge/erc-interfaces.js";

export function registerERCResources(server: McpServer): void {
  server.registerResource(
    "erc-list",
    "erc://list",
    {
      description: "List all supported ERC standards",
      mimeType: "text/markdown",
    },
    async () => {
      const standards = getSupportedERCStandards();
      let markdown = "# Supported ERC Standards\n\n";
      markdown += `Total: ${standards.length}\n\n`;
      for (const std of standards) {
        markdown += `- **${std.id}**: ${std.title}\n`;
      }
      return {
        contents: [{ uri: "erc://list", mimeType: "text/markdown", text: markdown }],
      };
    },
  );

  server.registerResource(
    "erc-standard",
    new ResourceTemplate("erc://{standard}", { list: undefined }),
    {
      description: "Get ERC standard interface and documentation (ERC20, ERC721, ERC1155, ERC4626)",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const standard = variables.standard;
      const std = Array.isArray(standard) ? standard[0] : standard;
      if (!std) {
        throw new Error("Missing required parameter: standard");
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: getERCStandard(std),
          },
        ],
      };
    },
  );
}

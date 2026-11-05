import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GUIDES } from "../../knowledge/guide-catalog.js";
import { formatGuideList, loadGuide } from "../../knowledge/guide-loader.js";
import { requireTemplateVariable } from "./template-variable.js";

export function registerGuideResources(server: McpServer): void {
  server.registerResource(
    "guide-list",
    "guide://list",
    {
      description: "List Solidity methodology guides and references",
      mimeType: "text/markdown",
    },
    async () => ({
      contents: [{ uri: "guide://list", mimeType: "text/markdown", text: formatGuideList() }],
    }),
  );

  server.registerResource(
    "guide",
    new ResourceTemplate("guide://{topic}", {
      list: async () => ({
        resources: GUIDES.map((g) => ({
          uri: `guide://${g.id}`,
          name: g.title,
          description: g.description,
          mimeType: "text/markdown",
        })),
      }),
    }),
    {
      description:
        "Solidity methodology guide by topic (code-review, adversarial-analysis, gas-optimization, erc-standards, foundry, hardhat, glamsterdam, and references)",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const topic = requireTemplateVariable(variables, "topic");
      const result = loadGuide(topic);
      if (!result.success || result.content === undefined) {
        throw new Error(result.error ?? `Guide "${topic}" unavailable`);
      }
      return { contents: [{ uri: uri.href, mimeType: "text/markdown", text: result.content }] };
    },
  );
}

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SOLHINT_RULES } from "../../core/solhint.js";

export function registerSolhintResources(server: McpServer): void {
  server.registerResource(
    "Solhint Rules",
    "solhint://rules",
    {
      description: "List all available Solhint rules grouped by category",
      mimeType: "text/plain",
    },
    async () => {
      const grouped = SOLHINT_RULES.reduce(
        (acc, rule) => {
          const category = rule.category || "Other";
          if (!acc[category]) acc[category] = [];
          acc[category].push(rule);
          return acc;
        },
        {} as Record<string, typeof SOLHINT_RULES>,
      );

      const formatted = Object.entries(grouped)
        .map(([category, rules]) => {
          const header = `\n${category}:`;
          const rulesList = rules
            .map((r, i) => `  ${i + 1}. ${r.name}: ${r.description}`)
            .join("\n");
          return header + "\n" + rulesList;
        })
        .join("\n");

      const header = `Available Solhint Rules (${SOLHINT_RULES.length} total):`;

      return {
        contents: [
          {
            uri: "solhint://rules",
            mimeType: "text/plain",
            text: header + formatted,
          },
        ],
      };
    },
  );
}

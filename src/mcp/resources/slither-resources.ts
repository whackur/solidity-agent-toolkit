import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { listSlitherDetectors } from "../../core/slither.js";

export function registerSlitherResources(server: McpServer): void {
  server.registerResource(
    "Slither Detectors",
    "slither://detectors",
    {
      description: "List all available Slither detectors with descriptions",
      mimeType: "text/plain",
    },
    async () => {
      const output = listSlitherDetectors();

      return {
        contents: [
          {
            uri: "slither://detectors",
            mimeType: "text/plain",
            text: output,
          },
        ],
      };
    },
  );
}

import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { createDiagramArtifactUri, generateDiagram } from "../../core/diagram-runner.js";
import type { DiagramSuccess } from "../../core/diagram-types.js";

const GenerateDiagramSchema = z.object({
  path: z
    .string()
    .min(1)
    .describe("Required Solidity file or directory path on the MCP server's local filesystem"),
  view: z
    .enum(["overview", "detailed", "storage"])
    .optional()
    .describe(
      "overview (default): hide members and cluster folders | detailed: show class members | storage: show local storage layout; requires contractName",
    ),
  format: z.enum(["svg", "png"]).optional().describe("Artifact format; defaults to svg"),
  outputPath: z
    .string()
    .min(1)
    .optional()
    .describe(
      "Optional server-local .svg or .png destination; creates parent folders and never overwrites",
    ),
  contractName: z
    .string()
    .optional()
    .describe(
      "Required only for view storage; choose a Solidity contract name unique within the input path",
    ),
});

type GenerateDiagramArgs = z.infer<typeof GenerateDiagramSchema>;

export function registerDiagramTools(server: McpServer): void {
  server.registerTool(
    "generate_diagram",
    {
      description:
        'Generate a Solidity class overview, detailed class diagram, or local storage-layout diagram as an embedded SVG or PNG from a server-local Solidity file or directory. Trigger: "draw this contract diagram" or "show the storage slots for Vault".',
      inputSchema: GenerateDiagramSchema.shape,
    },
    async (args: GenerateDiagramArgs): Promise<CallToolResult> => {
      const result = await generateDiagram(args);
      if (!result.success) {
        return { content: [{ type: "text", text: result.error }], isError: true };
      }
      return successResult(result);
    },
  );
}

function successResult(result: DiagramSuccess): CallToolResult {
  const lines = [
    `Generated ${result.view} ${result.format.toUpperCase()} diagram (${result.byteLength} bytes).`,
    `Source: ${result.inputPath}`,
  ];
  if (result.contractName) lines.push(`Contract: ${result.contractName}`);
  if (result.savedPath) lines.push(`Saved artifact: ${result.savedPath}`);
  else lines.push("Artifact returned in this response; no file was saved.");

  const content: CallToolResult["content"] = [{ type: "text", text: lines.join("\n") }];
  if (result.format === "svg") {
    content.push({
      type: "resource",
      resource: {
        uri: createDiagramArtifactUri("svg"),
        mimeType: "image/svg+xml",
        text: result.artifact,
      },
    });
  } else {
    content.push({
      type: "image",
      mimeType: "image/png",
      data: result.artifact.toString("base64"),
    });
  }
  return { content };
}

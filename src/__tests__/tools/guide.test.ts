import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { GUIDES } from "../../knowledge/guide-catalog.js";
import { registerKnowledgeLookupTools } from "../../mcp/tools/knowledge-lookup.js";
import { registerGuideResources } from "../../mcp/resources/guide-resources.js";
import { createMcpServer } from "../../mcp/server.js";

type TextContent = { type: "text"; text: string };

describe("guide tool and resources", () => {
  let client: Client;
  let close: () => Promise<void>;

  beforeEach(async () => {
    const server = new McpServer({ name: "test-server", version: "1.0.0" });
    registerKnowledgeLookupTools(server);
    registerGuideResources(server);
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    client = new Client({ name: "test-client", version: "1.0.0" });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    close = async () => {
      await clientTransport.close();
      await serverTransport.close();
    };
  });

  afterEach(async () => {
    await close();
  });

  it("lookup_knowledge without args lists guides and the SCWE hint", async () => {
    const result = await client.callTool({ name: "lookup_knowledge", arguments: {} });
    expect(result.isError).toBe(false);
    const text = (result.content as TextContent[])[0].text;
    expect(text).toContain("gas-optimization");
    expect(text).toContain("OWASP SCWE");
  });

  it("lookup_knowledge returns guide markdown", async () => {
    const result = await client.callTool({
      name: "lookup_knowledge",
      arguments: { guide: "foundry" },
    });
    expect(result.isError).toBe(false);
    expect((result.content as TextContent[])[0].text).toContain("# Foundry Development Guide");
  });

  it("serves the architecture guide via tool and resource", async () => {
    const result = await client.callTool({
      name: "lookup_knowledge",
      arguments: { guide: "architecture-diagrams" },
    });
    const resource = await client.readResource({ uri: "guide://architecture-diagrams" });

    expect((result.content as TextContent[])[0].text).toContain("sol2uml-light");
    expect((resource.contents[0] as { text: string }).text).toContain("generate_diagram");
  });

  it("lookup_knowledge rejects unknown guides via schema", async () => {
    const result = await client.callTool({
      name: "lookup_knowledge",
      arguments: { guide: "unknown" },
    });
    expect(result.isError).toBe(true);
  });

  it("guide takes precedence over vulnerabilityId and query", async () => {
    const result = await client.callTool({
      name: "lookup_knowledge",
      arguments: { guide: "foundry", vulnerabilityId: "SCWE-046", query: "reentrancy" },
    });
    expect(result.isError).toBe(false);
    expect((result.content as TextContent[])[0].text).toContain("# Foundry Development Guide");
  });

  it("vulnerabilityId takes precedence over query", async () => {
    const result = await client.callTool({
      name: "lookup_knowledge",
      arguments: { vulnerabilityId: "SCWE-046", query: "zzz-no-match" },
    });
    expect(result.isError).toBeFalsy();
    expect((result.content as TextContent[])[0].text).toContain("SCWE-046");
  });

  it("returns isError for unknown vulnerabilityId", async () => {
    const result = await client.callTool({
      name: "lookup_knowledge",
      arguments: { vulnerabilityId: "SCWE-999999" },
    });
    expect(result.isError).toBe(true);
    expect((result.content as TextContent[])[0].text).toContain("not found");
  });

  it("searches SCWE by query", async () => {
    const result = await client.callTool({
      name: "lookup_knowledge",
      arguments: { query: "reentrancy" },
    });
    expect(result.isError).toBeFalsy();
    expect((result.content as TextContent[])[0].text).toContain("Found");
  });

  it("reports no matches for an unmatched query without error", async () => {
    const result = await client.callTool({
      name: "lookup_knowledge",
      arguments: { query: "zzz-no-such-vulnerability-qqq" },
    });
    expect(result.isError).toBeFalsy();
    expect((result.content as TextContent[])[0].text).toContain("No vulnerabilities found");
  });

  it("serves guide://list and guide://{topic}", async () => {
    const list = await client.readResource({ uri: "guide://list" });
    expect((list.contents[0] as { text: string }).text).toContain("code-review");

    const guide = await client.readResource({ uri: "guide://erc-interfaces" });
    expect((guide.contents[0] as { text: string }).text).toContain("ERC");
  });

  it("lists every guide as a concrete resource", async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris.sort()).toEqual(
      [...GUIDES.map((guide) => `guide://${guide.id}`), "guide://list"].sort(),
    );
  });

  it("advertises catalog ids in the lookup schema", async () => {
    const { tools } = await client.listTools();
    const lookup = tools.find((tool) => tool.name === "lookup_knowledge");
    const guideSchema = lookup?.inputSchema.properties?.guide as { enum?: string[] } | undefined;
    expect(guideSchema?.enum).toEqual(GUIDES.map((guide) => guide.id));
    expect(guideSchema?.description).toContain("Available guides and references:");
  });
});

describe("server instructions", () => {
  it("advertises guide routing to clients", async () => {
    const server = createMcpServer();
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test-client", version: "1.0.0" });
    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
    const instructions = client.getInstructions() ?? "";
    expect(instructions).toContain("lookup_knowledge");
    for (const guide of GUIDES.filter((entry) => entry.kind === "guide")) {
      expect(instructions).toContain(`${guide.trigger} → ${guide.id}`);
    }
    await clientTransport.close();
    await serverTransport.close();
  });
});

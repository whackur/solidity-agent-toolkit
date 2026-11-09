import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createMcpServer } from "../../mcp/server.js";
import { getCurrentVersion } from "../../core/version-checker.js";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

describe("Full MCP Server Integration", () => {
  let server: McpServer;
  let client: Client;
  let clientTransport: InMemoryTransport;
  let serverTransport: InMemoryTransport;

  beforeAll(async () => {
    server = createMcpServer();

    [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

    client = new Client({ name: "test-client", version: "1.0.0" });

    await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);
  });

  afterAll(async () => {
    await clientTransport.close();
    await serverTransport.close();
  });

  describe("Tools", () => {
    const EXPECTED_TOOLS = [
      "run_security_scan",
      "analyze_contract",
      "lookup_knowledge",
      "check_code_quality",
      "run_foundry",
      "generate_diagram",
    ];

    it("should register exactly 6 tools", async () => {
      const result = await client.listTools();
      expect(result.tools.map((t) => t.name).sort()).toEqual([...EXPECTED_TOOLS].sort());
    });

    it("every tool should have a description", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        expect(tool.description).toBeTruthy();
      }
    });

    it("every tool should have an input schema", async () => {
      const result = await client.listTools();
      for (const tool of result.tools) {
        expect(tool.inputSchema).toBeDefined();
      }
    });

    it("generates and returns a Solidity diagram artifact", async () => {
      const directory = await mkdtemp(path.join(os.tmpdir(), "toolkit-mcp-diagram-"));
      const source = path.join(directory, "Fixture.sol");
      await writeFile(
        source,
        "pragma solidity ^0.8.20; contract Fixture { uint256 public value; function setValue(uint256 next) external { value = next; } }\n",
      );

      try {
        const result = await client.callTool({
          name: "generate_diagram",
          arguments: { path: source },
        });
        expect(result.isError).toBeFalsy();
        expect(result.content[0]).toMatchObject({ type: "text" });
        expect(result.content[1]).toMatchObject({ type: "resource" });
        const resource = result.content[1];
        expect(resource.type === "resource" ? resource.resource.mimeType : undefined).toBe(
          "image/svg+xml",
        );
        expect(resource.type === "resource" ? resource.resource.text.includes("<svg") : false).toBe(
          true,
        );
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    });
  });

  describe("Resources", () => {
    it("should register static resources (sctop10://list, scwe://list, erc://list)", async () => {
      const result = await client.listResources();
      const uris = result.resources.map((r) => r.uri);

      expect(uris).toContain("sctop10://list");
      expect(uris).toContain("scwe://list");
      expect(uris).toContain("adversarial://list");
      expect(uris).toContain("erc://list");
      expect(uris).toContain("guide://list");
    });

    it("should register resource templates", async () => {
      const result = await client.listResourceTemplates();
      const templateUris = result.resourceTemplates.map((t) => t.uriTemplate);

      expect(templateUris).toContain("sctop10://{id}");
      expect(templateUris).toContain("erc://{standard}");
      expect(templateUris).toContain("scwe://{id}");
      expect(templateUris).toContain("scwe://category/{category}");
      expect(templateUris).toContain("adversarial://category/{category}");
      expect(templateUris).toContain("adversarial://scenario/{id}");
      expect(templateUris).toContain("guide://{topic}");
    });

    it("should have at least 6 static resources and 6 resource templates", async () => {
      const resources = await client.listResources();
      const templates = await client.listResourceTemplates();

      expect(resources.resources.length).toBeGreaterThanOrEqual(6);
      expect(templates.resourceTemplates.length).toBeGreaterThanOrEqual(6);
    });

    it("should be able to read sctop10://list", async () => {
      const result = await client.readResource({ uri: "sctop10://list" });
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);
      const content = result.contents[0] as { text: string };
      expect(content.text).toContain("OWASP Smart Contract Top 10");
    });

    it("should be able to read scwe://list", async () => {
      const result = await client.readResource({ uri: "scwe://list" });
      expect(result.contents).toBeDefined();
      expect(result.contents.length).toBeGreaterThan(0);
      const content = result.contents[0] as { text: string };
      expect(content.text).toContain("SCWE");
    });
  });

  describe("Prompts", () => {
    const EXPECTED_PROMPTS = [
      "generate_erc",
      "security_audit",
      "vulnerability_fix",
      "code_review",
      "best_practices_check",
      "optimize_gas",
      "adversarial_analysis",
    ];

    it("should register 7 prompts", async () => {
      const result = await client.listPrompts();
      expect(result.prompts.length).toBe(7);
    });

    it("should register all expected prompts by name", async () => {
      const result = await client.listPrompts();
      const promptNames = result.prompts.map((p) => p.name);

      for (const expected of EXPECTED_PROMPTS) {
        expect(promptNames).toContain(expected);
      }
    });

    it("every prompt should have a description", async () => {
      const result = await client.listPrompts();
      for (const prompt of result.prompts) {
        expect(prompt.description).toBeTruthy();
      }
    });
  });

  describe("Server Metadata", () => {
    it("should report correct server name", () => {
      const info = client.getServerVersion();
      expect(info?.name).toBe("solidity-agent-toolkit");
    });

    it("should report the package version", () => {
      const info = client.getServerVersion();
      expect(info?.version).toBe(getCurrentVersion());
      expect(info?.version).toMatch(/^\d+\.\d+\.\d+/);
    });
  });
});

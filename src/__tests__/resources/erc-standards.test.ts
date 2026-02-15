import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerERCResources, getERCStandard } from "../../mcp/resources/erc-standards.js";
import { getSupportedERCStandards } from "../../knowledge/erc-interfaces.js";

describe("ERC Standards Resources", () => {
  describe("registerERCResources", () => {
    it("registers resources without errors", () => {
      const server = new McpServer({
        name: "test-server",
        version: "1.0.0",
      });
      expect(() => registerERCResources(server)).not.toThrow();
    });

    it("registers erc://list and erc://{standard} resources", async () => {
      const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
      const { InMemoryTransport } = await import("@modelcontextprotocol/sdk/inMemory.js");

      const server = new McpServer({ name: "test-server", version: "1.0.0" });
      registerERCResources(server);

      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
      const client = new Client({ name: "test-client", version: "1.0.0" });
      await Promise.all([client.connect(clientTransport), server.connect(serverTransport)]);

      const { resources } = await client.listResources();
      const uris = resources.map((r) => r.uri);
      expect(uris).toContain("erc://list");

      const result = await client.readResource({ uri: "erc://list" });
      const content = result.contents[0] as { text: string };
      expect(content.text).toContain("Supported ERC Standards");
      expect(content.text).toContain("ERC20");

      await clientTransport.close();
      await serverTransport.close();
    });
  });

  describe("getSupportedERCStandards", () => {
    it("returns all 4 supported ERC standards", () => {
      const standards = getSupportedERCStandards();
      expect(standards).toHaveLength(4);
      const ids = standards.map((s) => s.id);
      expect(ids).toContain("ERC20");
      expect(ids).toContain("ERC721");
      expect(ids).toContain("ERC1155");
      expect(ids).toContain("ERC4626");
    });
  });

  describe("getERCStandard", () => {
    it("returns ERC20 interface and description", () => {
      const content = getERCStandard("ERC20");
      expect(content).toContain("ERC-20 Token Standard");
      expect(content).toContain("interface IERC20");
      expect(content).toContain("function transfer");
    });

    it("returns ERC721 interface and description", () => {
      const content = getERCStandard("ERC721");
      expect(content).toContain("ERC-721 Non-Fungible Token Standard");
      expect(content).toContain("interface IERC721");
      expect(content).toContain("function ownerOf");
    });

    it("returns ERC1155 interface and description", () => {
      const content = getERCStandard("ERC1155");
      expect(content).toContain("ERC-1155 Multi-Token Standard");
      expect(content).toContain("interface IERC1155");
      expect(content).toContain("function balanceOfBatch");
    });

    it("returns ERC4626 interface and description", () => {
      const content = getERCStandard("ERC4626");
      expect(content).toContain("ERC-4626 Tokenized Vault Standard");
      expect(content).toContain("interface IERC4626");
      expect(content).toContain("function deposit");
    });

    it("throws error for unsupported standard", () => {
      expect(() => getERCStandard("ERC999")).toThrow("Unsupported ERC standard: ERC999");
    });
  });
});

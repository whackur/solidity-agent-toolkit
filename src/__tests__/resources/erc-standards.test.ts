import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerERCResources, getERCStandard } from "../../mcp/resources/erc-standards.js";

describe("ERC Standards Resources", () => {
  describe("registerERCResources", () => {
    it("registers resources without errors", () => {
      const server = new McpServer({
        name: "test-server",
        version: "1.0.0",
      });
      expect(() => registerERCResources(server)).not.toThrow();
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

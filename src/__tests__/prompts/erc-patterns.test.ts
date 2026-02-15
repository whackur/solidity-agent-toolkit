import { describe, it, expect } from "vitest";
import { buildERCPrompt } from "../../mcp/prompts/erc-patterns-logic.js";

describe("ERC Pattern Logic", () => {
  describe("buildERCPrompt", () => {
    it("generates ERC20 guidance", () => {
      const prompt = buildERCPrompt("ERC20");
      expect(prompt).toContain("Implementation Guide for ERC20");
      expect(prompt).toContain("ERC-20 Token Standard");
      expect(prompt).toContain("Security Considerations");
      expect(prompt).toContain("Approval Race Condition");
    });

    it("generates ERC721 guidance", () => {
      const prompt = buildERCPrompt("ERC721");
      expect(prompt).toContain("Implementation Guide for ERC721");
      expect(prompt).toContain("ERC-721 Non-Fungible Token Standard");
      expect(prompt).toContain("_safeMint");
    });

    it("generates ERC1155 guidance", () => {
      const prompt = buildERCPrompt("ERC1155");
      expect(prompt).toContain("Implementation Guide for ERC1155");
      expect(prompt).toContain("ERC-1155 Multi-Token Standard");
      expect(prompt).toContain("balanceOfBatch");
    });

    it("generates ERC4626 guidance", () => {
      const prompt = buildERCPrompt("ERC4626");
      expect(prompt).toContain("Implementation Guide for ERC4626");
      expect(prompt).toContain("ERC-4626 Tokenized Vault Standard");
      expect(prompt).toContain("Inflation Attack");
    });

    it("includes requested features", () => {
      const prompt = buildERCPrompt("ERC20", ["Mintable", "Burnable"]);
      expect(prompt).toContain("Requested Features");
      expect(prompt).toContain("Mintable");
      expect(prompt).toContain("Burnable");
    });

    it("throws error for unsupported standard", () => {
      expect(() => buildERCPrompt("ERC999")).toThrow("Unsupported ERC standard: ERC999");
    });
  });
});

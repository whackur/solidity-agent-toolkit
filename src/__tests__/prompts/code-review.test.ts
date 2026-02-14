import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerCodeReviewPrompts } from "../../prompts/code-review.js";

describe("Code Review Prompts", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
    registerCodeReviewPrompts(server);
  });

  describe("code_review prompt", () => {
    const testCode = "contract Test {}";

    it("includes security checklist when focus is security", async () => {
      // @ts-expect-error - accessing private property for testing
      const registeredPrompt = server._registeredPrompts["code_review"];
      const result = await registeredPrompt.callback(
        { code: testCode, focus: "security" },
        { requestId: "1" },
      );
      const text = (result.messages[0].content as { type: "text"; text: string }).text;

      expect(text).toContain("Security Review Checklist");
      expect(text).not.toContain("Gas Optimization Checklist");
      expect(text).not.toContain("Solidity Style Guide Checklist");
      expect(text).toContain("Reentrancy");
      expect(text).toContain("Access Control");
    });

    it("includes gas checklist when focus is gas", async () => {
      // @ts-expect-error
      const registeredPrompt = server._registeredPrompts["code_review"];
      const result = await registeredPrompt.callback(
        { code: testCode, focus: "gas" },
        { requestId: "1" },
      );
      const text = (result.messages[0].content as { type: "text"; text: string }).text;

      expect(text).not.toContain("Security Review Checklist");
      expect(text).toContain("Gas Optimization Checklist");
      expect(text).not.toContain("Solidity Style Guide Checklist");
      expect(text).toContain("Storage Packing");
      expect(text).toContain("Calldata vs Memory");
    });

    it("includes style checklist when focus is style", async () => {
      // @ts-expect-error
      const registeredPrompt = server._registeredPrompts["code_review"];
      const result = await registeredPrompt.callback(
        { code: testCode, focus: "style" },
        { requestId: "1" },
      );
      const text = (result.messages[0].content as { type: "text"; text: string }).text;

      expect(text).not.toContain("Security Review Checklist");
      expect(text).not.toContain("Gas Optimization Checklist");
      expect(text).toContain("Solidity Style Guide Checklist");
      expect(text).toContain("Naming Conventions");
      expect(text).toContain("Function Ordering");
    });

    it("includes all checklists when focus is all", async () => {
      // @ts-expect-error
      const registeredPrompt = server._registeredPrompts["code_review"];
      const result = await registeredPrompt.callback(
        { code: testCode, focus: "all" },
        { requestId: "1" },
      );
      const text = (result.messages[0].content as { type: "text"; text: string }).text;

      expect(text).toContain("Security Review Checklist");
      expect(text).toContain("Gas Optimization Checklist");
      expect(text).toContain("Solidity Style Guide Checklist");
    });

    it("defaults to all when focus is not provided", async () => {
      // @ts-expect-error
      const registeredPrompt = server._registeredPrompts["code_review"];
      const result = await registeredPrompt.callback({ code: testCode }, { requestId: "1" });
      const text = (result.messages[0].content as { type: "text"; text: string }).text;

      expect(text).toContain("Security Review Checklist");
      expect(text).toContain("Gas Optimization Checklist");
      expect(text).toContain("Solidity Style Guide Checklist");
    });
  });

  describe("best_practices_check prompt", () => {
    const testCode = "contract Test {}";

    it("includes all best practices checklist items", async () => {
      // @ts-expect-error
      const registeredPrompt = server._registeredPrompts["best_practices_check"];
      const result = await registeredPrompt.callback({ code: testCode }, { requestId: "1" });
      const text = (result.messages[0].content as { type: "text"; text: string }).text;

      expect(text).toContain("Best Practices Checklist");
      expect(text).toContain("Access Control");
      expect(text).toContain("Reentrancy Guards");
      expect(text).toContain("Integer Handling");
      expect(text).toContain("Event Emission");
      expect(text).toContain("Error Handling");
      expect(text).toContain("Upgradability");
    });
  });
});

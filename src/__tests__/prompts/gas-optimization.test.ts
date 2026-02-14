import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerGasOptimizationPrompts } from "../../prompts/gas-optimization.js";

describe("Gas Optimization Prompts", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
    registerGasOptimizationPrompts(server);
  });

  describe("optimize_gas prompt", () => {
    it("is registered", async () => {
      const registeredPrompts = (server as any)._registeredPrompts;
      expect(registeredPrompts["optimize_gas"]).toBeDefined();
    });

    it("generates a gas optimization prompt with checklist", async () => {
      const registeredPrompts = (server as any)._registeredPrompts;
      const prompt = registeredPrompts["optimize_gas"];
      const result = await prompt.callback({
        code: "contract Test { uint256 x; }",
      });

      expect(result.messages[0].role).toBe("user");
      const content = result.messages[0].content as { type: "text"; text: string };
      expect(content.text).toContain("Gas Optimization Checklist");
      expect(content.text).toContain("contract Test { uint256 x; }");

      expect(content.text).toContain("Storage Packing");
      expect(content.text).toContain("Calldata vs Memory");
      expect(content.text).toContain("Unchecked Arithmetic");
      expect(content.text).toContain("Custom Errors vs Require Strings");
    });

    it("includes storage layout analysis when provided", async () => {
      const storageLayout = JSON.stringify({
        storage: [{ slot: "0", offset: 0, type: "t_uint256", label: "x" }],
      });

      const registeredPrompts = (server as any)._registeredPrompts;
      const prompt = registeredPrompts["optimize_gas"];
      const result = await prompt.callback({
        code: "contract Test { uint256 x; }",
        storageLayout,
      });

      const content = result.messages[0].content as { type: "text"; text: string };
      expect(content.text).toContain("Storage Layout Analysis");
      expect(content.text).toContain(storageLayout);
      expect(content.text).toContain("Check for wasted space in slots");
    });

    it("works without storage layout", async () => {
      const registeredPrompts = (server as any)._registeredPrompts;
      const prompt = registeredPrompts["optimize_gas"];
      const result = await prompt.callback({
        code: "contract Test { uint256 x; }",
      });

      const content = result.messages[0].content as { type: "text"; text: string };
      expect(content.text).not.toContain("Storage Layout Analysis");
    });

    it("includes all 10 categories in the checklist", async () => {
      const registeredPrompts = (server as any)._registeredPrompts;
      const prompt = registeredPrompts["optimize_gas"];
      const result = await prompt.callback({
        code: "contract Test {}",
      });

      const content = (result.messages[0].content as { type: "text"; text: string }).text;

      const categories = [
        "Storage Packing",
        "Calldata vs Memory",
        "Unchecked Arithmetic",
        "Short-circuiting",
        "Events vs Storage",
        "Immutable and Constant",
        "Loop Optimization",
        "Custom Errors vs Require Strings",
        "Mapping vs Array",
        "Batch Operations",
      ];

      categories.forEach((category) => {
        expect(content).toContain(category);
      });
    });
  });
});

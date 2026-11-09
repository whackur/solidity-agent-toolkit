import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import * as guideLoader from "../../knowledge/guide-loader.js";
import { registerGasOptimizationPrompts } from "../../mcp/prompts/gas-optimization.js";

describe("Gas Optimization Prompts", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
    registerGasOptimizationPrompts(server);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("optimize_gas prompt", () => {
    it("is registered", async () => {
      const registeredPrompts = (server as any)._registeredPrompts;
      expect(registeredPrompts["optimize_gas"]).toBeDefined();
    });

    it("generates a gas optimization prompt from the guide", async () => {
      const registeredPrompts = (server as any)._registeredPrompts;
      const prompt = registeredPrompts["optimize_gas"];
      const result = await prompt.callback({
        code: "contract Test { uint256 x; }",
      });

      expect(result.messages[0].role).toBe("user");
      const content = result.messages[0].content as { type: "text"; text: string };
      expect(content.text).toContain("Gas Optimization Guide");
      expect(content.text).toContain("Measure-First Workflow");
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
      expect(content.text).toContain("Provided Storage Layout");
      expect(content.text).toContain(storageLayout);
      expect(content.text).toContain("actual slot boundaries");
    });

    it("works without storage layout", async () => {
      const registeredPrompts = (server as any)._registeredPrompts;
      const prompt = registeredPrompts["optimize_gas"];
      const result = await prompt.callback({
        code: "contract Test { uint256 x; }",
      });

      const content = result.messages[0].content as { type: "text"; text: string };
      expect(content.text).not.toContain("Provided Storage Layout");
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

    it("uses the loaded gas guide and fails clearly when it is unavailable", async () => {
      const loadGuide = vi.spyOn(guideLoader, "loadGuide").mockReturnValue({
        success: false,
        error: 'Failed to read guide "gas-optimization": missing file',
      });
      const prompt = (server as any)._registeredPrompts["optimize_gas"];

      await expect(prompt.callback({ code: "contract Test {}" })).rejects.toThrow(
        'Failed to read guide "gas-optimization": missing file',
      );
      expect(loadGuide).toHaveBeenCalledWith("gas-optimization");
    });
  });
});

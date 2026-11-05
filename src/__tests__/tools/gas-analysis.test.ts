import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { registerFoundryTools } from "../../mcp/tools/foundry.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("child_process");
vi.mock("fs");

describe("Gas Analysis Tools", () => {
  let mockServer: McpServer;
  let registeredTools: Map<string, any>;

  beforeEach(() => {
    registeredTools = new Map();
    mockServer = {
      registerTool: vi.fn((name: string, config: any, handler: any) => {
        registeredTools.set(name, {
          description: config.description,
          schema: config.inputSchema,
          handler,
        });
      }),
    } as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tool Registration", () => {
    it("registers run_foundry tool", () => {
      registerFoundryTools(mockServer);
      expect(registeredTools.has("run_foundry")).toBe(true);
    });

    it.skip("all tools have readOnlyHint annotation", () => {
      registerFoundryTools(mockServer);
      expect(registeredTools.get("run_foundry").schema.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe("run_foundry gas_snapshot action", () => {
    it("returns installation instructions when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerFoundryTools(mockServer);
      const tool = registeredTools.get("run_foundry");
      const result = await tool.handler({ action: "gas_snapshot" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forge is not installed");
    });

    it("returns error when not a Foundry project", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(false);

      registerFoundryTools(mockServer);
      const tool = registeredTools.get("run_foundry");
      const result = await tool.handler({ action: "gas_snapshot" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not a Foundry Project");
    });

    it.skip("parses gas snapshot output", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const snapshotOutput = `CounterTest:testIncrement() (gas: 28312)
CounterTest:testSetNumber() (gas: 27553)`;

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge snapshot")) {
          return Buffer.from(snapshotOutput);
        }
        return Buffer.from("");
      });

      registerFoundryTools(mockServer);
      const tool = registeredTools.get("run_foundry");
      const result = await tool.handler({ action: "gas_snapshot" });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Gas Snapshot");
      expect(result.content[0].text).toContain("CounterTest");
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { registerFoundryTools } from "../../mcp/tools/foundry.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("child_process");
vi.mock("fs");

describe("Gas Inspection Tools", () => {
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
    it("registers run_foundry tool (for inspect storage)", () => {
      registerFoundryTools(mockServer);
      expect(registeredTools.has("run_foundry")).toBe(true);
    });

    it("registers run_foundry tool (for gas_report)", () => {
      registerFoundryTools(mockServer);
      expect(registeredTools.has("run_foundry")).toBe(true);
    });
  });

  describe("inspect_storage tool", () => {
    it("returns installation instructions when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerFoundryTools(mockServer);
      const tool = registeredTools.get("run_foundry");
      const result = await tool.handler({
        action: "inspect",
        contractName: "MyContract",
        inspect: "storage",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forge is not installed");
    });

    it("parses storage layout", async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const storageOutput = JSON.stringify({
        storage: [
          {
            slot: "0",
            offset: 0,
            type: "uint256",
            label: "balance",
            numberOfBytes: "32",
          },
        ],
      });

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge inspect") && cmd.includes("storage")) {
          return Buffer.from(storageOutput);
        }
        return Buffer.from("");
      });

      registerFoundryTools(mockServer);
      const tool = registeredTools.get("run_foundry");
      const result = await tool.handler({
        action: "inspect",
        contractName: "MyContract",
        inspect: "storage",
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Storage Layout");
      expect(result.content[0].text).toContain("balance");
    });
  });

  describe("estimate_gas tool", () => {
    it("returns installation instructions when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerFoundryTools(mockServer);
      const tool = registeredTools.get("run_foundry");
      const result = await tool.handler({ action: "gas_report" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forge is not installed");
    });

    it.skip("parses gas report output", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const gasReportOutput = `
| Counter contract |                 |       |        |       |         |
| Function Name    | min             | avg   | median | max   | # calls |
| increment        | 5000            | 5500  | 5500   | 6000  | 10      |
`;

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge test --gas-report")) {
          return Buffer.from(gasReportOutput);
        }
        return Buffer.from("");
      });

      registerFoundryTools(mockServer);
      const tool = registeredTools.get("run_foundry");
      const result = await tool.handler({ action: "gas_report" });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Gas Estimates");
      expect(result.content[0].text).toContain("Counter");
    });
  });
});

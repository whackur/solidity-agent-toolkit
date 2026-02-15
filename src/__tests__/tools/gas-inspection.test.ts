import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { registerGasInspectionTools } from "../../mcp/tools/gas-inspection.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("child_process");
vi.mock("fs");

describe("Gas Inspection Tools", () => {
  let mockServer: McpServer;
  let registeredTools: Map<string, any>;

  beforeEach(() => {
    registeredTools = new Map();
    mockServer = {
      tool: vi.fn((name: string, description: string, schema: any, handler: any) => {
        registeredTools.set(name, { description, schema, handler });
      }),
    } as any;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tool Registration", () => {
    it("registers inspect_storage tool", () => {
      registerGasInspectionTools(mockServer);
      expect(registeredTools.has("inspect_storage")).toBe(true);
    });

    it("registers estimate_gas tool", () => {
      registerGasInspectionTools(mockServer);
      expect(registeredTools.has("estimate_gas")).toBe(true);
    });

    it.skip("all tools have readOnlyHint annotation", () => {
      registerGasInspectionTools(mockServer);
      expect(registeredTools.get("inspect_storage").schema.annotations?.readOnlyHint).toBe(true);
      expect(registeredTools.get("estimate_gas").schema.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe("inspect_storage tool", () => {
    it("returns installation instructions when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerGasInspectionTools(mockServer);
      const tool = registeredTools.get("inspect_storage");
      const result = await tool.handler({ contractName: "MyContract" });

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

      registerGasInspectionTools(mockServer);
      const tool = registeredTools.get("inspect_storage");
      const result = await tool.handler({ contractName: "MyContract" });

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

      registerGasInspectionTools(mockServer);
      const tool = registeredTools.get("estimate_gas");
      const result = await tool.handler({});

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

      registerGasInspectionTools(mockServer);
      const tool = registeredTools.get("estimate_gas");
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Gas Estimates");
      expect(result.content[0].text).toContain("Counter");
    });
  });
});

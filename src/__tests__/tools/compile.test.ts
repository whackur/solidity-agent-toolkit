import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import { registerCompileTools } from "../../mcp/tools/compile.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("child_process");
vi.mock("fs");

describe("Compile Tools", () => {
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
    vi.mocked(existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tool Registration", () => {
    it("registers compile_contract tool", () => {
      registerCompileTools(mockServer);
      expect(registeredTools.has("compile_contract")).toBe(true);
    });

    it("registers compile_contract tool with inspect capability", () => {
      registerCompileTools(mockServer);
      expect(registeredTools.has("compile_contract")).toBe(true);
    });

    it("compile_contract has correct description", () => {
      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      expect(tool.description).toContain("Compile");
      expect(tool.description).toContain("Foundry");
    });
  });

  describe("compile_contract tool", () => {
    it("returns installation instructions when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forge is not installed");
      expect(result.content[0].text).toContain("foundry.paradigm.xyz");
    });

    it("returns error when not a Foundry project", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(false);

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not a Foundry Project");
      expect(result.content[0].text).toContain("foundry.toml");
    });

    it("parses successful compilation output", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const successOutput = JSON.stringify({
        type: "contract",
        data: { name: "MyContract" },
      });

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.startsWith("forge build")) {
          return Buffer.from(successOutput);
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Compilation Successful");
      expect(result.content[0].text).toContain("MyContract");
    });

    it("parses compilation errors", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const errorOutput = JSON.stringify({
        type: "diagnostic",
        data: {
          severity: "error",
          message: "Undeclared identifier",
          sourceLocation: {
            file: "src/Contract.sol",
            start: 100,
            end: 110,
          },
        },
      });

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.startsWith("forge build")) {
          const error: any = new Error("Compilation failed");
          error.stdout = errorOutput;
          error.stderr = "";
          throw error;
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Compilation Failed");
      expect(result.content[0].text).toContain("Undeclared identifier");
      expect(result.content[0].text).toContain("src/Contract.sol");
    });

    it("parses compilation warnings", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const warningOutput = [
        JSON.stringify({
          type: "diagnostic",
          data: {
            severity: "warning",
            message: "Unused variable",
          },
        }),
        JSON.stringify({
          type: "contract",
          data: { name: "MyContract" },
        }),
      ].join("\n");

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.startsWith("forge build")) {
          return Buffer.from(warningOutput);
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Compilation Successful");
      expect(result.content[0].text).toContain("Warnings");
      expect(result.content[0].text).toContain("Unused variable");
    });

    it("handles path parameter", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("src/MyContract.sol")) {
          return Buffer.from(
            JSON.stringify({
              type: "contract",
              data: { name: "MyContract" },
            }),
          );
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ path: "src/MyContract.sol" });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Compilation Successful");
    });

    it("handles contractName parameter", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("--contracts MyContract")) {
          return Buffer.from(
            JSON.stringify({
              type: "contract",
              data: { name: "MyContract" },
            }),
          );
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract" });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Compilation Successful");
    });
  });

  describe("get_abi tool", () => {
    it("returns installation instructions when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "abi" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forge is not installed");
    });

    it("returns error when not a Foundry project", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(false);

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "abi" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not a Foundry Project");
    });

    it("returns valid ABI JSON", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const mockAbi = [
        {
          type: "function",
          name: "transfer",
          inputs: [
            { name: "to", type: "address" },
            { name: "amount", type: "uint256" },
          ],
          outputs: [{ name: "", type: "bool" }],
        },
      ];

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge inspect")) {
          return Buffer.from(JSON.stringify(mockAbi));
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "abi" });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("ABI for MyContract");
      expect(result.content[0].text).toContain("transfer");
      expect(result.content[0].text).toContain("address");
    });

    it("handles contract not found error", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge inspect")) {
          const error: any = new Error("Contract not found");
          error.stderr = 'Error: Contract "NonExistent" not found';
          throw error;
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "NonExistent", inspect: "abi" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error Inspecting");
      expect(result.content[0].text).toContain("not found");
    });

    it("handles invalid JSON output", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge inspect")) {
          return Buffer.from("invalid json output");
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "abi" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Received non-JSON output from forge inspect");
    });
  });

  describe("get_bytecode tool", () => {
    it("returns installation instructions when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "bytecode" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forge is not installed");
    });

    it("returns error when not a Foundry project", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(false);

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "bytecode" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not a Foundry Project");
    });

    it("returns valid bytecode", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const mockBytecode = "0x608060405234801561001057600080fd5b50";

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge inspect") && cmd.includes("bytecode")) {
          return mockBytecode;
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "bytecode" });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Bytecode for MyContract");
      expect(result.content[0].text).toContain(mockBytecode);
      expect(result.content[0].text).toContain("bytes");
    });

    it("calculates bytecode size correctly", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const mockBytecode = "0x6080604052";

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge inspect") && cmd.includes("bytecode")) {
          return mockBytecode;
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "bytecode" });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("5 bytes");
    });

    it("handles contract not found error", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge inspect")) {
          const error: any = new Error("Contract not found");
          error.stderr = 'Error: Contract "NonExistent" not found';
          throw error;
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "NonExistent", inspect: "bytecode" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error Inspecting");
    });

    it("handles invalid bytecode format", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge inspect")) {
          return "invalid bytecode without 0x prefix";
        }
        return Buffer.from("");
      });

      registerCompileTools(mockServer);
      const tool = registeredTools.get("compile_contract");
      const result = await tool.handler({ contractName: "MyContract", inspect: "bytecode" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Received unexpected output");
    });
  });
});

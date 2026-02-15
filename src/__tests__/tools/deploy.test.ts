import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "fs";
import { registerDeployTools } from "../../mcp/tools/deploy.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("child_process");
vi.mock("fs");

describe("Deploy Tools", () => {
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
    vi.mocked(existsSync).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tool Registration", () => {
    it("registers manage_deployment tool", () => {
      registerDeployTools(mockServer);
      expect(registeredTools.has("manage_deployment")).toBe(true);
    });

    it("manage_deployment has correct description", () => {
      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      expect(tool.description).toContain("Manage");
    });
  });

  describe("dry_run_deploy tool", () => {
    it("returns installation instructions when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({ action: "simulate", scriptPath: "script/Deploy.s.sol" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Forge is not installed");
      expect(result.content[0].text).toContain("foundry.paradigm.xyz");
    });

    it("returns error when not a Foundry project", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === "foundry.toml") return false;
        return true;
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({ action: "simulate", scriptPath: "script/Deploy.s.sol" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Not a Foundry Project");
      expect(result.content[0].text).toContain("foundry.toml");
    });

    it("returns error when script file does not exist", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === "foundry.toml") return true;
        if (path === "script/Deploy.s.sol") return false;
        return true;
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({ action: "simulate", scriptPath: "script/Deploy.s.sol" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Script Not Found");
      expect(result.content[0].text).toContain("script/Deploy.s.sol");
    });

    it("rejects commands with --broadcast flag", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");

      const maliciousCommand = "forge script script/Deploy.s.sol --broadcast";

      const result = await tool.handler({
        action: "simulate",
        scriptPath: "script/Deploy.s.sol --broadcast",
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("SAFETY VIOLATION");
      expect(result.content[0].text).toContain("--broadcast");
    });

    it("parses successful dry-run output", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const mockOutput = `
Script ran successfully
Contract: MyContract
deployed at: 0x1234567890123456789012345678901234567890
gas: 500000
calldata: 0xabcdef

Total gas: 500000
SIMULATION COMPLETE
`;

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge script")) {
          return mockOutput;
        }
        throw new Error("Unexpected command");
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({
        action: "simulate",
        scriptPath: "script/Deploy.s.sol",
        rpcUrl: "http://localhost:8545",
      });

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toContain("Deployment Simulation Successful");
      expect(result.content[0].text).toContain("0x1234567890123456789012345678901234567890");
      expect(result.content[0].text).toContain("500,000");
      expect(result.content[0].text).toContain("simulation only");
    });

    it("uses default localhost RPC when not provided", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      let capturedCommand = "";
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge script")) {
          capturedCommand = cmd;
          return "Script ran successfully";
        }
        throw new Error("Unexpected command");
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      await tool.handler({ action: "simulate", scriptPath: "script/Deploy.s.sol" });

      expect(capturedCommand).toContain("--fork-url http://localhost:8545");
    });

    it("includes fork block number when provided", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      let capturedCommand = "";
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge script")) {
          capturedCommand = cmd;
          return "Script ran successfully";
        }
        throw new Error("Unexpected command");
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      await tool.handler({
        action: "simulate",
        scriptPath: "script/Deploy.s.sol",
        rpcUrl: "http://localhost:8545",
        forkBlockNumber: 12345678,
      });

      expect(capturedCommand).toContain("--fork-block-number 12345678");
    });

    it("parses multiple transactions", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const mockOutput = `
Contract: Token
deployed at: 0x1111111111111111111111111111111111111111
gas: 300000

Contract: Vault
deployed at: 0x2222222222222222222222222222222222222222
gas: 700000

Script ran successfully
`;

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge script")) {
          return mockOutput;
        }
        throw new Error("Unexpected command");
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({
        action: "simulate",
        scriptPath: "script/Deploy.s.sol",
        rpcUrl: "http://localhost:8545",
      });

      expect(result.content[0].text).toContain("Transactions (2)");
      expect(result.content[0].text).toContain("Token");
      expect(result.content[0].text).toContain("Vault");
      expect(result.content[0].text).toContain("0x1111111111111111111111111111111111111111");
      expect(result.content[0].text).toContain("0x2222222222222222222222222222222222222222");
    });

    it("handles simulation errors", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      const mockOutput = `
Error: Revert
failed to deploy
`;

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge script")) {
          const error: any = new Error("Command failed");
          error.stdout = mockOutput;
          throw error;
        }
        throw new Error("Unexpected command");
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({
        action: "simulate",
        scriptPath: "script/Deploy.s.sol",
        rpcUrl: "http://localhost:8545",
      });

      expect(result.content[0].text).toContain("Deployment Simulation Failed");
      expect(result.content[0].text).toContain("Error");
    });
  });

  describe("check_deployment_status tool", () => {
    it("returns message when no broadcast files found", async () => {
      vi.mocked(existsSync).mockReturnValue(false);

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({ action: "status" });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("No Broadcast Files Found");
      expect(result.content[0].text).toContain("broadcast/");
    });

    it("parses broadcast JSON with transactions", async () => {
      const mockBroadcastData = {
        chain: 1,
        transactions: [
          {
            hash: "0xabc123",
            contractName: "MyContract",
            contractAddress: "0x1234567890123456789012345678901234567890",
            status: "0x1",
            gasUsed: "500000",
          },
        ],
      };

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === "broadcast") return true;
        if (typeof path === "string" && path.includes("run-latest.json")) return true;
        return false;
      });

      vi.mocked(readdirSync).mockReturnValue(["1"] as any);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as any);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockBroadcastData));

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({ action: "status" });

      expect(result.content[0].text).toContain("Deployment Status");
      expect(result.content[0].text).toContain("Chain ID:** 1");
      expect(result.content[0].text).toContain("MyContract");
      expect(result.content[0].text).toContain("0xabc123");
      expect(result.content[0].text).toContain("SUCCESS");
      expect(result.content[0].text).toContain("500,000");
    });

    it("parses broadcast JSON with receipts format", async () => {
      const mockBroadcastData = {
        chain: 31337,
        receipts: [
          {
            transactionHash: "0xdef456",
            contractName: "Token",
            contractAddress: "0x9999999999999999999999999999999999999999",
            status: 1,
            gasUsed: "300000",
          },
        ],
      };

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === "broadcast") return true;
        if (typeof path === "string" && path.includes("run-latest.json")) return true;
        return false;
      });

      vi.mocked(readdirSync).mockReturnValue(["31337"] as any);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as any);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockBroadcastData));

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({ action: "status" });

      expect(result.content[0].text).toContain("Chain ID:** 31337");
      expect(result.content[0].text).toContain("Token");
      expect(result.content[0].text).toContain("0xdef456");
      expect(result.content[0].text).toContain("SUCCESS");
    });

    it("handles failed transactions", async () => {
      const mockBroadcastData = {
        chain: 1,
        transactions: [
          {
            hash: "0xfailed",
            contractName: "FailedContract",
            contractAddress: "0x0000000000000000000000000000000000000000",
            status: "0x0",
            gasUsed: "100000",
          },
        ],
      };

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === "broadcast") return true;
        if (typeof path === "string" && path.includes("run-latest.json")) return true;
        return false;
      });

      vi.mocked(readdirSync).mockReturnValue(["1"] as any);
      vi.mocked(statSync).mockReturnValue({ isDirectory: () => true } as any);
      vi.mocked(readFileSync).mockReturnValue(JSON.stringify(mockBroadcastData));

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({ action: "status" });

      expect(result.content[0].text).toContain("FAILED");
      expect(result.content[0].text).toContain("FailedContract");
    });

    it("uses custom broadcast directory", async () => {
      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === "custom-broadcast") return true;
        return false;
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({ action: "status", broadcastDir: "custom-broadcast" });

      expect(result.content[0].text).toContain("custom-broadcast");
    });
  });

  describe("Safety checks", () => {
    it("never allows --broadcast in any form", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");

      const testCases = [
        "script/Deploy.s.sol --broadcast",
        'script/Deploy.s.sol" --broadcast',
        "script/Deploy.s.sol && echo --broadcast",
      ];

      for (const scriptPath of testCases) {
        const result = await tool.handler({ action: "simulate", scriptPath });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain("SAFETY VIOLATION");
      }
    });

    it("includes safety warning in successful output", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);

      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge script")) {
          return "Script ran successfully";
        }
        throw new Error("Unexpected command");
      });

      registerDeployTools(mockServer);
      const tool = registeredTools.get("manage_deployment");
      const result = await tool.handler({
        action: "simulate",
        scriptPath: "script/Deploy.s.sol",
        rpcUrl: "http://localhost:8545",
      });

      expect(result.content[0].text).toContain("simulation only");
      expect(result.content[0].text).toContain("No transactions were broadcast");
    });
  });
});

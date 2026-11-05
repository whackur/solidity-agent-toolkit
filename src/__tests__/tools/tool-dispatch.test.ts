import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import { existsSync } from "fs";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerSecurityScanTools } from "../../mcp/tools/security-scan.js";
import { registerCodeQualityTools } from "../../mcp/tools/code-quality.js";
import { registerFoundryTools } from "../../mcp/tools/foundry.js";
import { registerKnowledgeLookupTools } from "../../mcp/tools/knowledge-lookup.js";

vi.mock("child_process");
vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, existsSync: vi.fn(actual.existsSync) };
});

const REENTRANT = `pragma solidity ^0.8.0;
contract Vault {
  mapping(address => uint256) public balances;
  function withdraw() external {
    uint256 amount = balances[msg.sender];
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok);
    balances[msg.sender] = 0;
  }
}`;

describe("consolidated tool dispatch", () => {
  let registeredTools: Map<string, any>;
  let mockServer: McpServer;

  beforeEach(() => {
    vi.clearAllMocks();
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
    registerSecurityScanTools(mockServer);
    registerCodeQualityTools(mockServer);
    registerFoundryTools(mockServer);
    registerKnowledgeLookupTools(mockServer);
  });

  it("keeps descriptions within 150-400 chars", () => {
    for (const [name, tool] of registeredTools) {
      expect(tool.description.length, name).toBeGreaterThanOrEqual(150);
      expect(tool.description.length, name).toBeLessThanOrEqual(400);
    }
  });

  it("puts negative routing only on run_security_scan and lookup_knowledge", () => {
    for (const [name, tool] of registeredTools) {
      const expected = name === "run_security_scan" || name === "lookup_knowledge";
      expect(tool.description.includes("NOT for:"), name).toBe(expected);
    }
  });

  describe("run_security_scan patterns", () => {
    it("scans inline code without invoking any CLI", async () => {
      const result = await registeredTools
        .get("run_security_scan")
        .handler({ tool: "patterns", code: REENTRANT });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("SCWE-046");
      expect(execSync).not.toHaveBeenCalled();
    });

    it("honors checkIds", async () => {
      const result = await registeredTools
        .get("run_security_scan")
        .handler({ tool: "patterns", code: REENTRANT, checkIds: ["SCWE-999"] });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain("SCWE-046");
    });

    it("returns isError when code is missing", async () => {
      const result = await registeredTools.get("run_security_scan").handler({ tool: "patterns" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("`code` is required");
    });
  });

  describe("check_code_quality", () => {
    it("routes check: style to the style rules", async () => {
      const result = await registeredTools
        .get("check_code_quality")
        .handler({ check: "style", code: "contract my_contract {}" });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("style violation");
    });

    it("routes check: natspec to validation", async () => {
      const result = await registeredTools.get("check_code_quality").handler({
        check: "natspec",
        code: "contract A { function f(uint256 x) public returns (uint256) { return x; } }",
      });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).not.toContain("Generated NatSpec templates");
    });

    it("routes check: natspec with generate to templates", async () => {
      const result = await registeredTools.get("check_code_quality").handler({
        check: "natspec",
        code: "contract A { function f(uint256 x) public returns (uint256) { return x; } }",
        generate: true,
      });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Generated NatSpec templates");
    });

    it("ignores generate for style and fix for natspec", async () => {
      const style = await registeredTools
        .get("check_code_quality")
        .handler({ check: "style", code: "contract A {}", generate: true });
      expect(style.content[0].text).not.toContain("Generated NatSpec templates");
      const natspec = await registeredTools
        .get("check_code_quality")
        .handler({ check: "natspec", code: "contract A {}", fix: true });
      expect(natspec.isError).toBe(false);
      expect(execSync).not.toHaveBeenCalled();
    });
  });

  describe("run_foundry", () => {
    const forgeMissing = () =>
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

    it.each(["build", "inspect", "gas_report", "gas_snapshot", "deploy_simulate", "test"])(
      "action %s reports missing forge",
      async (action) => {
        forgeMissing();
        vi.mocked(existsSync).mockReturnValue(true);
        const result = await registeredTools.get("run_foundry").handler({
          action,
          contractName: "C",
          inspect: "abi",
          scriptPath: "script/Deploy.s.sol",
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text.toLowerCase()).toContain("not installed");
      },
    );

    it("deploy_simulate requires scriptPath", async () => {
      const result = await registeredTools
        .get("run_foundry")
        .handler({ action: "deploy_simulate" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("`scriptPath` is required");
    });

    it("inspect requires contractName", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);
      const result = await registeredTools
        .get("run_foundry")
        .handler({ action: "inspect", inspect: "abi" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("`contractName` is required");
    });

    it("inspect requires inspect target", async () => {
      vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0\n"));
      vi.mocked(existsSync).mockReturnValue(true);
      const result = await registeredTools
        .get("run_foundry")
        .handler({ action: "inspect", contractName: "C" });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("`inspect`");
    });

    it("deploy_status reports missing broadcast dir without error", async () => {
      vi.mocked(existsSync).mockReturnValue(false);
      const result = await registeredTools
        .get("run_foundry")
        .handler({ action: "deploy_status", broadcastDir: "nope" });
      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("No Broadcast Files Found");
    });
  });
});

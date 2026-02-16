import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerContractAnalysisTools } from "../../mcp/tools/contract-analysis.js";
import {
  analyzeAccessControl,
  formatAccessControlMatrix,
} from "../../core/access-control-matrix.js";

const MIXED_CONTRACT = `
pragma solidity ^0.8.0;
contract MyContract {
    address public owner;
    uint public price;
    function setPrice(uint p) external onlyOwner { price = p; }
    function getPrice() external view returns (uint) { return price; }
    function transfer(address to) external { /* no access control */ }
    function _internal() internal { }
}`;

describe("Access Control Matrix", () => {
  describe("analyzeAccessControl (core)", () => {
    it("detects onlyOwner modifier as owner access level", () => {
      const code = `contract Foo { function setVal(uint x) external onlyOwner { val = x; } }`;
      const result = analyzeAccessControl(code);
      const fn = result.functions.find((f) => f.functionName === "setVal");
      expect(fn).toBeDefined();
      expect(fn!.accessLevel).toBe("owner");
      expect(fn!.modifiers).toContain("onlyOwner");
    });

    it("detects onlyRole modifier as role-based access level", () => {
      const code = `contract Foo { function mint(uint x) external onlyRole { tokens += x; } }`;
      const result = analyzeAccessControl(code);
      const fn = result.functions.find((f) => f.functionName === "mint");
      expect(fn).toBeDefined();
      expect(fn!.accessLevel).toBe("role-based");
    });

    it("detects inline require(msg.sender == owner) as owner access", () => {
      const code = `contract Foo {
        address owner;
        function withdraw() external { require(msg.sender == owner); }
      }`;
      const result = analyzeAccessControl(code);
      const fn = result.functions.find((f) => f.functionName === "withdraw");
      expect(fn).toBeDefined();
      expect(fn!.accessLevel).toBe("owner");
      expect(fn!.inlineChecks.length).toBeGreaterThan(0);
    });

    it("detects custom modifier onlyValidator as custom access", () => {
      const code = `contract Foo { function validate(bytes b) external onlyValidator { } }`;
      const result = analyzeAccessControl(code);
      const fn = result.functions.find((f) => f.functionName === "validate");
      expect(fn).toBeDefined();
      expect(fn!.accessLevel).toBe("custom");
      expect(fn!.modifiers).toContain("onlyValidator");
    });

    it("marks public function with no access control as unrestricted", () => {
      const code = `contract Foo { function doStuff() public { x = 1; } }`;
      const result = analyzeAccessControl(code);
      const fn = result.functions.find((f) => f.functionName === "doStuff");
      expect(fn).toBeDefined();
      expect(fn!.accessLevel).toBe("unrestricted");
      expect(result.unprotectedExternalFunctions).toContain("doStuff");
    });

    it("marks internal/private functions as internal-only", () => {
      const code = `contract Foo {
        function _helper() internal { }
        function _secret() private { }
      }`;
      const result = analyzeAccessControl(code);
      for (const fn of result.functions) {
        expect(fn.accessLevel).toBe("internal-only");
      }
      expect(result.unprotectedExternalFunctions).toHaveLength(0);
    });

    it("does not include view/pure functions in unprotectedExternalFunctions", () => {
      const code = `contract Foo {
        function getVal() external view returns (uint) { return val; }
        function compute(uint a) public pure returns (uint) { return a * 2; }
      }`;
      const result = analyzeAccessControl(code);
      expect(result.unprotectedExternalFunctions).toHaveLength(0);
    });

    it("handles empty string without crashing", () => {
      const result = analyzeAccessControl("");
      expect(result.contractName).toBe("Unknown");
      expect(result.functions).toHaveLength(0);
      expect(result.unprotectedExternalFunctions).toHaveLength(0);
      expect(result.summary.total).toBe(0);
    });

    it("correctly classifies mixed contract functions", () => {
      const result = analyzeAccessControl(MIXED_CONTRACT);
      expect(result.contractName).toBe("MyContract");

      const setPrice = result.functions.find((f) => f.functionName === "setPrice");
      expect(setPrice!.accessLevel).toBe("owner");

      const getPrice = result.functions.find((f) => f.functionName === "getPrice");
      expect(getPrice!.accessLevel).toBe("unrestricted");

      const transfer = result.functions.find((f) => f.functionName === "transfer");
      expect(transfer!.accessLevel).toBe("unrestricted");
      expect(result.unprotectedExternalFunctions).toContain("transfer");
      expect(result.unprotectedExternalFunctions).not.toContain("getPrice");

      const internal = result.functions.find((f) => f.functionName === "_internal");
      expect(internal!.accessLevel).toBe("internal-only");
    });

    it("computes summary counts correctly", () => {
      const result = analyzeAccessControl(MIXED_CONTRACT);
      expect(result.summary.total).toBe(4);
      expect(result.summary.internalOnly).toBe(1);
      expect(result.summary.unprotected).toBe(1);
      expect(result.summary.protected).toBe(2);
    });

    it("detects _checkOwner inline check as owner access", () => {
      const code = `contract Foo {
        function setFee(uint f) external { _checkOwner(); fee = f; }
      }`;
      const result = analyzeAccessControl(code);
      const fn = result.functions.find((f) => f.functionName === "setFee");
      expect(fn!.accessLevel).toBe("owner");
    });

    it("detects _checkRole inline check as role-based access", () => {
      const code = `contract Foo {
        function mint(uint x) external { _checkRole(MINTER_ROLE); supply += x; }
      }`;
      const result = analyzeAccessControl(code);
      const fn = result.functions.find((f) => f.functionName === "mint");
      expect(fn!.accessLevel).toBe("role-based");
    });

    it("detects payable mutability", () => {
      const code = `contract Foo { function deposit() external payable { } }`;
      const result = analyzeAccessControl(code);
      expect(result.functions[0].mutability).toBe("payable");
    });

    it("does not treat nonReentrant alone as custom access", () => {
      const code = `contract Foo { function swap(uint a) external nonReentrant { } }`;
      const result = analyzeAccessControl(code);
      const fn = result.functions.find((f) => f.functionName === "swap");
      expect(fn!.accessLevel).toBe("unrestricted");
      expect(result.unprotectedExternalFunctions).toContain("swap");
    });
  });

  describe("formatAccessControlMatrix", () => {
    it("outputs markdown table with pipe characters", () => {
      const result = analyzeAccessControl(MIXED_CONTRACT);
      const formatted = formatAccessControlMatrix(result);
      expect(formatted).toContain("|");
      expect(formatted).toContain("| Function |");
      expect(formatted).toContain("| setPrice |");
      expect(formatted).toContain("# Access Control Matrix: MyContract");
    });

    it("includes summary section", () => {
      const result = analyzeAccessControl(MIXED_CONTRACT);
      const formatted = formatAccessControlMatrix(result);
      expect(formatted).toContain("## Summary");
      expect(formatted).toContain("Total functions");
    });

    it("includes unprotected functions warning", () => {
      const result = analyzeAccessControl(MIXED_CONTRACT);
      const formatted = formatAccessControlMatrix(result);
      expect(formatted).toContain("Unprotected State-Changing Functions");
      expect(formatted).toContain("`transfer`");
    });

    it("omits unprotected warning when all functions are protected", () => {
      const code = `contract Safe { function set(uint x) external onlyOwner { val = x; } }`;
      const result = analyzeAccessControl(code);
      const formatted = formatAccessControlMatrix(result);
      expect(formatted).not.toContain("Unprotected State-Changing Functions");
    });
  });

  describe("MCP Tool Registration", () => {
    let server: McpServer;

    beforeEach(() => {
      server = new McpServer({
        name: "test-server",
        version: "1.0.0",
      });
    });

    it("registerContractAnalysisTools does not throw", () => {
      expect(() => registerContractAnalysisTools(server)).not.toThrow();
    });

    it("registers generate_access_control_matrix tool", () => {
      registerContractAnalysisTools(server);

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      expect(tool).toBeDefined();
      expect(tool.description).toContain("access control");
    });

    it("returns formatted matrix for valid code", async () => {
      registerContractAnalysisTools(server);

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      const result = await tool.handler({ analysis: "access_control", code: MIXED_CONTRACT });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(result.content[0].text).toContain("MyContract");
      expect(result.content[0].text).toContain("|");
    });

    it("handles empty code without error", async () => {
      registerContractAnalysisTools(server);

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_contract"];
      const result = await tool.handler({ analysis: "access_control", code: "" });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("Unknown");
    });
  });
});

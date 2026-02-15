import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAdversarialTools } from "../../mcp/tools/adversarial.js";

describe("Adversarial Scenario Analysis Tools", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
  });

  describe("Tool Registration", () => {
    it("registerAdversarialTools does not throw", () => {
      expect(() => registerAdversarialTools(server)).not.toThrow();
    });

    it("registers analyze_adversarial_scenarios tool", () => {
      registerAdversarialTools(server);

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_adversarial_scenarios"];
      expect(tool).toBeDefined();
      expect(tool.description).toContain("adversarial");
    });
  });

  describe("analyze_adversarial_scenarios tool", () => {
    beforeEach(() => {
      registerAdversarialTools(server);
    });

    it("returns formatted analysis for code with detectable features", async () => {
      const code = `
pragma solidity ^0.8.0;
contract Vulnerable {
    mapping(address => uint) balances;
    function withdraw(uint amount) public {
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] -= amount;
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_adversarial_scenarios"];
      const result = await tool.handler({ code });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");
      expect(typeof result.content[0].text).toBe("string");
      expect(result.content[0].text.length).toBeGreaterThan(0);
    });

    it("returns scenario text for code with reentrancy patterns", async () => {
      const code = `
pragma solidity ^0.8.0;
contract Vulnerable {
    mapping(address => uint) balances;
    function withdraw(uint amount) public {
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] -= amount;
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_adversarial_scenarios"];
      const result = await tool.handler({ code });

      expect(result.content[0].text).toContain("Adversarial Scenario");
    });

    it("returns no scenarios message for clean contract", async () => {
      const code = `
pragma solidity ^0.8.0;
contract Foo {
    function bar() public pure returns (uint) {
        return 1;
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_adversarial_scenarios"];
      const result = await tool.handler({ code });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("No adversarial scenarios");
    });

    it("filters by categories when provided", async () => {
      const code = `
pragma solidity ^0.8.0;
contract Vulnerable {
    mapping(address => uint) balances;
    function withdraw(uint amount) public {
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] -= amount;
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_adversarial_scenarios"];
      const result = await tool.handler({ code, categories: ["reentrancy"] });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBeTruthy();
    });

    it("returns no scenarios for non-matching category filter", async () => {
      const code = `
pragma solidity ^0.8.0;
contract Vulnerable {
    mapping(address => uint) balances;
    function withdraw(uint amount) public {
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success);
        balances[msg.sender] -= amount;
    }
}`;

      // @ts-expect-error — accessing private for testing
      const tool = server._registeredTools["analyze_adversarial_scenarios"];
      const result = await tool.handler({
        code,
        categories: ["nonexistent-category"],
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("No adversarial scenarios");
    });
  });
});

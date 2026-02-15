import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildAdversarialPrompt } from "../../mcp/prompts/adversarial-analysis-logic.js";
import { registerAdversarialPrompts } from "../../mcp/prompts/adversarial-analysis.js";

describe("Adversarial Analysis Prompt", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
    vi.clearAllMocks();
  });

  describe("buildAdversarialPrompt", () => {
    it("generates prompt with reentrancy scenarios for vulnerable code", () => {
      const code = `
        contract Vulnerable {
          mapping(address => uint) balances;
          function withdraw(uint amount) public {
            require(balances[msg.sender] >= amount);
            (bool success, ) = msg.sender.call{value: amount}("");
            require(success);
            balances[msg.sender] -= amount;
          }
        }
      `;
      const { system, user } = buildAdversarialPrompt(code);
      expect(system).toContain("adversarial");
      expect(system).toContain("attacker");
      expect(user).toContain("Pre-Conditions");
      expect(user).toContain("Attack Steps");
      expect(user).toContain("Invariants Violated");
    });

    it("includes reentrancy scenario details when detected", () => {
      const code = `
        contract Vulnerable {
          mapping(address => uint) balances;
          function withdraw(uint amount) public {
            (bool success, ) = msg.sender.call{value: amount}("");
            balances[msg.sender] -= amount;
          }
        }
      `;
      const { user } = buildAdversarialPrompt(code);
      expect(user).toContain("Classic Ether Drain");
      expect(user).toContain("AS-001");
    });

    it("filters scenarios by focusCategory when provided", () => {
      const code = `
        contract Test {
          mapping(address => uint) balances;
          function withdraw(uint amount) public {
            (bool success, ) = msg.sender.call{value: amount}("");
            balances[msg.sender] -= amount;
          }
        }
      `;
      const { user } = buildAdversarialPrompt(code, "reentrancy");
      expect(user).toContain("reentrancy");
      expect(user).toContain("Pre-Conditions");
    });

    it("provides general framework for clean contracts", () => {
      const code = `
        contract Clean {
          function add(uint a, uint b) public pure returns (uint) {
            return a + b;
          }
        }
      `;
      const { user } = buildAdversarialPrompt(code);
      expect(user).toContain("General Adversarial Analysis Framework");
      expect(user).toContain("State management vulnerabilities");
      expect(user).toContain("External call patterns");
    });

    it("includes contract code in user prompt", () => {
      const code = "contract Test {}";
      const { user } = buildAdversarialPrompt(code);
      expect(user).toContain("```solidity");
      expect(user).toContain("contract Test {}");
      expect(user).toContain("```");
    });

    it("includes analysis instructions", () => {
      const code = "contract Test {}";
      const { user } = buildAdversarialPrompt(code);
      expect(user).toContain("Analysis Instructions");
      expect(user).toContain("Verify pre-conditions");
      expect(user).toContain("Adapt the attack steps");
      expect(user).toContain("Identify the exact invariants");
      expect(user).toContain("Assess the likelihood");
      expect(user).toContain("Suggest defensive mitigations");
    });

    it("includes SCWE IDs in scenario context", () => {
      const code = `
        contract Vulnerable {
          mapping(address => uint) balances;
          function withdraw(uint amount) public {
            (bool success, ) = msg.sender.call{value: amount}("");
            balances[msg.sender] -= amount;
          }
        }
      `;
      const { user } = buildAdversarialPrompt(code);
      expect(user).toContain("SCWE-046");
    });

    it("includes real-world examples in scenario context", () => {
      const code = `
        contract Vulnerable {
          mapping(address => uint) balances;
          function withdraw(uint amount) public {
            (bool success, ) = msg.sender.call{value: amount}("");
            balances[msg.sender] -= amount;
          }
        }
      `;
      const { user } = buildAdversarialPrompt(code);
      expect(user).toContain("Real-World Example");
      expect(user).toContain("DAO");
    });
  });

  describe("registerAdversarialPrompts", () => {
    it("registers prompt without throwing", () => {
      expect(() => registerAdversarialPrompts(server)).not.toThrow();
    });

    it("registers prompt as 'adversarial_analysis'", () => {
      registerAdversarialPrompts(server);
      // @ts-expect-error — accessing private for testing
      const prompt = server._registeredPrompts["adversarial_analysis"];
      expect(prompt).toBeDefined();
    });

    it("prompt returns messages with correct structure", async () => {
      registerAdversarialPrompts(server);
      // @ts-expect-error — accessing private for testing
      const prompt = server._registeredPrompts["adversarial_analysis"];
      const result = await prompt.callback(
        { contractCode: "contract Test {}" },
        { requestId: "1" },
      );
      expect(result).toHaveProperty("messages");
      expect(Array.isArray(result.messages)).toBe(true);
      expect(result.messages.length).toBe(2);
      expect(result.messages[0]).toHaveProperty("role", "user");
      expect(result.messages[0]).toHaveProperty("content");
      expect(result.messages[1]).toHaveProperty("role", "user");
      expect(result.messages[1]).toHaveProperty("content");
    });

    it("prompt includes system instructions in first message", async () => {
      registerAdversarialPrompts(server);
      // @ts-expect-error — accessing private for testing
      const prompt = server._registeredPrompts["adversarial_analysis"];
      const result = await prompt.callback(
        { contractCode: "contract Test {}" },
        { requestId: "1" },
      );
      const firstMessage = result.messages[0];
      expect(firstMessage.content.type).toBe("text");
      expect(firstMessage.content.text).toContain("SYSTEM INSTRUCTIONS");
      expect(firstMessage.content.text).toContain("adversarial");
    });

    it("prompt includes contract code in second message", async () => {
      registerAdversarialPrompts(server);
      // @ts-expect-error — accessing private for testing
      const prompt = server._registeredPrompts["adversarial_analysis"];
      const result = await prompt.callback(
        { contractCode: "contract Test {}" },
        { requestId: "1" },
      );
      const secondMessage = result.messages[1];
      expect(secondMessage.content.type).toBe("text");
      expect(secondMessage.content.text).toContain("contract Test {}");
    });

    it("prompt respects focusCategory parameter", async () => {
      registerAdversarialPrompts(server);
      // @ts-expect-error — accessing private for testing
      const prompt = server._registeredPrompts["adversarial_analysis"];
      const result = await prompt.callback(
        {
          contractCode: "contract Test {}",
          focusCategory: "reentrancy",
        },
        { requestId: "1" },
      );
      const secondMessage = result.messages[1];
      expect(secondMessage.content.text).toContain("reentrancy");
    });
  });
});

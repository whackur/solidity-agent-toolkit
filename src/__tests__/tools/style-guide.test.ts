import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  checkAllRules,
  formatStyleViolations,
  STYLE_RULES,
  INDENTATION_RULE,
  MAX_LINE_LENGTH_RULE,
  BLANK_LINES_RULE,
  IMPORT_ORDER_RULE,
  FUNCTION_ORDER_RULE,
  MODIFIER_ORDER_RULE,
  NAMING_CONTRACT_RULE,
  NAMING_FUNCTION_RULE,
  NAMING_CONSTANT_RULE,
  NAMING_VARIABLE_RULE,
  WHITESPACE_RULE,
  NATSPEC_RULE,
} from "../../knowledge/style-rules.js";
import { registerStyleGuideTools } from "../../mcp/tools/style-guide.js";

vi.mock("child_process");

describe("Style Guide", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("STYLE_RULES", () => {
    it("has at least 9 rules", () => {
      expect(STYLE_RULES.length).toBeGreaterThanOrEqual(9);
    });

    it("all rules have required fields", () => {
      for (const rule of STYLE_RULES) {
        expect(rule.id).toBeDefined();
        expect(rule.name).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(typeof rule.check).toBe("function");
      }
    });
  });

  describe("INDENTATION_RULE", () => {
    it("detects tab indentation", () => {
      const code = "\tfunction foo() {}";
      const violations = INDENTATION_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe("style-indentation");
      expect(violations[0].line).toBe(1);
      expect(violations[0].fix).toContain("    ");
    });

    it("passes 4-space indentation", () => {
      const code = "    function foo() {}";
      const violations = INDENTATION_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("MAX_LINE_LENGTH_RULE", () => {
    it("detects lines over 120 characters", () => {
      const longLine = "a".repeat(121);
      const violations = MAX_LINE_LENGTH_RULE.check(longLine, [longLine]);
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe("style-max-line-length");
      expect(violations[0].message).toContain("121");
    });

    it("passes lines at 120 characters", () => {
      const line = "a".repeat(120);
      const violations = MAX_LINE_LENGTH_RULE.check(line, [line]);
      expect(violations).toHaveLength(0);
    });
  });

  describe("BLANK_LINES_RULE", () => {
    it("detects missing blank lines between top-level declarations", () => {
      const code = ["contract A {", "}", "contract B {", "}"].join("\n");
      const violations = BLANK_LINES_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe("style-blank-lines");
    });

    it("passes with 2 blank lines between top-level declarations", () => {
      const code = ["contract A {", "}", "", "", "contract B {", "}"].join("\n");
      const violations = BLANK_LINES_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("IMPORT_ORDER_RULE", () => {
    it("detects imports after non-import statements", () => {
      const code = [
        "pragma solidity ^0.8.0;",
        'import "./A.sol";',
        "contract Foo {}",
        'import "./B.sol";',
      ].join("\n");
      const violations = IMPORT_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].line).toBe(4);
    });

    it("passes with imports grouped at top", () => {
      const code = [
        "pragma solidity ^0.8.0;",
        'import "./A.sol";',
        'import "./B.sol";',
        "contract Foo {}",
      ].join("\n");
      const violations = IMPORT_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("FUNCTION_ORDER_RULE", () => {
    it("detects wrong function ordering", () => {
      const code = [
        "contract MyContract {",
        "    function foo() private {}",
        "    function bar() external {}",
        "}",
      ].join("\n");
      const violations = FUNCTION_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].ruleId).toBe("style-function-order");
      expect(violations[0].message).toContain("external");
    });

    it("passes correct function ordering", () => {
      const code = [
        "contract MyContract {",
        "    constructor() {}",
        "    function bar() external {}",
        "    function baz() public {}",
        "    function foo() private {}",
        "}",
      ].join("\n");
      const violations = FUNCTION_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });

    it("detects public before external", () => {
      const code = [
        "contract MyContract {",
        "    function foo() public {}",
        "    function bar() external {}",
        "}",
      ].join("\n");
      const violations = FUNCTION_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
    });

    it("detects view before state-changing within same visibility", () => {
      const code = [
        "contract MyContract {",
        "    function foo() external view returns (uint256) {}",
        "    function bar() external {}",
        "}",
      ].join("\n");
      const violations = FUNCTION_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain("external");
    });

    it("detects pure before view within same visibility", () => {
      const code = [
        "contract MyContract {",
        "    function foo() external pure returns (uint256) {}",
        "    function bar() external view returns (uint256) {}",
        "}",
      ].join("\n");
      const violations = FUNCTION_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
    });

    it("passes correct mutability ordering within same visibility", () => {
      const code = [
        "contract MyContract {",
        "    function a() external {}",
        "    function b() external view returns (uint256) {}",
        "    function c() external pure returns (uint256) {}",
        "}",
      ].join("\n");
      const violations = FUNCTION_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });

    it("passes full Solidity style guide ordering", () => {
      const code = [
        "contract MyContract {",
        "    constructor() {}",
        "    receive() external payable {}",
        "    fallback() external {}",
        "    function a() external {}",
        "    function b() external view returns (uint256) {}",
        "    function c() external pure returns (uint256) {}",
        "    function d() public {}",
        "    function e() public view returns (uint256) {}",
        "    function f() public pure returns (uint256) {}",
        "    function g() internal {}",
        "    function h() internal view returns (uint256) {}",
        "    function i() internal pure returns (uint256) {}",
        "    function j() private {}",
        "    function k() private view returns (uint256) {}",
        "    function l() private pure returns (uint256) {}",
        "}",
      ].join("\n");
      const violations = FUNCTION_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });

    it("detects private pure before internal", () => {
      const code = [
        "contract MyContract {",
        "    function foo() private pure returns (uint256) {}",
        "    function bar() internal {}",
        "}",
      ].join("\n");
      const violations = FUNCTION_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
    });
  });

  describe("MODIFIER_ORDER_RULE", () => {
    it("detects wrong modifier ordering", () => {
      const code = "    function foo() view public {}";
      const violations = MODIFIER_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain("public");
    });

    it("passes correct modifier ordering", () => {
      const code = "    function foo() public view {}";
      const violations = MODIFIER_ORDER_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("NAMING_CONTRACT_RULE", () => {
    it("detects non-PascalCase contract names", () => {
      const code = "contract my_contract {}";
      const violations = NAMING_CONTRACT_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain("PascalCase");
    });

    it("detects non-PascalCase struct names", () => {
      const code = "    struct my_struct {}";
      const violations = NAMING_CONTRACT_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
    });

    it("detects non-PascalCase event names", () => {
      const code = "    event transfer_event();";
      const violations = NAMING_CONTRACT_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
    });

    it("detects non-PascalCase enum names", () => {
      const code = "    enum status_type { Active, Inactive }";
      const violations = NAMING_CONTRACT_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
    });

    it("passes PascalCase names", () => {
      const code = [
        "contract MyContract {}",
        "    struct MyStruct {}",
        "    event Transfer();",
        "    enum Status { Active }",
      ].join("\n");
      const violations = NAMING_CONTRACT_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("NAMING_FUNCTION_RULE", () => {
    it("detects non-camelCase function names", () => {
      const code = "    function MyFunction() public {}";
      const violations = NAMING_FUNCTION_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain("camelCase");
    });

    it("detects non-camelCase modifier names", () => {
      const code = "    modifier OnlyOwner() {}";
      const violations = NAMING_FUNCTION_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
    });

    it("passes camelCase function names", () => {
      const code = "    function transfer() public {}";
      const violations = NAMING_FUNCTION_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });

    it("allows underscore-prefixed function names", () => {
      const code = "    function _internalHelper() internal {}";
      const violations = NAMING_FUNCTION_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("NAMING_CONSTANT_RULE", () => {
    it("detects non-UPPER_CASE constant names", () => {
      const code = "    uint256 public constant maxSupply = 1000;";
      const violations = NAMING_CONSTANT_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain("UPPER_CASE");
    });

    it("passes UPPER_CASE constant names", () => {
      const code = "    uint256 public constant MAX_SUPPLY = 1000;";
      const violations = NAMING_CONSTANT_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("NAMING_VARIABLE_RULE", () => {
    it("detects non-camelCase variable names", () => {
      const code = "    uint256 public TotalSupply;";
      const violations = NAMING_VARIABLE_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain("camelCase");
    });

    it("passes camelCase variable names", () => {
      const code = "    uint256 public totalSupply;";
      const violations = NAMING_VARIABLE_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });

    it("skips constant variables", () => {
      const code = "    uint256 constant MAX_SUPPLY = 1000;";
      const violations = NAMING_VARIABLE_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("WHITESPACE_RULE", () => {
    it("detects extra spaces inside parentheses", () => {
      const code = "function foo(  x,  y  ) {}";
      const violations = WHITESPACE_RULE.check(code, code.split("\n"));
      expect(violations.length).toBeGreaterThan(0);
    });

    it("passes normal spacing", () => {
      const code = "function foo(x, y) {}";
      const violations = WHITESPACE_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("NATSPEC_RULE", () => {
    it("detects missing NatSpec on public functions", () => {
      const code = ["contract MyContract {", "    function transfer() public {}", "}"].join("\n");
      const violations = NATSPEC_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
      expect(violations[0].message).toContain("NatSpec");
    });

    it("detects missing NatSpec on external functions", () => {
      const code = ["contract MyContract {", "    function transfer() external {}", "}"].join("\n");
      const violations = NATSPEC_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(1);
    });

    it("passes with NatSpec triple-slash comments", () => {
      const code = [
        "contract MyContract {",
        "    /// @notice Transfers tokens",
        "    function transfer() public {}",
        "}",
      ].join("\n");
      const violations = NATSPEC_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });

    it("passes with NatSpec block comments", () => {
      const code = [
        "contract MyContract {",
        "    /**",
        "     * @notice Transfers tokens",
        "     */",
        "    function transfer() public {}",
        "}",
      ].join("\n");
      const violations = NATSPEC_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });

    it("skips private/internal functions", () => {
      const code = [
        "contract MyContract {",
        "    function _helper() internal {}",
        "    function _secret() private {}",
        "}",
      ].join("\n");
      const violations = NATSPEC_RULE.check(code, code.split("\n"));
      expect(violations).toHaveLength(0);
    });
  });

  describe("checkAllRules", () => {
    it("returns violations sorted by line number", () => {
      const code = [
        "\tpragma solidity ^0.8.0;",
        "contract my_contract {",
        "    function MyFunc() public {}",
        "}",
      ].join("\n");
      const violations = checkAllRules(code);
      expect(violations.length).toBeGreaterThan(0);

      for (let i = 1; i < violations.length; i++) {
        expect(violations[i].line).toBeGreaterThanOrEqual(violations[i - 1].line);
      }
    });

    it("clean code passes all checks", () => {
      const code = [
        "// SPDX-License-Identifier: MIT",
        "pragma solidity ^0.8.0;",
        "",
        "contract MyContract {",
        "    uint256 public constant MAX_SUPPLY = 1000;",
        "    uint256 public totalSupply;",
        "",
        "    /// @notice Transfers tokens",
        "    function transfer() external {}",
        "",
        "    /// @notice Gets balance",
        "    function getBalance() public view returns (uint256) {}",
        "",
        "    function _helper() internal {}",
        "",
        "    function _secret() private {}",
        "}",
      ].join("\n");

      const violations = checkAllRules(code);
      expect(violations).toHaveLength(0);
    });

    it("each violation includes line number", () => {
      const code = ["\tcontract my_contract {", "    function MyFunc() public {}", "}"].join("\n");
      const violations = checkAllRules(code);
      for (const v of violations) {
        expect(v.line).toBeGreaterThan(0);
        expect(typeof v.line).toBe("number");
      }
    });
  });

  describe("formatStyleViolations", () => {
    it("formats empty violations", () => {
      const result = formatStyleViolations([]);
      expect(result).toContain("No style violations found");
    });

    it("formats violations with count and grouping", () => {
      const violations = [
        {
          ruleId: "style-indentation",
          line: 1,
          message: "Use 4 spaces",
          severity: "warning" as const,
          fix: "Replace tabs",
        },
        {
          ruleId: "style-max-line-length",
          line: 5,
          message: "Line too long",
          severity: "warning" as const,
        },
      ];
      const result = formatStyleViolations(violations);
      expect(result).toContain("Found 2 style violation(s)");
      expect(result).toContain("style-indentation");
      expect(result).toContain("Line 1");
      expect(result).toContain("Line 5");
      expect(result).toContain("Fix: Replace tabs");
    });
  });

  describe("Tool Registration", () => {
    let mockServer: McpServer;
    let registeredTools: Map<string, any>;

    beforeEach(() => {
      registeredTools = new Map();
      mockServer = {
        tool: vi.fn((name: string, description: string, schema: any, handler: any) => {
          registeredTools.set(name, { description, schema, handler });
        }),
      } as any;
    });

    it("registers check_style tool", () => {
      registerStyleGuideTools(mockServer);
      expect(registeredTools.has("check_style")).toBe(true);
    });

    it("registers format_code tool", () => {
      registerStyleGuideTools(mockServer);
      expect(registeredTools.has("format_code")).toBe(true);
    });

    it.skip("check_style has readOnlyHint annotation", () => {
      registerStyleGuideTools(mockServer);
      const tool = registeredTools.get("check_style");
      expect(tool.schema.annotations?.readOnlyHint).toBe(true);
    });

    it.skip("format_code has idempotentHint annotation", () => {
      registerStyleGuideTools(mockServer);
      const tool = registeredTools.get("format_code");
      expect(tool.schema.annotations?.idempotentHint).toBe(true);
    });

    it("check_style returns violations for bad code", async () => {
      registerStyleGuideTools(mockServer);
      const tool = registeredTools.get("check_style");

      const result = await tool.handler({
        code: "\tcontract my_contract {\n    function MyFunc() public {}\n}",
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("style violation");
    });

    it("check_style returns no violations for clean code", async () => {
      registerStyleGuideTools(mockServer);
      const tool = registeredTools.get("check_style");

      const result = await tool.handler({
        code: [
          "// SPDX-License-Identifier: MIT",
          "pragma solidity ^0.8.0;",
          "",
          "contract MyContract {",
          "    /// @notice Gets value",
          "    function getValue() external view returns (uint256) {}",
          "}",
        ].join("\n"),
      });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toContain("No style violations found");
    });

    it("format_code returns error when forge not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("forge not found");
      });

      registerStyleGuideTools(mockServer);
      const tool = registeredTools.get("format_code");
      const result = await tool.handler({ code: "contract Foo {}" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("forge fmt is not available");
    });

    it("format_code returns formatted code when forge is available", async () => {
      const formattedCode = "contract Foo {\n}\n";
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge fmt")) {
          return formattedCode as any;
        }
        return Buffer.from("");
      });

      registerStyleGuideTools(mockServer);
      const tool = registeredTools.get("format_code");
      const result = await tool.handler({ code: "contract Foo{}" });

      expect(result.isError).toBe(false);
      expect(result.content[0].text).toBe(formattedCode);
    });

    it("format_code handles forge fmt errors", async () => {
      vi.mocked(execSync).mockImplementation((cmd) => {
        if (cmd === "forge --version") {
          return Buffer.from("forge 0.2.0\n");
        }
        if (typeof cmd === "string" && cmd.includes("forge fmt")) {
          const error: any = new Error("Parse error");
          error.stderr = "Error: Could not parse";
          throw error;
        }
        return Buffer.from("");
      });

      registerStyleGuideTools(mockServer);
      const tool = registeredTools.get("format_code");
      const result = await tool.handler({ code: "invalid solidity {{{{" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("forge fmt error");
    });
  });
});

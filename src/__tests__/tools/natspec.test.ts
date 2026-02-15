import { describe, it, expect } from "vitest";
import {
  parseFunctions,
  extractNatSpec,
  validateNatSpec,
  generateNatSpec,
} from "../../mcp/tools/natspec.js";

describe("parseFunctions", () => {
  it("parses simple public function", () => {
    const code = `
contract Test {
    function transfer(address to, uint256 amount) public returns (bool) {
        return true;
    }
}`;
    const functions = parseFunctions(code);
    expect(functions).toHaveLength(1);
    expect(functions[0].name).toBe("transfer");
    expect(functions[0].visibility).toBe("public");
    expect(functions[0].params).toHaveLength(2);
    expect(functions[0].params[0]).toEqual({ name: "to", type: "address" });
    expect(functions[0].params[1]).toEqual({ name: "amount", type: "uint256" });
    expect(functions[0].returns).toHaveLength(1);
    expect(functions[0].returns[0].type).toBe("bool");
  });

  it("parses external function", () => {
    const code = `
contract Test {
    function getData() external view returns (uint256) {
        return 42;
    }
}`;
    const functions = parseFunctions(code);
    expect(functions).toHaveLength(1);
    expect(functions[0].name).toBe("getData");
    expect(functions[0].visibility).toBe("external");
  });

  it("parses internal function", () => {
    const code = `
contract Test {
    function _helper() internal pure returns (bool) {
        return true;
    }
}`;
    const functions = parseFunctions(code);
    expect(functions).toHaveLength(1);
    expect(functions[0].visibility).toBe("internal");
  });

  it("parses private function", () => {
    const code = `
contract Test {
    function _secret() private {
    }
}`;
    const functions = parseFunctions(code);
    expect(functions).toHaveLength(1);
    expect(functions[0].visibility).toBe("private");
  });

  it("parses function with no parameters", () => {
    const code = `
contract Test {
    function getValue() public view returns (uint256) {
        return 42;
    }
}`;
    const functions = parseFunctions(code);
    expect(functions[0].params).toHaveLength(0);
  });

  it("parses function with no return value", () => {
    const code = `
contract Test {
    function doSomething() public {
    }
}`;
    const functions = parseFunctions(code);
    expect(functions[0].returns).toHaveLength(0);
  });

  it("parses function with multiple return values", () => {
    const code = `
contract Test {
    function getValues() public returns (uint256, bool, address) {
        return (42, true, msg.sender);
    }
}`;
    const functions = parseFunctions(code);
    expect(functions[0].returns).toHaveLength(3);
    expect(functions[0].returns[0].type).toBe("uint256");
    expect(functions[0].returns[1].type).toBe("bool");
    expect(functions[0].returns[2].type).toBe("address");
  });

  it("parses function with named return values", () => {
    const code = `
contract Test {
    function getValues() public returns (uint256 value, bool success) {
        return (42, true);
    }
}`;
    const functions = parseFunctions(code);
    expect(functions[0].returns).toHaveLength(2);
    expect(functions[0].returns[0]).toEqual({ type: "uint256", name: "value" });
    expect(functions[0].returns[1]).toEqual({ type: "bool", name: "success" });
  });

  it("parses multiple functions", () => {
    const code = `
contract Test {
    function foo() public {}
    function bar() external {}
    function baz() internal {}
}`;
    const functions = parseFunctions(code);
    expect(functions).toHaveLength(3);
    expect(functions[0].name).toBe("foo");
    expect(functions[1].name).toBe("bar");
    expect(functions[2].name).toBe("baz");
  });

  it("parses function with modifiers", () => {
    const code = `
contract Test {
    function transfer(address to) public onlyOwner whenNotPaused returns (bool) {
        return true;
    }
}`;
    const functions = parseFunctions(code);
    expect(functions).toHaveLength(1);
    expect(functions[0].name).toBe("transfer");
    expect(functions[0].visibility).toBe("public");
  });

  it("tracks correct line numbers", () => {
    const code = `contract Test {
    function first() public {}
    
    function second() external {}
}`;
    const functions = parseFunctions(code);
    expect(functions[0].line).toBe(2);
    expect(functions[1].line).toBe(4);
  });
});

describe("extractNatSpec", () => {
  it("extracts single-line NatSpec with ///", () => {
    const code = `
contract Test {
    /// @notice Transfer tokens to an address
    /// @param to The recipient address
    /// @return success Whether the transfer succeeded
    function transfer(address to) public returns (bool success) {
        return true;
    }
}`;
    const natspec = extractNatSpec(code, 6);
    expect(natspec.notice).toBe("Transfer tokens to an address");
    expect(natspec.params.get("to")).toBe("The recipient address");
    expect(natspec.returns).toBe("success Whether the transfer succeeded");
  });

  it("extracts multi-line NatSpec with /** */", () => {
    const code = `
contract Test {
    /**
     * @notice Transfer tokens to an address
     * @param to The recipient address
     * @return Whether the transfer succeeded
     */
    function transfer(address to) public returns (bool) {
        return true;
    }
}`;
    const natspec = extractNatSpec(code, 8);
    expect(natspec.notice).toBe("Transfer tokens to an address");
    expect(natspec.params.get("to")).toBe("The recipient address");
    expect(natspec.returns).toBe("Whether the transfer succeeded");
  });

  it("extracts multiple @param tags", () => {
    const code = `
contract Test {
    /// @notice Transfer tokens
    /// @param from The sender address
    /// @param to The recipient address
    /// @param amount The amount to transfer
    function transferFrom(address from, address to, uint256 amount) public {
    }
}`;
    const natspec = extractNatSpec(code, 7);
    expect(natspec.params.size).toBe(3);
    expect(natspec.params.get("from")).toBe("The sender address");
    expect(natspec.params.get("to")).toBe("The recipient address");
    expect(natspec.params.get("amount")).toBe("The amount to transfer");
  });

  it("returns empty doc when no NatSpec present", () => {
    const code = `
contract Test {
    function transfer(address to) public {
    }
}`;
    const natspec = extractNatSpec(code, 3);
    expect(natspec.notice).toBeUndefined();
    expect(natspec.params.size).toBe(0);
    expect(natspec.returns).toBeUndefined();
  });

  it("stops at non-comment lines", () => {
    const code = `
contract Test {
    uint256 public value;
    
    function transfer(address to) public {
    }
}`;
    const natspec = extractNatSpec(code, 6);
    expect(natspec.notice).toBeUndefined();
  });
});

describe("validateNatSpec", () => {
  it("detects missing @notice on public function", () => {
    const code = `
contract Test {
    function transfer(address to) public {
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(1);
    expect(issues[0].functionName).toBe("transfer");
    expect(issues[0].missing).toContain("notice");
    expect(issues[0].severity).toBe("error");
  });

  it("detects missing @param on public function", () => {
    const code = `
contract Test {
    /// @notice Transfer tokens
    function transfer(address to, uint256 amount) public {
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(1);
    expect(issues[0].missing).toContain("param");
  });

  it("detects missing @return on public function", () => {
    const code = `
contract Test {
    /// @notice Transfer tokens
    /// @param to The recipient
    function transfer(address to) public returns (bool) {
        return true;
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(1);
    expect(issues[0].missing).toContain("return");
  });

  it("detects multiple missing tags", () => {
    const code = `
contract Test {
    function transfer(address to) public returns (bool) {
        return true;
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(1);
    expect(issues[0].missing).toContain("notice");
    expect(issues[0].missing).toContain("param");
    expect(issues[0].missing).toContain("return");
  });

  it("validates external functions", () => {
    const code = `
contract Test {
    function getData() external returns (uint256) {
        return 42;
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(1);
    expect(issues[0].functionName).toBe("getData");
  });

  it("ignores internal functions", () => {
    const code = `
contract Test {
    function _helper() internal {
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(0);
  });

  it("ignores private functions", () => {
    const code = `
contract Test {
    function _secret() private {
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(0);
  });

  it("passes when all NatSpec is complete", () => {
    const code = `
contract Test {
    /// @notice Transfer tokens to an address
    /// @param to The recipient address
    /// @param amount The amount to transfer
    /// @return success Whether the transfer succeeded
    function transfer(address to, uint256 amount) public returns (bool success) {
        return true;
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(0);
  });

  it("passes when function has no parameters or return", () => {
    const code = `
contract Test {
    /// @notice Increment the counter
    function increment() public {
    }
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(0);
  });

  it("validates multiple functions", () => {
    const code = `
contract Test {
    /// @notice Good function
    function good() public {}
    
    function bad() public {}
}`;
    const issues = validateNatSpec(code);
    expect(issues).toHaveLength(1);
    expect(issues[0].functionName).toBe("bad");
  });
});

describe("generateNatSpec", () => {
  it("generates @notice template for function without NatSpec", () => {
    const code = `contract Test {
    function transfer(address to) public {
    }
}`;
    const result = generateNatSpec(code);
    expect(result).toContain("/// @notice [Description of what function does]");
    expect(result).toContain("/// @param to [Description]");
  });

  it("generates @param templates for all parameters", () => {
    const code = `contract Test {
    function transfer(address to, uint256 amount) public {
    }
}`;
    const result = generateNatSpec(code);
    expect(result).toContain("/// @param to [Description]");
    expect(result).toContain("/// @param amount [Description]");
  });

  it("generates @return template when function returns value", () => {
    const code = `contract Test {
    function getValue() public returns (uint256) {
        return 42;
    }
}`;
    const result = generateNatSpec(code);
    expect(result).toContain("/// @return [Description of return value]");
  });

  it("preserves existing code", () => {
    const code = `contract Test {
    uint256 public value;
    
    function getValue() public returns (uint256) {
        return value;
    }
}`;
    const result = generateNatSpec(code);
    expect(result).toContain("uint256 public value;");
    expect(result).toContain("function getValue()");
    expect(result).toContain("return value;");
  });

  it("preserves existing NatSpec", () => {
    const code = `contract Test {
    /// @notice Get the value
    function getValue() public returns (uint256) {
        return 42;
    }
}`;
    const result = generateNatSpec(code);
    expect(result).toContain("/// @notice Get the value");
  });

  it("only adds missing NatSpec tags", () => {
    const code = `contract Test {
    /// @notice Transfer tokens
    function transfer(address to) public returns (bool) {
        return true;
    }
}`;
    const result = generateNatSpec(code);
    expect(result).toContain("/// @notice Transfer tokens");
    expect(result).toContain("/// @param to [Description]");
    expect(result).toContain("/// @return [Description of return value]");
  });

  it("maintains proper indentation", () => {
    const code = `contract Test {
    function transfer(address to) public {
    }
}`;
    const result = generateNatSpec(code);
    const lines = result.split("\n");
    const noticeLineIndex = lines.findIndex((l) => l.includes("@notice"));
    const functionLineIndex = lines.findIndex((l) => l.includes("function transfer"));

    expect(noticeLineIndex).toBeGreaterThan(-1);
    expect(functionLineIndex).toBeGreaterThan(noticeLineIndex);

    const noticeIndent = lines[noticeLineIndex].match(/^(\s*)/)?.[1] || "";
    const functionIndent = lines[functionLineIndex].match(/^(\s*)/)?.[1] || "";
    expect(noticeIndent).toBe(functionIndent);
  });

  it("does not generate for internal functions", () => {
    const code = `contract Test {
    function _helper() internal {
    }
}`;
    const result = generateNatSpec(code);
    expect(result).not.toContain("@notice");
    expect(result).toBe(code);
  });

  it("does not generate for private functions", () => {
    const code = `contract Test {
    function _secret() private {
    }
}`;
    const result = generateNatSpec(code);
    expect(result).not.toContain("@notice");
    expect(result).toBe(code);
  });

  it("handles multiple functions", () => {
    const code = `contract Test {
    function first() public {}
    
    function second() external returns (bool) {
        return true;
    }
}`;
    const result = generateNatSpec(code);
    const noticeCount = (result.match(/@notice/g) || []).length;
    expect(noticeCount).toBe(2);
  });

  it("generates complete template for complex function", () => {
    const code = `contract Test {
    function transferFrom(address from, address to, uint256 amount) public returns (bool success) {
        return true;
    }
}`;
    const result = generateNatSpec(code);
    expect(result).toContain("/// @notice [Description of what function does]");
    expect(result).toContain("/// @param from [Description]");
    expect(result).toContain("/// @param to [Description]");
    expect(result).toContain("/// @param amount [Description]");
    expect(result).toContain("/// @return [Description of return value]");
  });
});

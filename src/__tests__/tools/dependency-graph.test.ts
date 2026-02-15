import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { extractDependencies, formatDependencyGraph } from "../../core/dependency-graph.js";
import { registerContractAnalysisTools } from "../../mcp/tools/contract-analysis.js";

describe("extractDependencies", () => {
  it("should extract direct import", () => {
    const code = `import "./Foo.sol";`;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(1);
    expect(graph.imports[0]).toEqual({
      type: "import",
      source: "./Foo.sol",
      symbols: ["*"],
      line: 1,
    });
  });

  it("should extract named imports", () => {
    const code = `import {Bar, Baz} from "./Lib.sol";`;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(1);
    expect(graph.imports[0]).toEqual({
      type: "import",
      source: "./Lib.sol",
      symbols: ["Bar", "Baz"],
      line: 1,
    });
  });

  it("should extract aliased import", () => {
    const code = `import SafeMath from "./SafeMath.sol";`;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(1);
    expect(graph.imports[0]).toEqual({
      type: "import",
      source: "./SafeMath.sol",
      symbols: ["SafeMath"],
      line: 1,
    });
  });

  it("should extract single inheritance", () => {
    const code = `contract A is B {
      function foo() public {}
    }`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(1);
    expect(graph.inheritance[0]).toEqual({
      type: "inheritance",
      parent: "B",
      child: "A",
      line: 1,
    });
  });

  it("should extract multiple inheritance", () => {
    const code = `contract A is B, C {
      function foo() public {}
    }`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(2);
    expect(graph.inheritance[0]).toEqual({
      type: "inheritance",
      parent: "B",
      child: "A",
      line: 1,
    });
    expect(graph.inheritance[1]).toEqual({
      type: "inheritance",
      parent: "C",
      child: "A",
      line: 1,
    });
  });

  it("should extract interface inheritance", () => {
    const code = `interface IFoo is IERC20 {
      function bar() external;
    }`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(1);
    expect(graph.inheritance[0]).toEqual({
      type: "inheritance",
      parent: "IERC20",
      child: "IFoo",
      line: 1,
    });
  });

  it("should extract abstract contract inheritance", () => {
    const code = `abstract contract Base is Ownable {
      function foo() public virtual;
    }`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(1);
    expect(graph.inheritance[0]).toEqual({
      type: "inheritance",
      parent: "Ownable",
      child: "Base",
      line: 1,
    });
  });

  it("should extract library usage", () => {
    const code = `using SafeMath for uint256;`;
    const graph = extractDependencies(code);

    expect(graph.libraries).toHaveLength(1);
    expect(graph.libraries[0]).toEqual({
      type: "library",
      library: "SafeMath",
      forType: "uint256",
      line: 1,
    });
  });

  it("should identify external dependencies", () => {
    const code = `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";`;
    const graph = extractDependencies(code);

    expect(graph.externalDependencies).toContain("@openzeppelin/contracts/token/ERC20/ERC20.sol");
    expect(graph.imports[0].source).toBe("@openzeppelin/contracts/token/ERC20/ERC20.sol");
  });

  it("should handle empty code", () => {
    const graph = extractDependencies("");

    expect(graph.imports).toHaveLength(0);
    expect(graph.inheritance).toHaveLength(0);
    expect(graph.libraries).toHaveLength(0);
    expect(graph.externalDependencies).toHaveLength(0);
    expect(graph.summary.totalImports).toBe(0);
    expect(graph.summary.totalInheritance).toBe(0);
    expect(graph.summary.totalLibraries).toBe(0);
    expect(graph.summary.maxInheritanceDepth).toBe(0);
  });

  it("should handle code with no dependencies", () => {
    const code = `contract Simple {
      uint256 public value;
      function setValue(uint256 _value) public {
        value = _value;
      }
    }`;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(0);
    expect(graph.inheritance).toHaveLength(0);
    expect(graph.libraries).toHaveLength(0);
    expect(graph.summary.totalImports).toBe(0);
    expect(graph.summary.totalInheritance).toBe(0);
    expect(graph.summary.totalLibraries).toBe(0);
  });

  it("should calculate max inheritance depth correctly", () => {
    const code = `
      contract A is B, C, D {
        function foo() public {}
      }
      contract E is F {
        function bar() public {}
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.summary.maxInheritanceDepth).toBe(3);
  });

  it("should handle multiple contracts with inheritance", () => {
    const code = `
      contract Token is ERC20, Ownable {
        constructor() {}
      }
      contract Vault is ReentrancyGuard {
        function deposit() public {}
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(3);
    expect(graph.inheritance.some((d) => d.child === "Token" && d.parent === "ERC20")).toBe(true);
    expect(graph.inheritance.some((d) => d.child === "Token" && d.parent === "Ownable")).toBe(true);
    expect(
      graph.inheritance.some((d) => d.child === "Vault" && d.parent === "ReentrancyGuard"),
    ).toBe(true);
  });

  it("should handle complex contract with all dependency types", () => {
    const code = `
      import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
      import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
      import SafeMath from "./SafeMath.sol";
      
      using SafeMath for uint256;
      using Address for address;
      
      contract MyToken is ERC20, Ownable {
        uint256 public totalSupply;
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(3);
    expect(graph.inheritance).toHaveLength(2);
    expect(graph.libraries).toHaveLength(2);
    expect(graph.externalDependencies).toHaveLength(2);
    expect(graph.summary.totalImports).toBe(3);
    expect(graph.summary.totalInheritance).toBe(2);
    expect(graph.summary.totalLibraries).toBe(2);
  });

  it("should deduplicate external dependencies", () => {
    const code = `
      import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
      import {IERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
    `;
    const graph = extractDependencies(code);

    expect(graph.externalDependencies).toHaveLength(1);
    expect(graph.externalDependencies[0]).toBe("@openzeppelin/contracts/token/ERC20/ERC20.sol");
  });
});

describe("formatDependencyGraph", () => {
  it("should include Mermaid diagram syntax", () => {
    const code = `contract A is B {
      function foo() public {}
    }`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("```mermaid");
    expect(formatted).toContain("graph TD");
    expect(formatted).toContain("```");
  });

  it("should format inheritance relationships", () => {
    const code = `contract A is B {
      function foo() public {}
    }`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("A -->|inherits| B");
  });

  it("should format import relationships", () => {
    const code = `import "./Foo.sol";`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain('Contract -.->|imports| "Foo"');
  });

  it("should format library usage", () => {
    const code = `using SafeMath for uint256;`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("Contract -.->|uses| SafeMath");
  });

  it("should include summary table", () => {
    const code = `
      import "./Foo.sol";
      contract A is B {
        function foo() public {}
      }
      using SafeMath for uint256;
    `;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("## Summary");
    expect(formatted).toContain("| Total Imports | 1 |");
    expect(formatted).toContain("| Total Inheritance | 1 |");
    expect(formatted).toContain("| Total Libraries | 1 |");
  });

  it("should include detailed sections", () => {
    const code = `
      import "./Foo.sol";
      contract A is B {
        function foo() public {}
      }
      using SafeMath for uint256;
    `;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("## Imports");
    expect(formatted).toContain("## Inheritance");
    expect(formatted).toContain("## Library Usage");
  });

  it("should list external dependencies", () => {
    const code = `import "@openzeppelin/contracts/token/ERC20/ERC20.sol";`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("## External Dependencies");
    expect(formatted).toContain("`@openzeppelin/contracts/token/ERC20/ERC20.sol`");
  });

  it("should handle empty graph gracefully", () => {
    const graph = extractDependencies("");
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("# Contract Dependency Graph");
    expect(formatted).toContain("## Summary");
    expect(formatted).toContain("| Total Imports | 0 |");
  });
});

describe("registerContractAnalysisTools", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
    vi.clearAllMocks();
  });

  it("should register extract_contract_dependencies tool", () => {
    registerContractAnalysisTools(server);

    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    expect(tool).toBeDefined();
  });

  it("should not throw during registration", () => {
    expect(() => registerContractAnalysisTools(server)).not.toThrow();
  });

  it("should return formatted graph from tool", async () => {
    registerContractAnalysisTools(server);

    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    expect(tool).toBeDefined();

    const code = `contract A is B {
      function foo() public {}
    }`;

    const result = await tool.handler({ analysis: "dependencies", code });

    expect(result.isError).toBe(false);
    expect(result.content).toHaveLength(1);
    expect(result.content[0].type).toBe("text");
    expect(result.content[0].text).toContain("# Contract Dependency Graph");
    expect(result.content[0].text).toContain("graph TD");
  });
});

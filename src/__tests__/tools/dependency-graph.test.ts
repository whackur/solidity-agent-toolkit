import { describe, it, expect, beforeEach, vi } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { extractDependencies, formatDependencyGraph } from "../../core/dependency-graph.js";
import {
  computeC3Linearization,
  computeMaxInheritanceDepth,
} from "../../core/dependency-linearization.js";
import { registerContractAnalysisTools } from "../../mcp/tools/contract-analysis.js";

describe("extractDependencies", () => {
  it("should extract direct import", () => {
    const code = `import "./Foo.sol";`;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(1);
    expect(graph.imports[0]).toMatchObject({
      type: "import",
      source: "./Foo.sol",
      symbols: ["*"],
    });
  });

  it("should extract named imports", () => {
    const code = `import {Bar, Baz} from "./Lib.sol";`;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(1);
    expect(graph.imports[0]).toMatchObject({
      type: "import",
      source: "./Lib.sol",
      symbols: ["Bar", "Baz"],
    });
  });

  it("should extract aliased import", () => {
    const code = `import "./SafeMath.sol" as SafeMath;`;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(1);
    expect(graph.imports[0]).toMatchObject({
      type: "import",
      source: "./SafeMath.sol",
      symbols: ["SafeMath"],
    });
  });

  it("should extract single inheritance", () => {
    const code = `contract A is B {
      function foo() public {}
    }`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(1);
    expect(graph.inheritance[0]).toMatchObject({
      type: "inheritance",
      parent: "B",
      child: "A",
    });
  });

  it("should extract multiple inheritance", () => {
    const code = `contract A is B, C {
      function foo() public {}
    }`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(2);
    expect(graph.inheritance[0]).toMatchObject({ parent: "B", child: "A" });
    expect(graph.inheritance[1]).toMatchObject({ parent: "C", child: "A" });
  });

  it("should extract interface inheritance", () => {
    const code = `interface IFoo is IERC20 {
      function bar() external;
    }`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(1);
    expect(graph.inheritance[0]).toMatchObject({ parent: "IERC20", child: "IFoo" });
  });

  it("should extract abstract contract inheritance", () => {
    const code = `abstract contract Base is Ownable {
      function foo() public virtual;
    }`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(1);
    expect(graph.inheritance[0]).toMatchObject({ parent: "Ownable", child: "Base" });
  });

  it("should extract library usage", () => {
    const code = `contract Token { using SafeMath for uint256; }`;
    const graph = extractDependencies(code);

    expect(graph.libraries).toHaveLength(1);
    expect(graph.libraries[0]).toMatchObject({
      type: "library",
      library: "SafeMath",
      forType: "uint256",
      inContract: "Token",
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
    expect(graph.contracts).toHaveLength(0);
    expect(graph.associations).toHaveLength(0);
    expect(graph.externalDependencies).toHaveLength(0);
    expect(graph.summary.totalImports).toBe(0);
    expect(graph.summary.totalInheritance).toBe(0);
    expect(graph.summary.totalLibraries).toBe(0);
    expect(graph.summary.totalContracts).toBe(0);
    expect(graph.summary.totalAssociations).toBe(0);
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

  it("should calculate max inheritance depth as tree depth (flat)", () => {
    const code = `
      contract B {} contract C {} contract D {}
      contract A is B, C, D {
        function foo() public {}
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.summary.maxInheritanceDepth).toBe(1);
  });

  it("should calculate max inheritance depth as tree depth (chain)", () => {
    const code = `
      contract C {}
      contract B is C {}
      contract A is B {}
    `;
    const graph = extractDependencies(code);

    expect(graph.summary.maxInheritanceDepth).toBe(2);
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

      contract MyToken is ERC20, Ownable {
        using SafeMath for uint256;
        uint256 public totalSupply;
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.imports).toHaveLength(2);
    expect(graph.inheritance).toHaveLength(2);
    expect(graph.libraries).toHaveLength(1);
    expect(graph.externalDependencies).toHaveLength(2);
    expect(graph.summary.totalImports).toBe(2);
    expect(graph.summary.totalInheritance).toBe(2);
    expect(graph.summary.totalLibraries).toBe(1);
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

  it("should detect contract types", () => {
    const code = `
      contract Foo {}
      interface IBar { function bar() external; }
      library Lib { function add(uint256 a, uint256 b) internal pure returns (uint256) { return a + b; } }
      abstract contract Base { function foo() public virtual; }
    `;
    const graph = extractDependencies(code);

    expect(graph.contracts).toHaveLength(4);
    expect(graph.contracts.find((c) => c.name === "Foo")?.kind).toBe("contract");
    expect(graph.contracts.find((c) => c.name === "IBar")?.kind).toBe("interface");
    expect(graph.contracts.find((c) => c.name === "Lib")?.kind).toBe("library");
    expect(graph.contracts.find((c) => c.name === "Base")?.kind).toBe("abstract");
  });

  it("should clean constructor args from inheritance (AST-native)", () => {
    const code = `contract A is Ownable(msg.sender), ERC20("Token", "TKN") {}`;
    const graph = extractDependencies(code);

    expect(graph.inheritance).toHaveLength(2);
    expect(graph.inheritance[0].parent).toBe("Ownable");
    expect(graph.inheritance[1].parent).toBe("ERC20");
  });

  it("should detect state variable association", () => {
    const code = `
      interface IERC20 { function totalSupply() external view returns (uint256); }
      contract Vault {
        IERC20 public token;
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.associations).toHaveLength(1);
    expect(graph.associations[0]).toMatchObject({
      type: "association",
      from: "Vault",
      to: "IERC20",
      associationType: "state_variable",
    });
  });

  it("should detect new expression composition", () => {
    const code = `
      contract Child {}
      contract Factory {
        function create() public { Child c = new Child(); }
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.associations).toHaveLength(1);
    expect(graph.associations[0]).toMatchObject({
      type: "association",
      from: "Factory",
      to: "Child",
      associationType: "composition",
    });
  });

  it("should not create association for non-contract state var types", () => {
    const code = `
      contract Foo {
        uint256 public value;
        address public owner;
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.associations).toHaveLength(0);
  });

  it("should compute C3 linearization", () => {
    const code = `
      contract A {}
      contract B is A {}
      contract C is A {}
      contract D is B, C {}
    `;
    const graph = extractDependencies(code);

    expect(graph.linearization["D"]).toEqual(["D", "C", "B", "A"]);
    expect(graph.linearization["B"]).toEqual(["B", "A"]);
    expect(graph.linearization["C"]).toEqual(["C", "A"]);
    expect(graph.linearization["A"]).toEqual(["A"]);
  });

  it("should compute C3 linearization for chain", () => {
    const code = `
      contract C {}
      contract B is C {}
      contract A is B {}
    `;
    const graph = extractDependencies(code);

    expect(graph.linearization["A"]).toEqual(["A", "B", "C"]);
  });

  it("should handle graceful parse error", () => {
    const graph = extractDependencies("not valid solidity at all %%%");

    expect(graph.parseError).toBeDefined();
    expect(graph.imports).toHaveLength(0);
    expect(graph.contracts).toHaveLength(0);
    expect(graph.inheritance).toHaveLength(0);
  });

  it("should track library usage scope", () => {
    const code = `
      contract Token {
        using SafeMath for uint256;
      }
    `;
    const graph = extractDependencies(code);

    expect(graph.libraries[0].inContract).toBe("Token");
  });

  it("should handle file-level library usage", () => {
    const code = `
      using SafeMath for uint256;
      contract Token {}
    `;
    const graph = extractDependencies(code);

    expect(graph.libraries[0].inContract).toBeUndefined();
  });
});

describe("computeC3Linearization", () => {
  it("should linearize diamond inheritance", () => {
    const map = { D: ["B", "C"], B: ["A"], C: ["A"], A: [] };
    const result = computeC3Linearization(map);

    expect(result["D"]).toEqual(["D", "C", "B", "A"]);
    expect(result["B"]).toEqual(["B", "A"]);
    expect(result["C"]).toEqual(["C", "A"]);
    expect(result["A"]).toEqual(["A"]);
  });

  it("should linearize simple chain", () => {
    const map = { A: ["B"], B: ["C"], C: [] };
    const result = computeC3Linearization(map);

    expect(result["A"]).toEqual(["A", "B", "C"]);
  });

  it("should handle contracts with no parents", () => {
    const map = { A: [] };
    const result = computeC3Linearization(map);

    expect(result["A"]).toEqual(["A"]);
  });

  it("should handle empty map", () => {
    const result = computeC3Linearization({});
    expect(result).toEqual({});
  });

  it("should linearize flat inheritance", () => {
    const map = { A: ["B", "C", "D"], B: [], C: [], D: [] };
    const result = computeC3Linearization(map);

    expect(result["A"]).toEqual(["A", "D", "C", "B"]);
  });
});

describe("computeMaxInheritanceDepth", () => {
  it("should return 0 for no inheritance", () => {
    expect(computeMaxInheritanceDepth({ A: [] })).toBe(0);
  });

  it("should return 0 for empty map", () => {
    expect(computeMaxInheritanceDepth({})).toBe(0);
  });

  it("should return 1 for flat inheritance", () => {
    expect(computeMaxInheritanceDepth({ A: ["B", "C", "D"], B: [], C: [], D: [] })).toBe(1);
  });

  it("should return 2 for chain of length 2", () => {
    expect(computeMaxInheritanceDepth({ A: ["B"], B: ["C"], C: [] })).toBe(2);
  });

  it("should return 2 for diamond inheritance", () => {
    expect(computeMaxInheritanceDepth({ D: ["B", "C"], B: ["A"], C: ["A"], A: [] })).toBe(2);
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

  it("should format inheritance relationships with actual names", () => {
    const code = `contract A is B {
      function foo() public {}
    }`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("A -->|inherits| B");
  });

  it("should use stadium shape for interface", () => {
    const code = `interface IFoo { function bar() external; }`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("IFoo([IFoo])");
  });

  it("should use hexagon shape for library", () => {
    const code = `library SafeMath { function add(uint256 a, uint256 b) internal pure returns (uint256) { return a + b; } }`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("SafeMath{{SafeMath}}");
  });

  it("should use parallelogram shape for abstract contract", () => {
    const code = `abstract contract Base { function foo() public virtual; }`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("Base[/Base/]");
  });

  it("should format library usage with contract scope", () => {
    const code = `contract Token { using SafeMath for uint256; }`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("Token -.->|uses| SafeMath");
  });

  it("should format associations", () => {
    const code = `
      contract Child {}
      contract Factory {
        function create() public { Child c = new Child(); }
      }
    `;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("Factory ==>|creates| Child");
  });

  it("should include summary table with all metrics", () => {
    const code = `
      import "./Foo.sol";
      contract A is B {
        function foo() public {}
      }
    `;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("## Summary");
    expect(formatted).toContain("| Contracts |");
    expect(formatted).toContain("| Imports |");
    expect(formatted).toContain("| Inheritance |");
  });

  it("should include contracts section", () => {
    const code = `contract Foo {} interface IBar { function x() external; }`;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("## Contracts");
    expect(formatted).toContain("`Foo` (contract,");
    expect(formatted).toContain("`IBar` (interface,");
  });

  it("should include C3 linearization section", () => {
    const code = `
      contract A {}
      contract B is A {}
    `;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("## C3 Linearization");
    expect(formatted).toContain("B → A");
  });

  it("should include detailed sections", () => {
    const code = `
      import "./Foo.sol";
      contract A is B {
        function foo() public {}
      }
    `;
    const graph = extractDependencies(code);
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("## Imports");
    expect(formatted).toContain("## Inheritance");
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
    expect(formatted).toContain("| Imports | 0 |");
  });

  it("should show parse error in output", () => {
    const graph = extractDependencies("invalid %%%");
    const formatted = formatDependencyGraph(graph);

    expect(formatted).toContain("**Parse Error**");
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

  it("should register analyze_contract tool", () => {
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
    expect(result.content[0].text).toContain("## Contracts");
    expect(result.content[0].text).toContain("graph TD");
  });
});

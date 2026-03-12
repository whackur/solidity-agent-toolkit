import { describe, it, expect, beforeEach } from "vitest";
import { parseSolidity, _resetParseCache } from "../../core/ast-parse.js";
import {
  hasModifier,
  hasAnyModifier,
  hasModifierLike,
  getPragmaVersion,
  isPragma08OrAbove,
  isLibraryContract,
  isInterfaceContract,
  isLibraryOrInterfaceOnly,
  getContractKindAtLine,
  findFunctionAtLine,
  getFunctionVisibility,
  isInsideUnchecked,
  hasNonceVariable,
  hasInlineAccessControl,
} from "../../core/ast-validators.js";

beforeEach(() => {
  _resetParseCache();
});

describe("AST Parse", () => {
  it("parses valid Solidity code", () => {
    const { ast, parseError } = parseSolidity("pragma solidity ^0.8.0; contract A {}");
    expect(ast).not.toBeNull();
    expect(parseError).toBeUndefined();
  });

  it("returns null AST on invalid code", () => {
    const { ast, parseError } = parseSolidity("this is not solidity");
    expect(ast).toBeNull();
    expect(parseError).toBeDefined();
  });

  it("caches repeated parses", () => {
    const code = "pragma solidity ^0.8.0; contract A {}";
    const r1 = parseSolidity(code);
    const r2 = parseSolidity(code);
    expect(r1.ast).toBe(r2.ast); // Same reference = cached
  });
});

describe("Modifier Validators", () => {
  const code = `pragma solidity ^0.8.0;
contract Vault {
  function withdraw() public nonReentrant {
    // ...
  }
  function deposit() public payable {
    // ...
  }
  function init() external initializer {
    // ...
  }
}`;

  it("hasModifier returns true when modifier exists", () => {
    const { ast } = parseSolidity(code);
    const func = findFunctionAtLine(ast!, 3);
    expect(func).not.toBeNull();
    expect(hasModifier(func!, "nonReentrant")).toBe(true);
  });

  it("hasModifier returns false when modifier missing", () => {
    const { ast } = parseSolidity(code);
    const func = findFunctionAtLine(ast!, 6);
    expect(func).not.toBeNull();
    expect(hasModifier(func!, "nonReentrant")).toBe(false);
  });

  it("hasAnyModifier detects presence of any modifier", () => {
    const { ast } = parseSolidity(code);
    const guarded = findFunctionAtLine(ast!, 3);
    const unguarded = findFunctionAtLine(ast!, 6);
    expect(hasAnyModifier(guarded!)).toBe(true);
    expect(hasAnyModifier(unguarded!)).toBe(false);
  });

  it("hasModifierLike matches substring", () => {
    const { ast } = parseSolidity(code);
    const func = findFunctionAtLine(ast!, 9);
    expect(hasModifierLike(func!, "initial")).toBe(true);
    expect(hasModifierLike(func!, "reentr")).toBe(false);
  });
});

describe("Pragma Validators", () => {
  it("getPragmaVersion extracts version string", () => {
    const { ast } = parseSolidity("pragma solidity ^0.8.20;");
    expect(getPragmaVersion(ast!)).toBe("^0.8.20");
  });

  it("getPragmaVersion returns null when no pragma", () => {
    const { ast } = parseSolidity("contract A {}");
    expect(getPragmaVersion(ast!)).toBeNull();
  });

  it("isPragma08OrAbove detects 0.8+", () => {
    const v8 = parseSolidity("pragma solidity ^0.8.0;");
    const v7 = parseSolidity("pragma solidity ^0.7.6;");
    const v6 = parseSolidity("pragma solidity 0.6.12;");
    expect(isPragma08OrAbove(v8.ast!)).toBe(true);
    expect(isPragma08OrAbove(v7.ast!)).toBe(false);
    expect(isPragma08OrAbove(v6.ast!)).toBe(false);
  });
});

describe("Contract Kind Validators", () => {
  const code = `pragma solidity ^0.8.0;
library MathLib {
  function add(uint a, uint b) internal pure returns (uint) { return a+b; }
}
interface IERC20 {
  function transfer(address to, uint amount) external returns (bool);
}
contract Token {
  uint public supply;
}`;

  it("isLibraryContract detects library at line inside library", () => {
    const { ast } = parseSolidity(code);
    expect(isLibraryContract(ast!, 3)).toBe(true);
    expect(isLibraryContract(ast!, 9)).toBe(false);
  });

  it("isInterfaceContract detects interface", () => {
    const { ast } = parseSolidity(code);
    expect(isInterfaceContract(ast!, 6)).toBe(true);
    expect(isInterfaceContract(ast!, 3)).toBe(false);
  });

  it("getContractKindAtLine returns correct kind", () => {
    const { ast } = parseSolidity(code);
    expect(getContractKindAtLine(ast!, 3)).toBe("library");
    expect(getContractKindAtLine(ast!, 6)).toBe("interface");
    expect(getContractKindAtLine(ast!, 9)).toBe("contract");
    expect(getContractKindAtLine(ast!, 1)).toBeNull(); // pragma line
  });

  it("isLibraryOrInterfaceOnly returns true for library-only files", () => {
    const libOnly = parseSolidity("library Lib { function x() internal pure {} }");
    expect(isLibraryOrInterfaceOnly(libOnly.ast!)).toBe(true);
  });

  it("isLibraryOrInterfaceOnly returns false when contract present", () => {
    const { ast } = parseSolidity(code);
    expect(isLibraryOrInterfaceOnly(ast!)).toBe(false);
  });
});

describe("Function Lookup", () => {
  const code = `contract A {
  function foo() public pure returns (uint) { return 1; }
  function bar() external view returns (uint) { return 2; }
  function baz() internal {}
}`;

  it("findFunctionAtLine finds correct function", () => {
    const { ast } = parseSolidity(code);
    const foo = findFunctionAtLine(ast!, 2);
    expect(foo).not.toBeNull();
    expect(foo!.name).toBe("foo");
  });

  it("getFunctionVisibility returns correct visibility", () => {
    const { ast } = parseSolidity(code);
    expect(getFunctionVisibility(findFunctionAtLine(ast!, 2)!)).toBe("public");
    expect(getFunctionVisibility(findFunctionAtLine(ast!, 3)!)).toBe("external");
    expect(getFunctionVisibility(findFunctionAtLine(ast!, 4)!)).toBe("internal");
  });
});

describe("Unchecked Block Validator", () => {
  it("detects line inside unchecked block", () => {
    const code = `pragma solidity ^0.8.0;
contract A {
  function inc(uint x) public pure returns (uint) {
    unchecked {
      return x + 1;
    }
  }
}`;
    const { ast } = parseSolidity(code);
    expect(isInsideUnchecked(ast!, 5)).toBe(true); // inside unchecked
    expect(isInsideUnchecked(ast!, 3)).toBe(false); // function decl, outside unchecked
  });
});

describe("Nonce Variable Validator", () => {
  it("detects nonce state variable", () => {
    const code = `contract Permit {
  mapping(address => uint256) public nonces;
  function verify(bytes memory sig) external {}
}`;
    const { ast } = parseSolidity(code);
    expect(hasNonceVariable(ast!)).toBe(true);
  });

  it("returns false without nonce variable", () => {
    const code = `contract Simple { uint x; }`;
    const { ast } = parseSolidity(code);
    expect(hasNonceVariable(ast!)).toBe(false);
  });
});

describe("Inline Access Control Validator", () => {
  it("detects require(msg.sender) pattern", () => {
    const code = `contract Admin {
  function setFee(uint f) external {
    require(msg.sender == owner, "Not owner");
    fee = f;
  }
}`;
    const { ast } = parseSolidity(code);
    const func = findFunctionAtLine(ast!, 2);
    expect(hasInlineAccessControl(func!)).toBe(true);
  });

  it("returns false without access control", () => {
    const code = `contract Open {
  function setFee(uint f) external {
    fee = f;
  }
}`;
    const { ast } = parseSolidity(code);
    const func = findFunctionAtLine(ast!, 2);
    expect(hasInlineAccessControl(func!)).toBe(false);
  });
});

describe("Parse Performance", () => {
  it("parses a 500-line file in under 200ms", () => {
    const lines = ["pragma solidity ^0.8.20;", "contract MedContract {"];
    for (let i = 0; i < 100; i++) {
      lines.push(`  uint256 public var${i};`);
      lines.push(`  function func${i}(uint256 x) public returns (uint256) {`);
      lines.push(`    var${i} = x;`);
      lines.push(`    return var${i} + 1;`);
      lines.push(`  }`);
    }
    lines.push("}");
    const code = lines.join("\n");
    expect(code.split("\n").length).toBeGreaterThanOrEqual(500);

    const start = performance.now();
    const { ast } = parseSolidity(code);
    const elapsed = performance.now() - start;

    expect(ast).not.toBeNull();
    console.log(`Parse time for ${code.split("\n").length} lines: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(process.env.CI ? 500 : 200);
  });

  it("parses a 2000-line file (informational benchmark)", () => {
    const lines = ["pragma solidity ^0.8.20;", "contract BigContract {"];
    for (let i = 0; i < 400; i++) {
      lines.push(`  uint256 public var${i};`);
      lines.push(`  function func${i}(uint256 x) public returns (uint256) {`);
      lines.push(`    var${i} = x;`);
      lines.push(`    return var${i} + 1;`);
      lines.push(`  }`);
    }
    lines.push("}");
    const code = lines.join("\n");

    const start = performance.now();
    const { ast } = parseSolidity(code);
    const elapsed = performance.now() - start;

    expect(ast).not.toBeNull();
    console.log(`Parse time for ${code.split("\n").length} lines: ${elapsed.toFixed(1)}ms`);
    // Informational only \u2014 2000+ line files may exceed 200ms on first parse.
    // Caching ensures subsequent parses are instant.
    expect(elapsed).toBeLessThan(1000);
  });

  it("second parse of same code is instant (cache hit)", () => {
    const code = "pragma solidity ^0.8.0; contract A { function f() public {} }";
    parseSolidity(code); // warm cache

    const start = performance.now();
    parseSolidity(code);
    const elapsed = performance.now() - start;

    console.log(`Cached parse time: ${elapsed.toFixed(3)}ms`);
    expect(elapsed).toBeLessThan(1);
  });
});

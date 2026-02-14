import { describe, it, expect } from "vitest";
import { matchPatterns } from "../../tools/vuln-pattern-matcher.js";
import { VULNERABILITY_PATTERNS } from "../../knowledge/vulnerability-patterns.js";

describe("VULNERABILITY_PATTERNS", () => {
  it("defines at least 30 patterns", () => {
    expect(VULNERABILITY_PATTERNS.length).toBeGreaterThanOrEqual(30);
  });

  it("every pattern has required fields", () => {
    for (const p of VULNERABILITY_PATTERNS) {
      expect(p.scweId).toMatch(/^SCWE-\d{3}$/);
      expect(p.name.length).toBeGreaterThan(0);
      expect(["critical", "high", "medium", "low"]).toContain(p.severity);
      expect(p.patterns.length).toBeGreaterThan(0);
      expect(p.description.length).toBeGreaterThan(0);
    }
  });

  it("includes all Top 10 priority SCWE IDs", () => {
    const definedIds = new Set(VULNERABILITY_PATTERNS.map((p) => p.scweId));
    const top10Ids = [
      "SCWE-018",
      "SCWE-038",
      "SCWE-050",
      "SCWE-046",
      "SCWE-065",
      "SCWE-109",
      "SCWE-132",
      "SCWE-106",
      "SCWE-128",
      "SCWE-136",
      "SCWE-015",
    ];
    for (const id of top10Ids) {
      expect(definedIds).toContain(id);
    }
  });

  it("every pattern regex is valid", () => {
    for (const p of VULNERABILITY_PATTERNS) {
      for (const re of p.patterns) {
        expect(re).toBeInstanceOf(RegExp);
        expect(() => new RegExp(re.source, re.flags)).not.toThrow();
      }
    }
  });
});

describe("matchPatterns", () => {
  it("detects tx.origin authentication (SCWE-018)", () => {
    const code = `
pragma solidity ^0.8.0;
contract Vulnerable {
    address owner;
    function transferTo(address to, uint amount) public {
        require(tx.origin == owner, "Not owner");
        payable(to).transfer(amount);
    }
}`;
    const matches = matchPatterns(code);
    const scwe018 = matches.filter((m) => m.scweId === "SCWE-018");
    expect(scwe018.length).toBeGreaterThan(0);
    expect(scwe018[0].severity).toBe("critical");
    expect(scwe018[0].line).toBe(6);
  });

  it("detects selfdestruct usage (SCWE-038)", () => {
    const code = `
pragma solidity ^0.8.0;
contract Destroyable {
    function kill() public {
        selfdestruct(payable(msg.sender));
    }
}`;
    const matches = matchPatterns(code);
    const scwe038 = matches.filter((m) => m.scweId === "SCWE-038");
    expect(scwe038.length).toBeGreaterThan(0);
    expect(scwe038[0].severity).toBe("critical");
  });

  it("detects reentrancy patterns (SCWE-046)", () => {
    const code = `
pragma solidity ^0.8.0;
contract Vulnerable {
    mapping(address => uint) balances;
    function withdraw() public {
        uint bal = balances[msg.sender];
        (bool success, ) = msg.sender.call{value: bal}("");
        require(success);
        balances[msg.sender] = 0;
    }
}`;
    const matches = matchPatterns(code);
    const scwe046 = matches.filter((m) => m.scweId === "SCWE-046");
    expect(scwe046.length).toBeGreaterThan(0);
  });

  it("detects block.timestamp manipulation (SCWE-065)", () => {
    const code = `
contract Lottery {
    function isWinner() public view returns (bool) {
        return block.timestamp % 2 == 0;
    }
}`;
    const matches = matchPatterns(code);
    const scwe065 = matches.filter((m) => m.scweId === "SCWE-065");
    expect(scwe065.length).toBeGreaterThan(0);
    expect(scwe065[0].severity).toBe("medium");
  });

  it("detects delegatecall injection (SCWE-132)", () => {
    const code = `
contract Proxy {
    function forward(address target, bytes calldata data) public {
        (bool s, ) = target.delegatecall(data);
        require(s);
    }
}`;
    const matches = matchPatterns(code);
    const scwe132 = matches.filter((m) => m.scweId === "SCWE-132");
    expect(scwe132.length).toBeGreaterThan(0);
    expect(scwe132[0].severity).toBe("critical");
  });

  it("detects integer overflow risk with old pragma (SCWE-106)", () => {
    const code = `pragma solidity ^0.7.6;
contract OldContract {
    uint8 public counter;
    function increment() public { counter += 1; }
}`;
    const matches = matchPatterns(code);
    const scwe106 = matches.filter((m) => m.scweId === "SCWE-106");
    expect(scwe106.length).toBeGreaterThan(0);
  });

  it("detects weak randomness (SCWE-015)", () => {
    const code = `
contract Lottery {
    function random() public view returns (uint) {
        return uint(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    }
}`;
    const matches = matchPatterns(code);
    const scwe015 = matches.filter((m) => m.scweId === "SCWE-015");
    expect(scwe015.length).toBeGreaterThan(0);
  });

  it("detects hash collision with abi.encodePacked (SCWE-025)", () => {
    const code = `
contract HashCollision {
    function hash(string memory a, string memory b) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(a, b));
    }
}`;
    const matches = matchPatterns(code);
    const scwe025 = matches.filter((m) => m.scweId === "SCWE-025");
    expect(scwe025.length).toBeGreaterThan(0);
  });

  it("detects ecrecover signature replay (SCWE-020)", () => {
    const code = `
contract Sig {
    function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public pure returns (address) {
        return ecrecover(hash, v, r, s);
    }
}`;
    const matches = matchPatterns(code);
    const scwe020 = matches.filter((m) => m.scweId === "SCWE-020");
    expect(scwe020.length).toBeGreaterThan(0);
  });

  it("detects floating pragma (SCWE-058)", () => {
    const code = `pragma solidity ^0.8.0;
contract Foo {}`;
    const matches = matchPatterns(code);
    const scwe058 = matches.filter((m) => m.scweId === "SCWE-058");
    expect(scwe058.length).toBeGreaterThan(0);
    expect(scwe058[0].severity).toBe("low");
  });

  it("detects deprecated solidity functions (SCWE-061)", () => {
    const code = `
contract Old {
    function foo() public {
        bytes32 h = sha3("test");
        throw;
    }
}`;
    const matches = matchPatterns(code);
    const scwe061 = matches.filter((m) => m.scweId === "SCWE-061");
    expect(scwe061.length).toBeGreaterThan(0);
  });

  it("detects unprotected initializer (SCWE-053)", () => {
    const code = `
contract Proxy {
    address public owner;
    function initialize(address _owner) public {
        owner = _owner;
    }
}`;
    const matches = matchPatterns(code);
    const scwe053 = matches.filter((m) => m.scweId === "SCWE-053");
    expect(scwe053.length).toBeGreaterThan(0);
  });

  it("detects forced ether balance check (SCWE-079)", () => {
    const code = `
contract Game {
    function checkBalance() public view {
        require(address(this).balance == 1 ether);
    }
}`;
    const matches = matchPatterns(code);
    const scwe079 = matches.filter((m) => m.scweId === "SCWE-079");
    expect(scwe079.length).toBeGreaterThan(0);
  });

  it("returns empty array for clean code", () => {
    const code = `
pragma solidity 0.8.20;
contract Safe {
    uint256 private counter;
    function increment() external {
        counter += 1;
    }
    function getCounter() external view returns (uint256) {
        return counter;
    }
}`;
    const matches = matchPatterns(code);
    expect(matches).toEqual([]);
  });

  it("filters by specific checkIds", () => {
    const code = `
contract Vulnerable {
    function bad() public {
        selfdestruct(payable(msg.sender));
        require(tx.origin == msg.sender);
    }
}`;
    const onlyTxOrigin = matchPatterns(code, ["SCWE-018"]);
    expect(onlyTxOrigin.every((m) => m.scweId === "SCWE-018")).toBe(true);
    expect(onlyTxOrigin.length).toBeGreaterThan(0);
  });

  it("checkIds filtering is case-insensitive", () => {
    const code = `require(tx.origin == owner);`;
    const matches = matchPatterns(code, ["scwe-018"]);
    expect(matches.length).toBeGreaterThan(0);
  });

  it("sorts results by severity then line number", () => {
    const code = `
pragma solidity ^0.8.0;
contract Mixed {
    function foo() public {
        block.timestamp % 2;
        selfdestruct(payable(msg.sender));
    }
}`;
    const matches = matchPatterns(code);
    for (let i = 1; i < matches.length; i++) {
      const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const prevSev = severityOrder[matches[i - 1].severity];
      const currSev = severityOrder[matches[i].severity];
      if (prevSev === currSev) {
        expect(matches[i].line).toBeGreaterThanOrEqual(matches[i - 1].line);
      } else {
        expect(currSev).toBeGreaterThanOrEqual(prevSev);
      }
    }
  });

  it("provides line numbers for matches", () => {
    const code = `line1
line2
require(tx.origin == owner);
line4`;
    const matches = matchPatterns(code, ["SCWE-018"]);
    expect(matches[0].line).toBe(3);
  });

  it("deduplicates same SCWE on same line", () => {
    const code = `selfdestruct(payable(msg.sender));`;
    const matches = matchPatterns(code);
    const selfdestructMatches = matches.filter((m) => m.scweId === "SCWE-038" && m.line === 1);
    expect(selfdestructMatches).toHaveLength(1);
  });
});

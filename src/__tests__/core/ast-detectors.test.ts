import { describe, it, expect, beforeEach } from "vitest";
import { parseSolidity, _resetParseCache } from "../../core/ast-parse.js";
import {
  runASTDetectors,
  _resetDetectorRegistry,
  type DetectorResult,
} from "../../core/ast-detector-registry.js";

// Import barrel to register all detectors
import "../../core/ast-detectors/index.js";

function detect(code: string, scweIds?: string[]): DetectorResult[] {
  const { ast } = parseSolidity(code);
  if (!ast) throw new Error("Failed to parse code");
  return runASTDetectors(ast, code, scweIds);
}

function detectIds(code: string, scweIds?: string[]): string[] {
  return detect(code, scweIds).map((r) => r.scweId);
}

beforeEach(() => {
  _resetParseCache();
});

// ─── Reentrancy (SCWE-046) ───────────────────────────────────────
describe("reentrancy detector", () => {
  it("detects external call before state update", () => {
    const code = `contract Vault {
      function withdraw(uint256 amount) public {
        (bool ok, ) = msg.sender.call{value: amount}("");
        balances[msg.sender] -= amount;
      }
    }`;
    const results = detect(code, ["SCWE-046"]);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((r) => r.scweId === "SCWE-046")).toBe(true);
  });

  it("does not flag CEI-compliant code", () => {
    const code = `contract Vault {
      function withdraw(uint256 amount) public {
        balances[msg.sender] -= amount;
        (bool ok, ) = msg.sender.call{value: amount}("");
      }
    }`;
    const results = detect(code, ["SCWE-046"]);
    expect(results.length).toBe(0);
  });

  it("does not flag nonReentrant guarded function", () => {
    const code = `contract Vault {
      function withdraw(uint256 amount) public nonReentrant {
        (bool ok, ) = msg.sender.call{value: amount}("");
        balances[msg.sender] -= amount;
      }
    }`;
    const results = detect(code, ["SCWE-046"]);
    expect(results.length).toBe(0);
  });

  it("detects payable function without guard", () => {
    const code = `contract Pool {
      function claim() external payable {
        uint256 reward = rewards[msg.sender];
        msg.sender.transfer(reward);
        rewards[msg.sender] = 0;
      }
    }`;
    const results = detect(code, ["SCWE-046"]);
    expect(results.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Access Control (SCWE-005, SCWE-016, SCWE-038, SCWE-049) ────
describe("access-control detector", () => {
  it("detects unprotected initializer (SCWE-005)", () => {
    const code = `contract Vault {
      function initialize(address _owner) public {
        owner = _owner;
      }
    }`;
    expect(detectIds(code, ["SCWE-005"])).toContain("SCWE-005");
  });

  it("does not flag initializer with modifier", () => {
    const code = `contract Vault is Initializable {
      function initialize(address _owner) public initializer {
        owner = _owner;
      }
    }`;
    expect(detectIds(code, ["SCWE-005"])).not.toContain("SCWE-005");
  });

  it("detects unprotected setter (SCWE-016)", () => {
    const code = `contract Config {
      function setFee(uint256 fee) public {
        protocolFee = fee;
      }
    }`;
    expect(detectIds(code, ["SCWE-016"])).toContain("SCWE-016");
  });

  it("does not flag setter with onlyOwner", () => {
    const code = `contract Config {
      function setFee(uint256 fee) public onlyOwner {
        protocolFee = fee;
      }
    }`;
    expect(detectIds(code, ["SCWE-016"])).not.toContain("SCWE-016");
  });

  it("detects unprotected selfdestruct (SCWE-038)", () => {
    const code = `contract Destroyable {
      function kill() public {
        selfdestruct(payable(msg.sender));
      }
    }`;
    expect(detectIds(code, ["SCWE-038"])).toContain("SCWE-038");
  });

  it("detects unprotected withdrawal (SCWE-049)", () => {
    const code = `contract Vault {
      function withdraw() public {
        msg.sender.transfer(address(this).balance);
      }
    }`;
    expect(detectIds(code, ["SCWE-049"])).toContain("SCWE-049");
  });
});

// ─── External Calls (SCWE-035, SCWE-048, SCWE-073) ──────────────
describe("external-calls detector", () => {
  it("detects insecure delegatecall (SCWE-035)", () => {
    const code = `contract Proxy {
      function forward(address target, bytes calldata data) public {
        target.delegatecall(data);
      }
    }`;
    expect(detectIds(code, ["SCWE-035"])).toContain("SCWE-035");
  });

  it("detects unchecked .send() (SCWE-048)", () => {
    const code = `contract Pay {
      function pay(address to) public {
        to.send(1 ether);
      }
    }`;
    expect(detectIds(code, ["SCWE-048"])).toContain("SCWE-048");
  });

  it("detects hardcoded gas (SCWE-073)", () => {
    const code = `contract Caller {
      function callWith(address to) public {
        to.call{gas: 2300}("");
      }
    }`;
    expect(detectIds(code, ["SCWE-073"])).toContain("SCWE-073");
  });
});

// ─── Arithmetic (SCWE-047, SCWE-074) ─────────────────────────────
describe("arithmetic detector", () => {
  it("detects overflow in pre-0.8 code (SCWE-047)", () => {
    const code = `pragma solidity ^0.7.6;
    contract Counter {
      uint256 public count;
      function add(uint256 x) public { count += x; }
    }`;
    expect(detectIds(code, ["SCWE-047"])).toContain("SCWE-047");
  });

  it("does not flag 0.8+ code for overflow", () => {
    const code = `pragma solidity ^0.8.0;
    contract Counter {
      uint256 public count;
      function add(uint256 x) public { count += x; }
    }`;
    expect(detectIds(code, ["SCWE-047"])).not.toContain("SCWE-047");
  });

  it("detects abi.encodePacked collision (SCWE-074)", () => {
    const code = `pragma solidity ^0.8.0;
    contract Hasher {
      function hash(string memory a, string memory b) public pure returns (bytes32) {
        return keccak256(abi.encodePacked(a, b));
      }
    }`;
    expect(detectIds(code, ["SCWE-074"])).toContain("SCWE-074");
  });
});

// ─── Code Quality (SCWE-060, SCWE-067, SCWE-097) ───────────────
describe("code-quality detector", () => {
  it("detects floating pragma (SCWE-060)", () => {
    const code = `pragma solidity ^0.8.0;
    contract Token {
      string public name = "MyToken";
    }`;
    expect(detectIds(code, ["SCWE-060"])).toContain("SCWE-060");
  });

  it("does not flag floating pragma in libraries", () => {
    const code = `pragma solidity ^0.8.0;
    library MathLib {
      function add(uint256 a, uint256 b) internal pure returns (uint256) {
        return a + b;
      }
    }`;
    expect(detectIds(code, ["SCWE-060"])).not.toContain("SCWE-060");
  });

  it("detects assert usage (SCWE-067)", () => {
    const code = `contract Invariant {
      function check(uint256 x) public {
        assert(x > 0);
      }
    }`;
    expect(detectIds(code, ["SCWE-067"])).toContain("SCWE-067");
  });

  it("detects default visibility (SCWE-097)", () => {
    const code = `contract Legacy {
      function doWork(uint256 x) {
        counter += x;
      }
    }`;
    expect(detectIds(code, ["SCWE-097"])).toContain("SCWE-097");
  });
});

// ─── Event Emission Correctness (SCWE-063) ─────────────────────
describe("events detector", () => {
  it("detects missing event emission on a state-changing setter (SCWE-063)", () => {
    const code = `contract Config {
      uint256 public fee;
      function setFee(uint256 _fee) public {
        fee = _fee;
      }
    }`;
    const results = detect(code, ["SCWE-063"]);
    expect(results.some((r) => r.name === "Missing Event Emission on State Change")).toBe(true);
  });

  it("detects missing event emission beyond the set* prefix", () => {
    const code = `contract Vault {
      mapping(address => uint256) public balances;
      function withdraw(uint256 amount) public {
        balances[msg.sender] -= amount;
      }
    }`;
    const results = detect(code, ["SCWE-063"]);
    expect(results.some((r) => r.name === "Missing Event Emission on State Change")).toBe(true);
  });

  it("does not flag a state-changing function that already emits", () => {
    const code = `contract Config {
      uint256 public fee;
      event FeeUpdated(uint256 newFee);
      function setFee(uint256 _fee) public {
        fee = _fee;
        emit FeeUpdated(_fee);
      }
    }`;
    const results = detect(code, ["SCWE-063"]);
    expect(results.some((r) => r.name === "Missing Event Emission on State Change")).toBe(false);
  });

  it("does not flag view/pure functions or local-variable writes", () => {
    const code = `contract Calc {
      uint256 public total;
      function preview(uint256 x) public view returns (uint256) {
        uint256 tmp = x + total;
        return tmp;
      }
    }`;
    expect(detect(code, ["SCWE-063"]).length).toBe(0);
  });

  it("detects an event that is declared but never emitted", () => {
    const code = `contract Token {
      event Transfer(address indexed from, address indexed to, uint256 value);
      function noop() external {}
    }`;
    const results = detect(code, ["SCWE-063"]);
    expect(results.some((r) => r.name === "Declared Event Never Emitted")).toBe(true);
  });

  it("does not flag events declared in an interface", () => {
    const code = `interface IToken {
      event Transfer(address indexed from, address indexed to, uint256 value);
    }`;
    expect(detect(code, ["SCWE-063"]).length).toBe(0);
  });

  it("suggests indexing an unindexed address field on an emitted event", () => {
    const code = `contract Token {
      uint256 public x;
      event Action(address user, uint256 amount, uint256 timestamp);
      function act(uint256 amount) external {
        x = amount;
        emit Action(msg.sender, amount, block.timestamp);
      }
    }`;
    const results = detect(code, ["SCWE-063"]);
    expect(results.some((r) => r.name === "Event Missing Indexed Parameters")).toBe(true);
  });

  it("suggests indexing an unindexed id field on an emitted event", () => {
    const code = `contract Registry {
      uint256 public x;
      event Registered(uint256 tokenId, uint256 value);
      function register(uint256 tokenId) external {
        x = tokenId;
        emit Registered(tokenId, x);
      }
    }`;
    const results = detect(code, ["SCWE-063"]);
    expect(results.some((r) => r.name === "Event Missing Indexed Parameters")).toBe(true);
  });

  it("does not suggest indexing when key fields are already indexed", () => {
    const code = `contract Token {
      uint256 public x;
      event Action(address indexed user, uint256 amount, uint256 timestamp);
      function act(uint256 amount) external {
        x = amount;
        emit Action(msg.sender, amount, block.timestamp);
      }
    }`;
    const results = detect(code, ["SCWE-063"]);
    expect(results.some((r) => r.name === "Event Missing Indexed Parameters")).toBe(false);
  });

  it("does not suggest indexing amount-only events with no address or id fields", () => {
    const code = `contract Pool {
      uint256 public total;
      event Rebalanced(uint256 supplied, uint256 borrowed, uint256 ratio);
      function rebalance(uint256 supplied) external {
        total = supplied;
        emit Rebalanced(supplied, total, total);
      }
    }`;
    const results = detect(code, ["SCWE-063"]);
    expect(results.some((r) => r.name === "Event Missing Indexed Parameters")).toBe(false);
  });
});

// ─── Randomness (SCWE-024, SCWE-065) ─────────────────────────────
describe("randomness detector", () => {
  it("detects keccak256(block.timestamp) for randomness (SCWE-024)", () => {
    const code = `contract Lottery {
      function pickWinner() public {
        uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        winner = participants[random % participants.length];
      }
    }`;
    expect(detectIds(code, ["SCWE-024"])).toContain("SCWE-024");
  });

  it("detects blockhash for randomness (SCWE-024)", () => {
    const code = `contract Game {
      function roll() public returns (uint256) {
        return uint256(blockhash(block.number - 1)) % 6;
      }
    }`;
    expect(detectIds(code, ["SCWE-024"])).toContain("SCWE-024");
  });

  it("detects block.timestamp usage (SCWE-065)", () => {
    const code = `contract Timelock {
      function execute(uint256 proposalId) external {
        require(block.timestamp >= proposals[proposalId].eta, "Too early");
        _execute(proposalId);
      }
    }`;
    expect(detectIds(code, ["SCWE-065"])).toContain("SCWE-065");
  });
});

// ─── Signature Replay (SCWE-055) ─────────────────────────────────
describe("signature detector", () => {
  it("detects ecrecover without nonce (SCWE-055)", () => {
    const code = `contract SigVerifier {
      function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public returns (address) {
        return ecrecover(hash, v, r, s);
      }
    }`;
    expect(detectIds(code, ["SCWE-055"])).toContain("SCWE-055");
  });

  it("detects ECDSA.recover without nonce (SCWE-055)", () => {
    const code = `contract Auth {
      function authenticate(bytes memory signature) external {
        address signer = ECDSA.recover(msgHash, signature);
        require(signer == owner, "Invalid");
      }
    }`;
    expect(detectIds(code, ["SCWE-055"])).toContain("SCWE-055");
  });

  it("does not flag ecrecover with nonce tracking", () => {
    const code = `contract PermitVerifier {
      mapping(address => uint256) public nonces;
      function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public {
        address signer = ecrecover(hash, v, r, s);
        require(nonces[signer]++ > 0 || true, "first use");
      }
    }`;
    expect(detectIds(code, ["SCWE-055"])).not.toContain("SCWE-055");
  });
});

// ─── DoS & Misc (SCWE-058, SCWE-050, SCWE-071, SCWE-075) ────────
describe("dos detector", () => {
  it("detects unbounded for loop (SCWE-058)", () => {
    const code = `contract Airdrop {
      function distribute(address[] memory recipients) public {
        for (uint256 i = 0; i < recipients.length; i++) {
          payable(recipients[i]).transfer(1 ether);
        }
      }
    }`;
    expect(detectIds(code, ["SCWE-058"])).toContain("SCWE-058");
  });

  it("detects selfdestruct usage (SCWE-050)", () => {
    const code = `contract Destroyable {
      function destroy() public {
        selfdestruct(payable(msg.sender));
      }
    }`;
    expect(detectIds(code, ["SCWE-050"])).toContain("SCWE-050");
  });

  it("detects strict balance check (SCWE-075)", () => {
    const code = `contract Vault {
      function check() public {
        require(address(this).balance == 1 ether, "Wrong balance");
      }
    }`;
    expect(detectIds(code, ["SCWE-075"])).toContain("SCWE-075");
  });
});

// ─── Registry and Integration ────────────────────────────────────
describe("detector registry integration", () => {
  it("all AST results have source=ast", () => {
    const code = `pragma solidity ^0.7.6;
    contract Vulnerable {
      function withdraw() public {
        msg.sender.send(1 ether);
        balances[msg.sender] = 0;
      }
    }`;
    const results = detect(code);
    for (const r of results) {
      expect(r.source).toBe("ast");
    }
  });

  it("deduplicates by scweId + line", () => {
    const code = `contract Vault {
      function withdraw(uint256 amount) public {
        (bool ok, ) = msg.sender.call{value: amount}("");
        balances[msg.sender] -= amount;
      }
    }`;
    const results = detect(code, ["SCWE-046"]);
    const keys = results.map((r) => `${r.scweId}:${r.line}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("returns empty array for clean code", () => {
    const code = `pragma solidity 0.8.20;
    contract Safe {
      address public owner;
      constructor() { owner = msg.sender; }
      function getOwner() external view returns (address) { return owner; }
    }`;
    const results = detect(code, ["SCWE-046"]);
    expect(results.length).toBe(0);
  });
});

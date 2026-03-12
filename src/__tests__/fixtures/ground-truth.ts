export interface GroundTruthCase {
  id: string;
  scweId: string;
  code: string;
  expected: "true-positive" | "false-positive";
  reason: string;
}

/**
 * Ground-truth corpus for measuring detection precision and recall.
 * Each SCWE ID has at least 2 TP (should detect) and 2 FP (should NOT detect) cases.
 * Phase 2 AST validators will reduce FP counts.
 */
export const GROUND_TRUTH: GroundTruthCase[] = [
  // ─── SCWE-005: Unprotected Initializer ───────────────────────────
  {
    id: "SCWE-005-TP-1",
    scweId: "SCWE-005",
    code: `contract Vault {
  function initialize(address _owner) public {
    owner = _owner;
  }
}`,
    expected: "true-positive",
    reason: "Public initializer with no modifier guard",
  },
  {
    id: "SCWE-005-TP-2",
    scweId: "SCWE-005",
    code: `contract Token {
  function init(uint256 supply) external {
    totalSupply = supply;
  }
}`,
    expected: "true-positive",
    reason: "External init function with no modifier guard",
  },
  {
    id: "SCWE-005-FP-1",
    scweId: "SCWE-005",
    code: `import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
contract Vault is Initializable {
  function initialize(address _owner) public initializer {
    owner = _owner;
  }
}`,
    expected: "false-positive",
    reason: "Has `initializer` modifier — properly guarded",
  },
  {
    id: "SCWE-005-FP-2",
    scweId: "SCWE-005",
    code: `contract Token is Initializable {
  function initialize(uint256 supply) external onlyInitializing {
    totalSupply = supply;
  }
}`,
    expected: "false-positive",
    reason: "Has `onlyInitializing` modifier — nested initializer guard",
  },

  // ─── SCWE-016: Incorrect Access Control ──────────────────────────
  {
    id: "SCWE-016-TP-1",
    scweId: "SCWE-016",
    code: `contract Config {
  function setFee(uint256 fee) public {
    protocolFee = fee;
  }
}`,
    expected: "true-positive",
    reason: "Public state-changing setter with no access control",
  },
  {
    id: "SCWE-016-TP-2",
    scweId: "SCWE-016",
    code: `contract Registry {
  function updateOracle(address oracle) external {
    priceOracle = oracle;
  }
}`,
    expected: "true-positive",
    reason: "External state-changing function with no access control",
  },
  {
    id: "SCWE-016-FP-1",
    scweId: "SCWE-016",
    code: `contract Config is AccessControl {
  function setFee(uint256 fee) public onlyOwner {
    protocolFee = fee;
  }
}`,
    expected: "false-positive",
    reason: "Has `onlyOwner` modifier — access controlled",
  },
  {
    id: "SCWE-016-FP-2",
    scweId: "SCWE-016",
    code: `contract Config is AccessControl {
  function setFee(uint256 fee) external {
    require(hasRole(ADMIN_ROLE, msg.sender), "Not admin");
    protocolFee = fee;
  }
}`,
    expected: "false-positive",
    reason: "Has inline require with role check — access controlled",
  },

  // ─── SCWE-046: Reentrancy ────────────────────────────────────────
  {
    id: "SCWE-046-TP-1",
    scweId: "SCWE-046",
    code: `contract Vault {
  function withdraw(uint256 amount) public {
    (bool ok, ) = msg.sender.call{value: amount}("");
    balances[msg.sender] -= amount;
  }
}`,
    expected: "true-positive",
    reason: "External call before state update, no reentrancy guard",
  },
  {
    id: "SCWE-046-TP-2",
    scweId: "SCWE-046",
    code: `contract Pool {
  function claim() external payable {
    uint256 reward = rewards[msg.sender];
    msg.sender.transfer(reward);
    rewards[msg.sender] = 0;
  }
}`,
    expected: "true-positive",
    reason: "Transfer before zeroing balance, payable with no guard",
  },
  {
    id: "SCWE-046-FP-1",
    scweId: "SCWE-046",
    code: `import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract Vault is ReentrancyGuard {
  function withdraw(uint256 amount) public nonReentrant {
    (bool ok, ) = msg.sender.call{value: amount}("");
    balances[msg.sender] -= amount;
  }
}`,
    expected: "false-positive",
    reason: "Has `nonReentrant` modifier — reentrancy guarded",
  },
  {
    id: "SCWE-046-FP-2",
    scweId: "SCWE-046",
    code: `contract Vault {
  function withdraw(uint256 amount) public {
    balances[msg.sender] -= amount;
    (bool ok, ) = msg.sender.call{value: amount}("");
    require(ok, "Transfer failed");
  }
}`,
    expected: "false-positive",
    reason: "Follows CEI pattern — state update before external call (regex still flags .call)",
  },

  // ─── SCWE-047: Integer Overflow / Underflow ──────────────────────
  {
    id: "SCWE-047-TP-1",
    scweId: "SCWE-047",
    code: `pragma solidity ^0.7.6;
contract Counter {
  uint256 public count;
  function add(uint256 x) public { count += x; }
}`,
    expected: "true-positive",
    reason: "Pragma <0.8 without SafeMath — overflow possible",
  },
  {
    id: "SCWE-047-TP-2",
    scweId: "SCWE-047",
    code: `pragma solidity 0.6.12;
contract Token {
  mapping(address => uint256) balances;
  function transfer(address to, uint256 amt) public {
    balances[msg.sender] -= amt;
    balances[to] += amt;
  }
}`,
    expected: "true-positive",
    reason: "Pragma 0.6.12 with arithmetic — no overflow protection",
  },
  {
    id: "SCWE-047-FP-1",
    scweId: "SCWE-047",
    code: `pragma solidity ^0.8.20;
contract GasOptimized {
  uint256 public count;
  function increment() public {
    unchecked { count++; }
  }
}`,
    expected: "false-positive",
    reason: "Unchecked in 0.8+ is intentional gas optimization, not a vulnerability",
  },
  {
    id: "SCWE-047-FP-2",
    scweId: "SCWE-047",
    code: `pragma solidity ^0.8.0;
contract Safe {
  uint256 public total;
  function add(uint256 x) public { total += x; }
}`,
    expected: "false-positive",
    reason:
      "Pragma >=0.8 has built-in overflow checks (regex still flags ^0.8 via floating pragma overlap)",
  },

  // ─── SCWE-097: Default Function Visibility ───────────────────────
  {
    id: "SCWE-097-TP-1",
    scweId: "SCWE-097",
    code: `contract Legacy {
  function doWork(uint256 x) {
    counter += x;
  }
}`,
    expected: "true-positive",
    reason: "Function without any visibility specifier",
  },
  {
    id: "SCWE-097-TP-2",
    scweId: "SCWE-097",
    code: `contract Old {
  function compute(uint256 a, uint256 b) pure {
    return a + b;
  }
}`,
    expected: "true-positive",
    reason: "Function with pure modifier but no visibility keyword — defaults to public",
  },
  {
    id: "SCWE-097-FP-1",
    scweId: "SCWE-097",
    code: `contract Modern {
  function doWork(uint256 x) public {
    counter += x;
  }
}`,
    expected: "false-positive",
    reason: "Has explicit `public` visibility — regex may still match the pattern",
  },
  {
    id: "SCWE-097-FP-2",
    scweId: "SCWE-097",
    code: `contract Lib {
  function helper(uint256 x) internal pure returns (uint256) {
    return x * 2;
  }
}`,
    expected: "false-positive",
    reason: "Has explicit `internal` visibility",
  },

  // ─── SCWE-055: Signature Replay Attack ───────────────────────────
  {
    id: "SCWE-055-TP-1",
    scweId: "SCWE-055",
    code: `contract SigVerifier {
  function verify(bytes32 hash, bytes memory sig) public returns (address) {
    return ecrecover(hash, v, r, s);
  }
}`,
    expected: "true-positive",
    reason: "ecrecover without nonce or chain ID protection",
  },
  {
    id: "SCWE-055-TP-2",
    scweId: "SCWE-055",
    code: `contract Auth {
  function authenticate(bytes memory signature) external {
    address signer = ECDSA.recover(msgHash, signature);
    require(signer == owner, "Invalid");
  }
}`,
    expected: "true-positive",
    reason: "ECDSA.recover without nonce tracking",
  },
  {
    id: "SCWE-055-FP-1",
    scweId: "SCWE-055",
    code: `contract PermitVerifier {
  mapping(address => uint256) public nonces;
  function verify(bytes32 hash, uint8 v, bytes32 r, bytes32 s) public {
    address signer = ecrecover(hash, v, r, s);
    require(nonces[signer]++ > 0 || true, "first use");
  }
}`,
    expected: "false-positive",
    reason: "ecrecover with nonce tracking — replay protected",
  },
  {
    id: "SCWE-055-FP-2",
    scweId: "SCWE-055",
    code: `contract EIP712Verifier {
  bytes32 public DOMAIN_SEPARATOR;
  mapping(address => uint256) public nonces;
  function verify(bytes memory sig) external {
    bytes32 digest = keccak256(abi.encodePacked("\\x19\\x01", DOMAIN_SEPARATOR, structHash));
    address signer = ECDSA.recover(digest, sig);
    nonces[signer]++;
  }
}`,
    expected: "false-positive",
    reason: "Full EIP-712 with domain separator and nonces",
  },

  // ─── SCWE-024: Weak Randomness ───────────────────────────────────
  {
    id: "SCWE-024-TP-1",
    scweId: "SCWE-024",
    code: `contract Lottery {
  function pickWinner() public {
    uint256 random = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
    winner = participants[random % participants.length];
  }
}`,
    expected: "true-positive",
    reason: "block.timestamp used as randomness source",
  },
  {
    id: "SCWE-024-TP-2",
    scweId: "SCWE-024",
    code: `contract Game {
  function roll() public returns (uint256) {
    return uint256(blockhash(block.number - 1)) % 6;
  }
}`,
    expected: "true-positive",
    reason: "blockhash used for randomness",
  },
  {
    id: "SCWE-024-FP-1",
    scweId: "SCWE-024",
    code: `contract Timelock {
  function execute(uint256 proposalId) external {
    require(block.timestamp >= proposals[proposalId].eta, "Too early");
    _execute(proposalId);
  }
}`,
    expected: "false-positive",
    reason: "block.timestamp used for deadline check, not randomness",
  },
  {
    id: "SCWE-024-FP-2",
    scweId: "SCWE-024",
    code: `contract Vesting {
  function claim() external {
    require(block.timestamp > vestingEnd, "Still vesting");
    token.transfer(msg.sender, amount);
  }
}`,
    expected: "false-positive",
    reason: "block.timestamp for time-based logic, not randomness",
  },

  // ─── SCWE-060: Floating Pragma ───────────────────────────────────
  {
    id: "SCWE-060-TP-1",
    scweId: "SCWE-060",
    code: `pragma solidity ^0.8.0;
contract Token {
  string public name = "MyToken";
}`,
    expected: "true-positive",
    reason: "Floating pragma in a deployable contract",
  },
  {
    id: "SCWE-060-TP-2",
    scweId: "SCWE-060",
    code: `pragma solidity >=0.8.0 <0.9.0;
contract Vault {
  uint256 public balance;
}`,
    expected: "true-positive",
    reason: "Range pragma in a deployable contract",
  },
  {
    id: "SCWE-060-FP-1",
    scweId: "SCWE-060",
    code: `pragma solidity ^0.8.0;
library MathLib {
  function add(uint256 a, uint256 b) internal pure returns (uint256) {
    return a + b;
  }
}`,
    expected: "false-positive",
    reason: "Floating pragma in a library is acceptable practice",
  },
  {
    id: "SCWE-060-FP-2",
    scweId: "SCWE-060",
    code: `pragma solidity ^0.8.0;
interface IERC20 {
  function transfer(address to, uint256 amount) external returns (bool);
}`,
    expected: "false-positive",
    reason: "Floating pragma in an interface is acceptable practice",
  },
];

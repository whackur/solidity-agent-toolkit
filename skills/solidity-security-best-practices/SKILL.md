---
name: solidity-security-best-practices
description: Smart contract security best practices for Solidity development. Use when writing, reviewing, or auditing Solidity code. Covers reentrancy prevention, access control patterns, safe external calls, input validation, upgrade safety, and OWASP Smart Contract Top 10 vulnerabilities. Triggers on tasks involving security, vulnerability detection, access control, CEI pattern, ReentrancyGuard, SafeERC20, or smart contract auditing.
license: MIT
metadata:
  author: whackur
  version: "1.0.0"
---

# Solidity Security Best Practices

## When to Apply
- Reviewing smart contract code for common vulnerabilities.
- Implementing critical patterns like Checks-Effects-Interactions.
- Auditing access control and upgradeability logic.
- Preparing for a security audit or bug bounty.
- Debugging unexpected behavior in external contract interactions.

## Critical Security Patterns

### Checks-Effects-Interactions (CEI)
Always update state variables before making external calls to prevent reentrancy.

```solidity
// BAD
function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount);
    (bool s, ) = msg.sender.call{value: amount}("");
    balances[msg.sender] -= amount;
}
```

```solidity
// GOOD
function withdraw(uint amount) public {
    require(balances[msg.sender] >= amount);
    balances[msg.sender] -= amount;
    (bool s, ) = msg.sender.call{value: amount}("");
    require(s);
}
```

### Access Control
Restrict sensitive functions to authorized addresses using standard patterns.

```solidity
// BAD
function setOwner(address _new) public {
    owner = _new;
}
```

```solidity
// GOOD
function setOwner(address _new) public onlyOwner {
    owner = _new;
}
```

### Reentrancy Protection
Use mutexes to prevent recursive calls into the same function or contract.

```solidity
// BAD
function claim() public {
    require(!claimed[msg.sender]);
    msg.sender.call{value: 1 ether}("");
    claimed[msg.sender] = true;
}
```

```solidity
// GOOD
function claim() public nonReentrant {
    require(!claimed[msg.sender]);
    claimed[msg.sender] = true;
    payable(msg.sender).transfer(1 ether);
}
```

### Safe External Calls
Handle token transfer failures and validate external contract interactions.

```solidity
// BAD
function pay(IERC20 token, uint amount) public {
    token.transfer(msg.sender, amount);
}
```

```solidity
// GOOD
using SafeERC20 for IERC20;
function pay(IERC20 token, uint amount) public {
    token.safeTransfer(msg.sender, amount);
}
```

## High Priority Patterns

### Input Validation
Sanitize all user-provided data to prevent unexpected state changes.

```solidity
// BAD
function setRate(uint _rate) public {
    rate = _rate;
}
```

```solidity
// GOOD
function setRate(uint _rate) public {
    if (_rate == 0) revert InvalidRate();
    rate = _rate;
}
```

### Upgrade Safety
Protect implementation contracts and ensure storage compatibility.

```solidity
// BAD
contract MyProxy is Initializable {
    uint public x;
    function init(uint _x) public { x = _x; }
}
```

```solidity
// GOOD
contract MyProxy is Initializable {
    uint public x;
    function init(uint _x) public initializer { x = _x; }
}
```

### Circuit Breakers
Implement emergency stop mechanisms to pause functionality during attacks.

```solidity
// BAD
function trade() public {
    _performTrade();
}
```

```solidity
// GOOD
function trade() public whenNotPaused {
    _performTrade();
}
```

## Medium Priority Patterns

### Signature Security
Prevent replay attacks by including nonces and domain separators.

```solidity
// BAD
function exec(bytes memory sig) public {
    address signer = recover(sig);
    _doWork(signer);
}
```

```solidity
// GOOD
function exec(bytes memory sig, uint nonce) public {
    require(!used[nonce]);
    used[nonce] = true;
    address signer = recover(sig, nonce);
}
```

### Randomness
Avoid using on-chain data for randomness; use verifiable random functions.

```solidity
// BAD
uint rand = uint(keccak256(abi.encodePacked(block.timestamp)));
```

```solidity
// GOOD
// Use Chainlink VRF
uint rand = IVRF(vrf).requestRandomWords();
```

### Event Emission
Emit events for all significant state changes to facilitate off-chain tracking.

```solidity
// BAD
function update(uint _v) public {
    val = _v;
}
```

```solidity
// GOOD
function update(uint _v) public {
    val = _v;
    emit Updated(_v);
}
```

## Common Vulnerability Checklist

| Vulnerability Name | SCWE ID | Quick Fix |
| :--- | :--- | :--- |
| tx.origin Authentication | SCWE-018 | Use msg.sender instead |
| Unprotected SELFDESTRUCT | SCWE-038 | Add access control to selfdestruct |
| Reentrancy - External Call Before State Update | SCWE-046 | Use CEI pattern or ReentrancyGuard |
| Unchecked External Call Return Value | SCWE-109 | Use require() or SafeERC20 |
| Delegatecall Injection | SCWE-132 | Validate target address for delegatecall |
| Integer Overflow/Underflow | SCWE-106 | Use Solidity 0.8+ or SafeMath |
| Default Function Visibility | SCWE-128 | Explicitly define visibility |
| Unencrypted On-Chain Private Data | SCWE-136 | Encrypt data or store off-chain |
| Weak Randomness | SCWE-015 | Use Chainlink VRF or commit-reveal |
| Unprotected Ether Withdrawal | SCWE-029 | Add access control to withdrawal |
| Uninitialized Storage Pointer | SCWE-043 | Initialize all storage pointers |
| Signature Replay Attack | SCWE-020 | Use nonces and EIP-712 |
| Hash Collision with abi.encodePacked | SCWE-025 | Use abi.encode for dynamic types |
| DoS with Block Gas Limit | SCWE-031 | Avoid loops over unbounded arrays |
| Floating Pragma | SCWE-058 | Lock pragma to a specific version |
| Front-Running | SCWE-063 | Use commit-reveal or slippage protection |
| Unprotected Initializer | SCWE-053 | Use 'initializer' modifier |
| Incorrect Access Control | SCWE-048 | Use OpenZeppelin AccessControl/Ownable |
| DoS with Unexpected Revert | SCWE-030 | Use pull-over-push for payments |
| Assert Violation | SCWE-067 | Use require() for input validation |
| Lack of Reentrancy Guard | SCWE-077 | Add nonReentrant modifier |
| Forced Ether via Self-Destruct | SCWE-079 | Don't rely on address(this).balance |
| Hardcoded Gas Amount | SCWE-100 | Avoid .transfer(), use .call() |

## Enhanced with MCP
If you have the `solidity-agent-toolkit` MCP server configured, these tools provide automated security analysis:
- `run_slither` for static analysis
- `match_vulnerability_patterns` for heuristic detection
- `check_vulnerability` for SCWE pattern matching
- `search_vulnerabilities` for OWASP knowledge base lookup

## References
- [OWASP Smart Contract Top 10 (2026)](references/owasp-scwe-top10.md)

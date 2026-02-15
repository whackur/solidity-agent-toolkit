---
name: solidity-gas-optimization
description: Gas optimization patterns for Solidity smart contracts. Use when optimizing contract deployment costs, runtime gas usage, or storage efficiency. Covers storage packing, custom errors, immutable variables, calldata optimization, loop patterns, assembly usage, and Solady gas-optimized alternatives. Triggers on tasks involving gas optimization, storage layout, deployment cost reduction, or EVM efficiency.
license: MIT
metadata:
  author: whackur
  version: "1.0.0"
---

# Solidity Gas Optimization

## When to Apply
- During contract development to reduce deployment and runtime costs.
- When hitting the 24KB contract size limit.
- When optimizing high-frequency functions (e.g., swaps, transfers).
- When designing storage-heavy protocols.
- Before final security audits to ensure efficiency doesn't compromise safety.

## Critical Optimizations

### Storage Layout Packing
Pack variables into 32-byte slots by ordering them by size.
```solidity
// BAD: 3 slots
uint128 a; uint256 b; uint128 c;
// GOOD: 2 slots
uint128 a; uint128 c; uint256 b;
```

### Custom Errors vs Revert Strings
Custom errors save gas on deployment and revert execution.
```solidity
// BAD: revert("Unauthorized");
// GOOD:
error Unauthorized();
if (msg.sender != owner) revert Unauthorized();
```

### Immutable and Constant Variables
Use `constant` for values known at compile time, `immutable` for values set in constructor.
```solidity
// GOOD: Saves ~20k gas per read vs storage
uint256 public constant FEE = 100;
address public immutable factory;
```

## High Impact Optimizations

### Calldata vs Memory
Use `calldata` for read-only function parameters to avoid copying to memory.
```solidity
// BAD: function process(uint[] memory data)
// GOOD: function process(uint[] calldata data)
```

### Unchecked Arithmetic
Use `unchecked` for increments in loops where overflow is impossible.
```solidity
// GOOD: Saves gas on every iteration
for (uint i = 0; i < len; ) {
    // logic
    unchecked { ++i; }
}
```

### Short-Circuit Evaluation
Order `&&` and `||` conditions so the cheapest/most likely to fail/succeed is first.
```solidity
// GOOD: cheapCondition() checked first
if (cheapCondition() && expensiveCondition()) { ... }
```

## Medium Impact Optimizations

### Loop Optimizations
Cache array length and avoid storage reads inside loops.
```solidity
// GOOD: Cache length, use calldata/memory
uint len = arr.length;
for (uint i = 0; i < len; ++i) { ... }
```

### Efficient Data Types
Use `uint256` for general math (EVM word size). Use `bytes32` instead of `string` for short text.
```solidity
// GOOD: bytes32 is cheaper than string
bytes32 public constant NAME = "MyToken";
```

### Minimize Storage Writes
Batch updates and use transient storage (`TSTORE`/`TLOAD`) for same-transaction state.
```solidity
// GOOD: EIP-1153 (Solidity >=0.8.24)
assembly { tstore(slot, value) }
```

## Advanced Optimizations

### Assembly (Yul)
Use for fine-grained control over storage and memory. Document heavily.
```solidity
// GOOD: Efficient transfer
assembly {
    let success := call(gas(), to, amount, 0, 0, 0, 0)
}
```

### Solady Library
Use Solady for highly optimized base contracts and utilities.
```solidity
// GOOD: Use Solady's SafeTransferLib
import {SafeTransferLib} from "solady/utils/SafeTransferLib.sol";
SafeTransferLib.safeTransfer(token, to, amount);
```

### EIP-1167 Minimal Proxy
Use the "Clone" pattern to deploy many instances of a contract cheaply.
```solidity
// GOOD: Deploy proxy instead of full contract
address instance = LibClone.clone(implementation);
```

## Optimization Checklist
1. [ ] Are variables packed into 32-byte slots?
2. [ ] Are all revert strings replaced with custom errors?
3. [ ] Are `constant` and `immutable` used where possible?
4. [ ] Are function parameters `calldata` instead of `memory`?
5. [ ] Are loop increments `unchecked`?
6. [ ] Is array length cached before loops?
7. [ ] Are `uint256` used instead of smaller types for math?
8. [ ] Are `bytes32` used instead of `string` for short data?
9. [ ] Are storage writes minimized/batched?
10. [ ] Is `short-circuiting` applied to complex conditionals?
11. [ ] Are `external` functions used instead of `public` where possible?
12. [ ] Is `Solady` used for standard utilities?
13. [ ] Are `TSTORE`/`TLOAD` used for transient state?
14. [ ] Is the contract size within the 24KB limit?

## Enhanced with MCP
Leverage `solidity-agent-toolkit` tools for precise optimization:
- `gas_snapshot`: Compare gas usage across different implementations.
- `inspect_storage`: Visualize storage layout and identify packing opportunities.
- `estimate_gas`: Get real-time gas estimates for specific function calls.

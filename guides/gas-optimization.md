# Solidity Gas Optimization

## When to Apply

- Comparing implementations of a measured hot path or reducing deployment cost.
- Reviewing storage-heavy protocols, bounded batch operations, or contract-size constraints.
- Re-baselining gas for a target chain, fork, compiler, or deployment configuration.

## Measure-First Workflow

1. Record the target chain and fork, compiler version, optimizer settings and runs, `viaIR` setting, EVM target, and benchmark inputs and state.
2. Capture a baseline with the project's test and gas-reporting tools. Include the functions and deployment costs relevant to the change.
3. Choose one candidate tied to measured cost and make one change at a time.
4. Run the same functional, fuzz, invariant, and security checks that cover the changed behavior. For upgradeable contracts, compare storage layouts and preserve existing slots.
5. Repeat the benchmark under the same configuration and conditions. Keep the change only when the measured benefit justifies its complexity and tradeoffs.
6. Report before-and-after measurements, the toolchain and fork, the tested behavior, and any limitations. Do not present estimates as measured savings.

Gas costs and code-size limits depend on the target chain and fork. For Ethereum L1 after Glamsterdam, load the `glamsterdam` guide and re-check its cited EIPs before relying on protocol constants.

## Optimization Candidates

Treat each item as a hypothesis to measure, not a requirement to change code.

### Storage Packing

Check whether values with compatible lifetimes and access patterns can share a storage slot. Smaller types may add masking or conversion work when they do not pack. Never reorder existing state variables in a deployed upgradeable contract; use the project's approved storage-layout migration process.

### Calldata vs Memory

For external parameters that are only read, compare `calldata` with `memory`. It may avoid copying into memory, but compiler behavior and the contract's use of the parameter affect the result.

### Unchecked Arithmetic

Use checked arithmetic by default. Consider `unchecked` only when a local invariant proves the operation cannot wrap for every reachable input and state. Document the invariant and test its boundaries; gas savings do not justify weakening correctness.

### Short-circuiting

For `&&` and `||`, consider condition cost and how often each condition is decisive. Reorder only when evaluation has no side effects and the observable behavior, including revert behavior, remains acceptable.

### Events vs Storage

Events can replace storage only for data needed exclusively by off-chain consumers. Contracts cannot read past logs, so retain state that on-chain logic, later calls, or on-chain integrations need.

### Immutable and Constant

Use `constant` for compile-time values and `immutable` for values fixed at construction when that matches the intended mutability. Measure deployment size and runtime cost in the actual call paths.

### Loop Optimization

Measure loops using representative sizes and state. Check repeated storage reads and writes, bounds, and whether caching a value changes behavior. Compiler optimizations can make manual caching or increment changes redundant.

### Custom Errors vs Require Strings

Custom errors can reduce revert-data and bytecode cost compared with long revert strings. Preserve useful diagnostics and any expected external error interface; do not replace every message without measuring and checking compatibility.

### Mapping vs Array

Mappings suit keyed lookup but do not support enumeration; arrays support ordered iteration at a cost that grows with their contents. Choose based on required reads, iteration, deletion, and bounds, then benchmark realistic workloads.

### Batch Operations

Batching can amortize per-transaction overhead, but increases per-call gas, calldata, and the impact of a revert. Bound batch sizes and verify atomicity or partial-progress behavior under the target block and transaction limits.

## Other Candidates

- Minimize redundant storage writes only when state transitions remain clear and correct.
- Consider transient storage for data that must exist only within one transaction and only on chains supporting EIP-1153; verify reentrancy and call-context behavior.
- Consider assembly, optimized libraries such as Solady, or minimal proxies only after measuring the concrete path and reviewing the added safety, audit, and maintenance costs.
- Check deployment bytecode against the target network's active code-size limits. The `glamsterdam` guide covers the Ethereum L1 fork-specific change.

## Related MCP Capabilities

- `run_foundry` with `action: "gas_snapshot"` and optional `compare` or with `action: "gas_report"` — measure and compare function costs.
- `run_foundry` with `action: "inspect"` and `inspect: "storage"` — inspect storage layout before proposing packing changes.
- Use the `optimize_gas` prompt for a structured review based on this guide.
- Use the `code-review` guide to review security implications of optimized code.

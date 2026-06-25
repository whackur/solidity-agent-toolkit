---
name: solidity-code-review
description: Smart contract code review, security best practices, and audit methodology for Solidity. Use when writing, implementing, reviewing, auditing, or assessing the security of Solidity code. Covers the security thinking framework (CEI, least privilege, defense in depth), structured review process, severity classification, key inspection areas, secure patterns (reentrancy prevention, access control, SafeERC20, upgrade safety), OWASP SCWE Top 10, code improvement proposals, and reporting. Triggers on tasks involving code review, security audit, vulnerability detection, vulnerability assessment, access control, CEI pattern, ReentrancyGuard, SafeERC20, best practices check, or smart contract review.
license: MIT
metadata:
  author: whackur (whackur@gmail.com)
  version: "0.8.0"
---

# Solidity Code Review & Security Guide

## When to Apply

- Writing or implementing contracts and applying secure-by-default patterns.
- Performing a security audit, peer review, or general assessment of Solidity code.
- Auditing access control, external-call safety, and upgradeability logic.
- Preparing for a security audit or bug bounty, or responding to an incident.
- Debugging unexpected behavior in external contract interactions.

## Security Thinking Framework

Apply these foundational principles as a mental checklist. Each addresses a category of vulnerability and guides your reasoning.

### Core Principles

| Principle                             | What It Means                                                  | What to Verify                                             |
| :------------------------------------ | :------------------------------------------------------------- | :--------------------------------------------------------- |
| **Checks-Effects-Interactions (CEI)** | Validate inputs, update state, then interact externally        | State changes complete before any external call            |
| **Least Privilege**                   | Every function and role has the minimum access required        | Sensitive functions have appropriate access modifiers      |
| **Defense in Depth**                  | Multiple layers of protection, no single points of failure     | Combine CEI + ReentrancyGuard + SafeERC20 where applicable |
| **Fail-Safe Defaults**                | The default state is secure; access must be explicitly granted | Functions default to restricted, not open                  |
| **Complete Mediation**                | Every access to every resource is validated                    | No code paths bypass access control checks                 |

### Security Decision Process

For each function, ask in order:

1. **Who can call this?** — Access control (onlyOwner, hasRole, msg.sender validation)
2. **What inputs does it accept?** — Validate parameters (zero address, bounds, empty values)
3. **What state does it change?** — State updates happen before external interactions
4. **Does it interact externally?** — Apply CEI, use SafeERC20, check return values
5. **Can it be called recursively?** — Add ReentrancyGuard if external calls are present
6. **Is the state change visible?** — Emit events for off-chain tracking
7. **Can it be paused?** — Circuit breakers for critical operations

## Pre-Review Checklist

- **Compilation**: Code compiles without errors using the project's build system (Foundry, Hardhat).
- **Test Suite**: Existing tests pass; review coverage to find untested logic.
- **Dependencies**: External libraries and inherited contracts use pinned, trusted versions.
- **Documentation**: Read specs and NatSpec to understand intended behavior.
- **Known Issues**: Check previous audits and documented "known risks".
- **Scope**: Define the exact contracts and functions in scope.

## Review Methodology

1. **Scope & Architecture**: Map inheritance, external dependencies, and system architecture.
2. **Manual Line-by-Line Review**: Deep-dive critical functions, focusing on state changes and value transfers.
3. **Automated Analysis**: Run static analysis (Slither, Aderyn, Solhint) for common patterns and style.
4. **Vulnerability Pattern Matching**: Check known SCWE patterns (reentrancy, access control, etc.).
5. **Integration & Edge Cases**: Analyze contract interactions and boundary conditions (zero values, max integers).

## Severity Classification

| Severity     | Criteria                                                                              | Examples                                                              |
| :----------- | :------------------------------------------------------------------------------------ | :-------------------------------------------------------------------- |
| **Critical** | Direct loss of funds, permanent contract lock, or total compromise.                   | Reentrancy, Unprotected `withdraw`, Logic error in `transfer`.        |
| **High**     | Significant impact on system functionality or exploitable under realistic conditions. | Access control bypass, Unchecked external calls, Oracle manipulation. |
| **Medium**   | Limited impact or requires specific, difficult-to-achieve conditions.                 | Timestamp dependence, Front-running, Denial of Service (DoS).         |
| **Low**      | Best practice violations, informational findings, or minor optimizations.             | Missing events, Floating pragma, Unused variables.                    |

## Key Inspection Areas

Organized by OWASP SCSVS threat model. For each area, verify the listed controls.

### Access Control & Authorization (SCSVS-AUTH)

- `onlyOwner` or role-based access on ALL state-changing functions.
- Initializers protected and callable once only.
- No `tx.origin` for authentication — use `msg.sender`.
- Privileged roles guarded by multi-sig or timelock.

### External Calls & Reentrancy (SCSVS-COMM)

- Follow Checks-Effects-Interactions strictly; state updates before external calls.
- `ReentrancyGuard` on functions making external calls; watch cross-function/cross-contract reentrancy.
- Use `call()` (not `transfer`/`send`) for ETH; handle and check all return values.
- Pull-over-push pattern for payments.

### Arithmetic & Type Safety (SCSVS-CODE)

- For Solidity <0.8.0, ensure `SafeMath`. Check precision loss (multiply before dividing).
- Verify safe casting between types (`uint256` → `uint8`).
- Explicit visibility, fixed pragma, no deprecated constructs, no shadowing.

### Token Handling (ERC20/721)

- Use `SafeERC20` for `transfer`/`transferFrom`; account for fee-on-transfer tokens.
- Handle `approve` race conditions; verify `onERC721Received` reentrancy.

### Upgrade Safety

- Storage gaps in logic contracts to prevent collisions; verify storage compatibility across upgrades.
- Logic contracts avoid `selfdestruct`/untrusted `delegatecall`; proxy admin access restricted.

### Cryptography & Randomness (SCSVS-CRYPTO)

- No on-chain randomness (`block.timestamp`, `blockhash`) — use Chainlink VRF or commit-reveal.
- EIP-712 for structured signatures; nonces to prevent replay; validate `ecrecover != address(0)`.
- `abi.encode` over `abi.encodePacked` for dynamic types in hashing.

### DeFi & Oracle Safety (SCSVS-DEFI)

- Slippage protection on swaps/liquidity; flash-loan resistance in price-sensitive logic.
- Oracle manipulation protection (TWAP, multiple sources); no reliance on `address(this).balance` for accounting.

### Events & NatSpec (SCWE-063)

Events are the audit trail. Reason about them from the transaction logic, not just syntax — for every state transition an auditor or off-chain indexer would need to follow, verify an event exists, fires, and logs the truth. When one is missing or wrong, propose the correct declaration and `emit`.

- **Missing emission**: every state-changing public/external function emits an event (token transfers, ownership/role changes, config updates, upgrades, fund movements). A silent state change is an audit gap — propose the event.
- **Declared but never emitted**: an `event` that is declared yet never `emit`ted is a forgotten emission or dead code. Either wire it to the relevant state change or remove it.
- **Incorrect data**: the logged values must reflect the actual post-conditions (e.g. log the amount actually transferred, after a successful call — not the requested amount). Emit only after the effect succeeds.
- **Missing `indexed`**: mark key fields (addresses, ids) as `indexed` so off-chain consumers can filter logs efficiently (max 3 indexed topics per event).
- **No sensitive data**: never log secrets, raw auth hashes, or confidential business logic.
- NatSpec: accurate `@notice`, `@param`, `@return`; `@dev` for complex logic and security assumptions.

### Style Guide Compliance

- Naming: PascalCase (contracts), camelCase (functions), UPPER_CASE (constants).
- Function ordering by visibility (external → public → internal → private), then mutability.
- Modifier order: visibility, mutability, virtual, override, custom.
- See the [Solidity Style Guide Reference](./references/solidity-style-guide.md).

## Secure Patterns by Priority

**Critical** — CEI pattern (state before external calls); ReentrancyGuard (mutex on external interactions); access control on every state-changing function; SafeERC20 + checked `.call()` returns.

**High** — Input validation (zero address, bounds, empty arrays) with gas-efficient custom errors; upgrade safety (`initializer` modifier, storage compatibility); circuit breakers (Pausable) for fund-handling protocols.

**Medium** — Signature security (nonces + EIP-712); no on-chain randomness; events on all significant state changes.

## Code Improvement Proposals

A review is not complete at "is it safe?" — also surface how the code could be **better**. For each reviewed unit, consider proposing:

- **Better patterns**: Replace ad-hoc access checks with `AccessControl`; replace manual reentrancy flags with `ReentrancyGuard`; replace `require(string)` with custom errors.
- **Simpler design**: Reduce state surface, remove redundant storage reads, collapse duplicated logic into a single internal function.
- **Gas efficiency**: Pack storage, prefer `calldata`, cache array length, evaluate Solady alternatives — only when it does not compromise clarity or safety.
- **Readability & maintainability**: Clearer naming, NatSpec on non-obvious invariants, splitting oversized functions.
- **Testability**: Pure logic separated from I/O, events that make off-chain assertions possible.

Frame each proposal as: **current approach → suggested approach → concrete benefit (safety / gas / clarity)**. Mark proposals as `Low`/informational unless they fix a real defect.

## Reporting Format

### [SEVERITY] Finding Title

**ID**: SCWE-XXX _(replace with actual SCWE ID, e.g., SCWE-046 — see `search_vulnerabilities`)_
**Location**: `ContractName.sol:L42`
**Description**: Detailed explanation of the vulnerability and how it can be triggered.
**Impact**: What happens if exploited (e.g., "User funds can be stolen").
**Remediation**: Specific code changes or architectural adjustments to fix the issue.

## Enhanced with MCP

When using the `solidity-agent-toolkit`, run a structured review workflow:

**Static Analysis** — `run_slither` (SCWE-mapped findings), `run_aderyn` (fast Rust scanner), `run_solhint` (lint/style).

**Pattern Detection** — `match_vulnerability_patterns` (regex detection of 32+ patterns).

**Vulnerability Lookup** — `search_vulnerabilities` (SCWE database by keyword), `get_remediation` (fix guidance with code examples), `check_vulnerability` (match code to a known SCWE pattern).

**Style & Quality** — `check_style` (12 rules), `format_code`, `validate_natspec`.

**Reference Data** — `scwe://{id}`, `scwe://category/{category}`, `sctop10://list`.

**Guided Prompts** — `security_audit` (structured audit), `code_review` (quality assessment), `vulnerability_fix` (step-by-step remediation).

For attacker-perspective threat modeling, see the **Adversarial Analysis** skill.

## References

- [OWASP Smart Contract Top 10 (2026)](./references/owasp-scwe-top10.md)
- [Smart Contract Audit Checklist](./references/audit-checklist.md)
- [Solidity Style Guide Reference](./references/solidity-style-guide.md)

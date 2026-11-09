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

| Principle                             | What It Means                                              | What to Verify                                             |
| :------------------------------------ | :--------------------------------------------------------- | :--------------------------------------------------------- |
| **Checks-Effects-Interactions (CEI)** | Validate inputs, update state, then interact externally    | State changes complete before any external call            |
| **Least Privilege**                   | Every function and role has the minimum access required    | Sensitive functions have appropriate access modifiers      |
| **Defense in Depth**                  | Multiple layers of protection, no single points of failure | Combine CEI + ReentrancyGuard + SafeERC20 where applicable |
| **Fail-Safe Defaults**                | Privileges are granted deliberately                        | Permissionless user flows remain available when intended   |
| **Complete Mediation**                | Every access to every resource is validated                | No code paths bypass access control checks                 |

### Security Decision Process

For each function, ask in order:

1. **Who can call this?** — Access control (onlyOwner, hasRole, msg.sender validation)
2. **What inputs does it accept?** — Validate parameters (zero address, bounds, empty values)
3. **What state does it change?** — State updates happen before external interactions
4. **Does it interact externally?** — Apply CEI, use SafeERC20, check return values
5. **Can reentry violate an invariant?** — Review callbacks and related entry points; add a guard where needed to protect the invariant
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

Severity depends on demonstrated impact, exploitability, prerequisites, affected assets and users, and available mitigations. A vulnerability category alone does not determine severity; explain the concrete conditions and consequences for this system.

| Severity     | Criteria                                                                                        |
| :----------- | :---------------------------------------------------------------------------------------------- |
| **Critical** | Plausible exploitation causes catastrophic loss, broad control compromise, or systemic failure. |
| **High**     | A realistic path causes substantial loss, privilege escalation, or important system failure.    |
| **Medium**   | Impact is material but constrained by scope, prerequisites, or available mitigations.           |
| **Low**      | Impact is limited, or the issue is primarily informational with no demonstrated exploit path.   |

## Key Inspection Areas

Organized by OWASP SCSVS threat model. For each area, verify the listed controls.

### Access Control & Authorization (SCSVS-AUTH)

- Privileged state-changing functions are restricted to the roles intended by the design; user operations remain permissionless where intended.
- Initializers protected and callable once only.
- No `tx.origin` for authentication — use `msg.sender`.
- Privileged roles guarded by multi-sig or timelock.

### External Calls & Reentrancy (SCSVS-COMM)

- Follow Checks-Effects-Interactions strictly; state updates before external calls.
- Review reentrancy across callbacks, functions, and contracts; use a guard when reentry can violate a state invariant.
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

Events are an off-chain audit trail. For externally relevant state transitions that standards, integrations, or operators need to track, verify that the expected event fires and reports the actual outcome. Do not require an event for every internal or user-specific state change without a consumer need.

- **Missing emission**: required standard events and events relied on by integrations are emitted for the corresponding operation (token transfers, role changes, configuration updates, upgrades, fund movements).
- **Declared but never emitted**: an `event` that is declared yet never `emit`ted is a forgotten emission or dead code. Either wire it to the relevant state change or remove it.
- **Incorrect data**: the logged values must reflect the actual post-conditions (e.g. log the amount actually transferred, after a successful call — not the requested amount). Emit only after the effect succeeds.
- **Missing `indexed`**: mark key fields (addresses, ids) as `indexed` so off-chain consumers can filter logs efficiently (max 3 indexed topics per event).
- **No sensitive data**: never log secrets, raw auth hashes, or confidential business logic.
- NatSpec: accurate `@notice`, `@param`, `@return`; `@dev` for complex logic and security assumptions.

### Style Guide Compliance

- Naming: PascalCase (contracts), camelCase (functions), UPPER_CASE (constants).
- Function ordering by visibility (external → public → internal → private), then mutability.
- Modifier order: visibility, mutability, virtual, override, custom.
- See the `solidity-style-guide` guide for the full reference.

## Secure Patterns by Priority

**Security-critical review areas** — CEI where external interactions can observe or reenter mutable state; a reentrancy guard when needed to protect an invariant; authorization on privileged functions while preserving intended public user flows; SafeERC20 for external token calls and checked low-level call results.

**Other review areas** — Input validation (zero address, bounds, empty arrays); upgrade safety (`initializer` protection and storage compatibility); circuit breakers for protocols whose threat model requires them.

**Additional review areas** — Signature security (nonces + EIP-712); randomness sources; events for externally relevant state changes.

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

**ID**: SCWE-XXX _(replace with actual SCWE ID, e.g., SCWE-046 — see `lookup_knowledge` with `vulnerabilityId`)_
**Location**: `ContractName.sol:L42`
**Description**: Detailed explanation of the vulnerability and how it can be triggered.
**Impact**: What happens if exploited (e.g., "User funds can be stolen").
**Remediation**: Specific code changes or architectural adjustments to fix the issue.

## Related MCP Capabilities

**Static Analysis** — `run_security_scan` with `tool: "slither"` (SCWE-mapped findings), `"aderyn"` (fast Rust scanner), or `"solhint"` (lint/style).

**Pattern Detection** — `run_security_scan` with `tool: "patterns"` (AST detectors with regex fallback, no external tools).

**Structural Analysis** — `analyze_contract` with `access_control`, `proxy_safety`, `erc_compliance`, or `dependencies`.

**Vulnerability Lookup** — `lookup_knowledge` with `query` or `vulnerabilityId` (SCWE database by keyword or ID, with remediation and code examples).

**Style & Quality** — `check_code_quality` with `check: "style"` (12 rules, `fix: true` formats with forge fmt) or `check: "natspec"`.

**Reference Data** — `scwe://{id}`, `scwe://category/{category}`, `sctop10://list`.

**Guided Prompts** — `security_audit` (structured audit), `code_review` (quality assessment), `vulnerability_fix` (step-by-step remediation), `best_practices_check`.

For attacker-perspective threat modeling, see the `adversarial-analysis` guide.

## References

- For Ethereum L1 targets after the Glamsterdam hardfork, also apply the `glamsterdam` guide (gas repricing, state gas, `gasleft()` and fixed gas-cap assumptions, ETH transfer logs).

Load with `lookup_knowledge` (`guide`) or `guide://{topic}`:

- `owasp-scwe-top10` — OWASP Smart Contract Top 10 (2026)
- `audit-checklist` — Smart Contract Audit Checklist
- `solidity-style-guide` — Solidity Style Guide Reference

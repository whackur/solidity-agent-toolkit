# Smart Contract Audit Checklist

Use this as a standalone cross-check after defining the contracts, functions, chains, and behaviors in scope. For review workflow and severity assessment, see the `code-review` guide. Apply each item according to the intended design and caller-authority model; a category or checklist item does not establish a finding or its severity by itself.

## Architecture & Design (SCSVS-ARCH)

- **Proxy Pattern**: Proxy, implementation, and admin roles are correctly separated (SCWE-005).
- **Storage Gaps**: Upgradeable contracts preserve storage layout and reserve gaps where the chosen pattern requires them (SCWE-099).
- **Circular Dependencies**: No circular dependencies between contracts.
- **Surface Area**: Public and external entry points are limited to those required by the design.
- **Logic Initialization**: Proxy implementations disable direct initialization where required (SCWE-092); proxy initialization is one-time and protected against front-running (SCWE-098).
- **Trusted Delegatecall**: `delegatecall` targets are trusted and constrained by the design (SCWE-035).
- **Contract Size**: Check the active code-size limit for each target chain and fork. EIP-170's 24 KiB runtime limit applies where active; Ethereum L1 after Glamsterdam has a different limit. See the `glamsterdam` guide for fork-specific context.

> **Automate with:** `run_security_scan` (Slither, Aderyn), `run_security_scan` (`patterns`)

## Code Quality (SCSVS-CODE)

- **Explicit Visibility**: Functions declare visibility explicitly (SCWE-097).
- **Compiler Version**: Pin a supported compiler version and avoid a floating pragma (SCWE-060, SCWE-061).
- **Deprecated Functions**: Avoid deprecated Solidity functions and constructs (SCWE-072).
- **Custom Errors**: Consider custom errors where they preserve useful diagnostics and compatibility.
- **Unused Code**: Remove unused variables, functions, and imports (SCWE-007).
- **State Mutability**: Use `constant` and `immutable` when they match the intended value lifetime.
- **Variable Shadowing**: Avoid accidental shadowing of state or inherited variables (SCWE-069).
- **Data Location**: Use `memory`, `storage`, and `calldata` according to ownership and copying needs.
- **Naming Conventions**: Follow the Solidity style guide for contracts, functions, and variables.
- **Function Ordering**: Keep functions organized according to the project's style guide.

> **Automate with:** `check_code_quality` (`style`; `fix: true` formats), `run_security_scan` (Solhint), `check_code_quality` (`natspec`)

## Authorization (SCSVS-AUTH)

- **Access Control**: Restrict privileged actions according to the intended authority model; keep user operations permissionless when the design requires it (SCWE-016).
- **Origin Authentication**: Do not use `tx.origin` as an authentication authority (SCWE-018).
- **Initializer Protection**: Prevent unauthorized, repeated, or front-run initialization where applicable (SCWE-092, SCWE-098).
- **Privileged Roles**: Consider multisig or timelock controls for critical administrative actions.
- **Ownership Transfer**: Transfer ownership safely using the process required by the design.
- **Blacklisting/Whitelisting**: Ensure address lists and their administration follow the intended authority model.

> **Automate with:** `run_security_scan` (Slither), `run_security_scan` (`patterns`), `lookup_knowledge` (`query: "access control"`)

## Communication (SCSVS-COMM)

- **Call Results**: Check and handle low-level call success values (SCWE-048).
- **Untrusted Calls**: Do not `delegatecall` to untrusted or user-provided contracts (SCWE-035).
- **Payment Pattern**: Consider pull payments when recipient behavior could block unrelated progress.
- **Gas-Bounded Work**: Bound loops and batches over untrusted or growing data so they can make progress within the target chain's gas limits (SCWE-058).
- **Reentrancy**: Analyze callbacks and cross-function state interactions; use Checks-Effects-Interactions or a guard where appropriate (SCWE-046).
- **Ether Reception**: Accept incoming Ether only as intended and account for forced transfers.

> **Automate with:** `run_security_scan` (Slither, Aderyn), `run_security_scan` (`patterns`), `lookup_knowledge` (`query: "SCWE-046"`)

## Cryptography (SCSVS-CRYPTO)

- **Randomness**: Do not use predictable block values as high-value randomness (SCWE-024).
- **Signature Replay**: Where signatures authorize actions, use the appropriate domain separation, nonce, and expiry checks (SCWE-055).
- **Hash Collisions**: Avoid ambiguous `abi.encodePacked` hashing with multiple dynamic values; use an unambiguous encoding such as `abi.encode` (SCWE-074).
- **Malleability**: Use signature verification that rejects malleable signatures where relevant (SCWE-054).
- **Recovery Results**: Validate that `ecrecover` returns a nonzero, authorized signer.

> **Automate with:** `run_security_scan` (`patterns`), `lookup_knowledge` (`query: "cryptography"`)

## DeFi Specific (SCSVS-DEFI)

- **Slippage**: Apply user-protective slippage bounds to swaps and liquidity operations.
- **Flash Loans**: Test whether same-transaction capital can manipulate prices, votes, or accounting.
- **Oracle Safety**: Check oracle manipulation resistance, staleness, and deviation bounds.
- **Balance Reliance**: Do not treat raw token or Ether balances as internal accounting without accounting for donations and rebases.
- **Fee-on-Transfer**: Account for tokens that transfer less than the requested amount.
- **Rebasing Tokens**: Ensure accounting remains correct when balances change outside direct transfers.
- **Rounding Errors**: Set rounding directions from the economic invariant and test boundary cases.

> **Automate with:** `run_security_scan` (Slither), `run_security_scan` (`patterns`), `lookup_knowledge` (`query: "defi"`)

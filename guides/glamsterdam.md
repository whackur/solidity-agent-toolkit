# Glamsterdam (Amsterdam + Gloas) Audit Guide

## When to Apply

- Auditing or reviewing contracts that will run on Ethereum L1 after the Glamsterdam hardfork.
- Reviewing code with hardcoded gas values, `gasleft()` checks, fixed `call{gas: X}` budgets, or gas-reimbursement math (relayers, meta-transactions, paymasters, ERC-4337).
- Reviewing loops or batches that create storage slots, accounts, or contracts.
- Reviewing off-chain components in scope that detect ETH transfers from logs (bridges, deposit watchers, indexers).
- Re-baselining gas snapshots and size limits for L1 deployments.

## Status and Scope

- Fork contents are tracked in the meta EIP [EIP-7773](https://eips.ethereum.org/EIPS/eip-7773) (status: Review). As of 2026-11-05 the EIPs below are _Scheduled for Inclusion_; none is Final, and several are in Last Call, so **constants may still change**. Re-check the EIPs before relying on a number.
- Testnets: Sepolia activated at epoch 353024 (2026-10-06), Hoodi at epoch 132352 (2026-10-26). Mainnet activation: not yet scheduled at the time of writing.
- These are **Ethereum L1** changes. Do not assume any L2 or other EVM chain adopts them, or adopts them at the same time; multi-chain contracts must hold under both rule sets.
- Legend: values marked ✓ were cross-checked against the official EIP text; values marked ? were not verified and must be confirmed before citing in a report.

## Highest-Impact Changes for Contract Review

### EIP-8037 — State Creation Gas (state gas + reservoir)

New state is charged as a separate **state gas** at bytes × CPSB (cost per state byte, 1,530 ✓). Gas above the per-transaction execution cap goes into a **reservoir**; state gas is paid from the reservoir first, then from `gas_left`.

| Item                    | State gas                                   |
| :---------------------- | :------------------------------------------ |
| New storage slot (64 B) | 97,920 ✓                                    |
| New account (120 B)     | 183,600 ✓                                   |
| Code deposit            | 1,530 per byte + 6 × ceil(len/32) hashing ✓ |

What breaks:

- **`gasleft()` no longer describes the full budget.** `GAS` returns `gas_left` only, excluding the reservoir ✓. The reservoir passes to child frames in full while the 63/64 rule applies only to `gas_left` ✓, so `call{gas: X}` no longer reliably bounds how much state a callee can create. Conversely, a call that used to succeed can run out of gas when no reservoir is present.
- **New slots cost ~9× more.** A cold zero→nonzero SSTORE is ~12,100 execution + 97,920 state gas. Per-user mapping inserts, unbounded `push`, minting to new holders, and per-deposit receipts become out-of-gas or DoS risks.
- **Paying new accounts** costs an extra 183,600 state gas: airdrops, fan-out payouts, counterfactual addresses.
- **Per-user deployments** (factories) get much more expensive; EIP-1167 clones stay relatively cheap because their code is tiny.
- **Partial batches.** Identical code and gas cap can behave differently with no, enough, or a partially used reservoir, failing midway through a batch.
- The 2300-gas SSTORE stipend guard checks `gas_left` only ✓.

Checks:

- [ ] Every `gasleft()` comparison and hardcoded `gas:` argument: does it still bound state creation?
- [ ] Loops creating slots, accounts, or contracts: iterations that fit under the new costs; whether a midway failure leaves state half-updated.
- [ ] Griefing: can an attacker make the victim pay for new state (attacker-chosen mapping keys, array pushes)?
- [ ] Off-chain gas estimation (relayers, `verificationGasLimit`/`callGasLimit`, keepers) accounts for both gas kinds.

Remediation: reuse already-nonzero slots, prefer pull over push payments to fresh recipients, bound batch sizes, and test with no reservoir, a full reservoir, and one exhausted midway.

### EIP-8038 — State Access and Write Repricing

| Parameter                 | Before        | After           |
| :------------------------ | :------------ | :-------------- |
| COLD_ACCOUNT_ACCESS       | 2,600         | 3,000 ✓         |
| COLD_STORAGE_ACCESS       | 2,100         | 2,100 ✓         |
| WARM_ACCESS               | 100           | 100 ✓           |
| ACCOUNT_WRITE             | 6,700         | 9,000 ✓         |
| STORAGE_WRITE             | 2,800         | 10,000 ✓        |
| CREATE_ACCESS             | 7,000         | 12,000 ✓        |
| CALL_STIPEND              | 2,300         | 2,300 ✓         |
| STORAGE_CLEAR_REFUND      | 4,800         | 11,616 ✓        |
| Access list address / key | 2,400 / 1,900 | 2,900 / 2,000 ✓ |

- Updating an existing slot (cold, first nonzero→nonzero) rises from ~5,000 to ~12,100 gas, so contracts that never create slots still get more expensive.
- `CALL` with value costs `ACCOUNT_WRITE` (9,000) + stipend; the forwarded 2,300 stipend is unchanged ✓. Whether this applies to every value transfer to the same recipient is ?.
- Cold `EXTCODESIZE`/`EXTCODECOPY` may carry an extra +100 (≈3,100 cold) ?.
- The 20% refund cap is unchanged ✓.

Checks: fixed gas limits around SSTORE-heavy callbacks (hooks, `onERC721Received`, oracle callbacks); multi-recipient payout loops (≥ 9,000 + 3,000 per cold value transfer); hardcoded overhead constants in reimbursement formulas.

### EIP-2780 — Resource-Based Intrinsic Gas

The flat 21,000 splits into TX_BASE_COST 12,000 + cold recipient access 3,000 + TX_VALUE_COST 6,000 ✓, plus 183,600 state gas when the recipient does not exist ✓.

- "An ETH send costs 21,000" holds only for existing recipients.
- A zero-value contract call's intrinsic cost is 15,000, not 21,000 — relayer refund and fee formulas hardcoding 21,000 are now wrong in both directions.
- Running out of gas in pre-frame runtime charges yields an included, failed transaction (nonce bumped, fees paid); EIP-7702 delegations from that stage are reverted, while delegations survive failures after the first frame ✓. Do not treat "transaction failed" as "no delegation applied".

### EIP-7954 — Larger Code and Initcode Limits

Runtime code 24,576 → 65,536 bytes ✓; initcode 49,152 → 131,072 bytes ✓.

- Code that enforces the old limits itself (factories, size checks hardcoding 24,576/49,152, deterministic-address tooling) must be updated.
- Allowed is not affordable: a 64 KiB deployment needs ~100M state gas at 1,530/byte; check against transaction and block gas limits.
- Merged "monolithic" contracts enlarge the attack surface; keep the upgrade and access-control separation the old module split provided.
- Chains still at 24 KiB will reject contracts above it — verify multi-chain deployability.
- Test exact boundaries (at, just below, just above) for code size and CREATE/CREATE2 initcode, and match compiler `evmVersion` to the target fork.

## Transaction Data Costs

### EIP-7976 — Calldata Floor

Floor becomes 64 gas/byte for zero and nonzero bytes (STANDARD_TOKEN_COST 4, TOTAL_COST_FLOOR_PER_TOKEN 16) ✓; standard pricing stays 4/16 and the transaction pays the higher of the two.

- Data-heavy, compute-light designs (rollup inboxes, proof/signature bundles, calldata storage, bulk airdrop inputs) must be re-costed. Zero-byte compression gains nothing once the floor applies. A rough threshold for when the floor binds is `execution gas < 48·nz + 60·z` ?.
- Gas limits must reserve enough for the floor up front.

### EIP-7981 — Access List Surcharge

Access-list data adds 64 gas/byte: 1,280 per address, 2,048 per storage key ✓. Pre-declared access now usually costs more than a cold access (≈4,280 vs 3,000 per address; ≈4,148 vs 2,100 per key, derived). Tooling that auto-attaches access lists (`eth_createAccessList`) may raise costs.

### EIP-7778 — Block Gas Accounting Without Refunds

Block gas is counted before refunds; users still receive `max(used − refund, floor)` ✓. GasToken-style or refund-based block-packing tricks no longer gain capacity. Refunds never reduced in-execution gas needs — flag any design assuming they did.

## Observability

### EIP-7708 — ETH Transfers Emit Logs

Nonzero ETH transfers to a different account emit `Transfer(address,address,uint256)` from `0xffff…fffe` (SYSTEM_ADDRESS), covering transaction value, CALL, SELFDESTRUCT, CREATE, and CREATE2 ✓.

- Off-chain code treating every `Transfer` topic as ERC-20 misclassifies ETH; filter by emitter address.
- Summing both traces and these logs double-counts.
- The transaction-value log is emitted before other EVM logs ✓, so fixed log indexes (`logs[0]`) break.
- Not logged: priority fees, base-fee burn, withdrawals, zero-value transfers, and transfers in reverted calls ✓. Logs cannot reconstruct all balance changes.
- No on-chain impact: contracts cannot read logs.

## Protocol Changes with Indirect Contract Impact

- **EIP-7732 (ePBS)** ?: builder bids are committed in the beacon block and payloads revealed later, attested by a timeliness committee. MEV remains — keep slippage limits, deadlines, and commit-reveal. A slot may have no payload; do not assume every slot produces a block with transactions. Off-chain services should distinguish bid included, payload revealed, execution valid, and finalized.
- **EIP-8282 (builder requests)** ?: relevant only to contracts calling the builder request contract (builder custody or staking wrappers). An execution-layer success does not mean consensus-layer acceptance; exits from a non-`execution_address` sender or with a pending balance are silently dropped; amounts are uint64 gwei.
- **EIP-7928 (block-level access lists)** ?: node-level parallel validation; no contract-level impact and distinct from user EIP-2930 access lists.

## Cross-Cutting Checklist

1. Search for hardcoded gas values: `21000`, `2300`, `2600`, `5000`, `20000`, `gas:` arguments, `gasleft() >=`.
2. Bound loops that create slots, accounts, or contracts; verify partial-failure safety.
3. Gas accounting in relayers, meta-transactions, paymasters, and ERC-4337 covers execution gas, state gas, the calldata floor, and the access-list surcharge.
4. Fixed-gas-cap calls: can state creation succeed or fail depending on the reservoir, and can an attacker exploit that?
5. Off-chain ETH-transfer detection: system-address `Transfer` logs and fixed log indexes.
6. Code-size assumptions and portability to chains still at 24 KiB.
7. Re-run gas snapshots on a fork-enabled client; static reasoning is not enough.

## Severity Guidance

- **High**: gas-dependent logic whose failure locks or loses funds (payout loops that can no longer complete, withdrawals behind fixed gas caps that now fail, reimbursement formulas that can be drained).
- **Medium**: new griefing or DoS paths through state-creation costs; relayer or paymaster under-reimbursement.
- **Low / Informational**: stale gas constants in comments or tests, unnecessary access lists, outdated size-limit checks with no fund impact.

## Related MCP Capabilities

- `run_foundry` with `action: "gas_snapshot"` (with `compare`) or `"gas_report"` — re-baseline gas on a fork-enabled toolchain.
- `run_security_scan` with `tool: "patterns"` or `"slither"` — locate low-level calls, `gasleft()` usage, and loops for manual Glamsterdam review.
- `lookup_knowledge` — SCWE entries for gas griefing and DoS (e.g. query `"gas"` or `"denial of service"`).

## References

- `code-review` and `gas-optimization` guides for general methodology; this guide supersedes their pre-fork gas constants on Glamsterdam L1.
- Official specs: [EIP-7773](https://eips.ethereum.org/EIPS/eip-7773), [EIP-8037](https://eips.ethereum.org/EIPS/eip-8037), [EIP-8038](https://eips.ethereum.org/EIPS/eip-8038), [EIP-2780](https://eips.ethereum.org/EIPS/eip-2780), [EIP-7954](https://eips.ethereum.org/EIPS/eip-7954), [EIP-7976](https://eips.ethereum.org/EIPS/eip-7976), [EIP-7981](https://eips.ethereum.org/EIPS/eip-7981), [EIP-7778](https://eips.ethereum.org/EIPS/eip-7778), [EIP-7708](https://eips.ethereum.org/EIPS/eip-7708), [EIP-7732](https://eips.ethereum.org/EIPS/eip-7732), [EIP-8282](https://eips.ethereum.org/EIPS/eip-8282), [EIP-7928](https://eips.ethereum.org/EIPS/eip-7928).

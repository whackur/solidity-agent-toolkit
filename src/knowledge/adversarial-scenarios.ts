export type AdversarialCategory =
  | "reentrancy"
  | "flash-loan"
  | "oracle-manipulation"
  | "mev-frontrunning"
  | "governance"
  | "access-control"
  | "economic-logic"
  | "cross-contract";

export interface AdversarialScenario {
  id: string;
  category: AdversarialCategory;
  name: string;
  severity: "critical" | "high" | "medium";
  description: string;
  preConditions: string[];
  attackSteps: string[];
  invariantsViolated: string[];
  scweIds: string[];
  owasp2026: string;
  realWorldExample: string;
}

/**
 * Adversarial attack scenarios for smart contract security analysis.
 * Each scenario describes a concrete attack vector with pre-conditions,
 * ordered attack steps, and violated invariants.
 */
export const ADVERSARIAL_SCENARIOS: AdversarialScenario[] = [
  // ── reentrancy ──────────────────────────────────────────────────────
  {
    id: "AS-001",
    category: "reentrancy",
    name: "Classic Ether Drain via Fallback",
    severity: "critical",
    description:
      "Attacker exploits a vulnerable withdraw function by re-entering through a fallback/receive function before the victim contract updates its balance state.",
    preConditions: [
      "Contract holds user ETH balances in a mapping",
      "Withdraw function sends ETH via low-level call before updating state",
    ],
    attackSteps: [
      "Attacker deposits ETH into the vulnerable contract",
      "Attacker calls withdraw(), triggering a low-level call to the attacker contract",
      "Attacker's receive/fallback function re-enters withdraw() before balance is updated",
      "Re-entrant call succeeds because balance check still passes",
      "Loop repeats until contract is drained or gas runs out",
    ],
    invariantsViolated: [
      "User cannot withdraw more than their deposited balance",
      "Contract balance >= sum of all user balances",
    ],
    scweIds: ["SCWE-046"],
    owasp2026: "SC01",
    realWorldExample: "The DAO (2016)",
  },
  {
    id: "AS-002",
    category: "reentrancy",
    name: "Cross-Function Reentrancy",
    severity: "critical",
    description:
      "Attacker re-enters a different function that shares state with the vulnerable function, bypassing single-function reentrancy guards.",
    preConditions: [
      "Two or more functions share a mutable state variable (e.g., balances mapping)",
      "External call occurs before shared state is updated",
      "No cross-function reentrancy guard is present",
    ],
    attackSteps: [
      "Attacker calls function A which makes an external call before updating shared state",
      "During the external call, attacker re-enters function B that reads the stale shared state",
      "Function B executes based on outdated state, transferring additional funds or tokens",
      "Control returns to function A which completes normally",
    ],
    invariantsViolated: [
      "Shared state must be consistent across function calls within a transaction",
      "Total withdrawals cannot exceed deposited balance",
    ],
    scweIds: ["SCWE-010", "SCWE-046"],
    owasp2026: "SC01",
    realWorldExample: "Lendf.Me (2020)",
  },
  {
    id: "AS-003",
    category: "reentrancy",
    name: "Read-Only Reentrancy",
    severity: "high",
    description:
      "Attacker exploits a view function in a dependent protocol that reads stale state from a contract mid-execution, leading to incorrect price or balance calculations.",
    preConditions: [
      "Protocol A exposes a view function used by Protocol B for pricing or accounting",
      "Protocol A performs an external call before finalizing its state update",
      "Protocol B trusts Protocol A's view function as a source of truth",
    ],
    attackSteps: [
      "Attacker triggers a state-changing function in Protocol A that makes an external call",
      "During the external call callback, attacker interacts with Protocol B",
      "Protocol B calls Protocol A's view function, which returns stale (pre-update) state",
      "Protocol B executes logic based on incorrect values, benefiting the attacker",
    ],
    invariantsViolated: [
      "View functions must return consistent state at all times",
      "Cross-protocol pricing must reflect actual reserves",
    ],
    scweIds: ["SCWE-046", "SCWE-077"],
    owasp2026: "SC01",
    realWorldExample: "Curve/Vyper read-only reentrancy (2023)",
  },

  // ── flash-loan ──────────────────────────────────────────────────────
  {
    id: "AS-004",
    category: "flash-loan",
    name: "Flash Loan Price Manipulation",
    severity: "critical",
    description:
      "Attacker uses a flash loan to temporarily manipulate an AMM's spot price, exploiting protocols that rely on it as a price oracle.",
    preConditions: [
      "Target protocol uses an AMM spot price as a price oracle",
      "Flash loan provider has sufficient liquidity",
      "No TWAP or external oracle validation is used",
    ],
    attackSteps: [
      "Attacker borrows a large amount of token A via flash loan",
      "Attacker swaps token A for token B on the AMM, drastically moving the spot price",
      "Attacker interacts with the victim protocol which reads the manipulated spot price",
      "Attacker profits from the mispriced operation (e.g., liquidation, collateral valuation)",
      "Attacker swaps back and repays the flash loan with profit",
    ],
    invariantsViolated: [
      "Oracle price must reflect true market value",
      "Protocol accounting must be resistant to single-block manipulation",
    ],
    scweIds: ["SCWE-046", "SCWE-029"],
    owasp2026: "SC01",
    realWorldExample: "bZx (2020)",
  },
  {
    id: "AS-005",
    category: "flash-loan",
    name: "Flash Loan Governance Vote",
    severity: "high",
    description:
      "Attacker flash-borrows governance tokens to accumulate voting power and pass a malicious proposal in a single transaction.",
    preConditions: [
      "Governance uses token balance at time of vote for voting power",
      "No snapshot mechanism or voting delay is enforced",
      "Flash loan of governance token is available",
    ],
    attackSteps: [
      "Attacker flash-borrows a large amount of governance tokens",
      "Attacker delegates voting power and votes on a pending malicious proposal",
      "Proposal passes quorum due to flash-borrowed voting power",
      "Attacker repays flash loan in the same transaction",
    ],
    invariantsViolated: [
      "Voting power must represent genuine long-term stake",
      "Governance decisions must not be influenced by temporary token holders",
    ],
    scweIds: ["SCWE-048"],
    owasp2026: "SC06",
    realWorldExample: "Beanstalk (2022)",
  },

  // ── oracle-manipulation ─────────────────────────────────────────────
  {
    id: "AS-006",
    category: "oracle-manipulation",
    name: "Spot Price Oracle Manipulation",
    severity: "critical",
    description:
      "Attacker manipulates an on-chain spot price oracle by executing large trades, causing dependent protocols to use incorrect prices.",
    preConditions: [
      "Protocol relies on a single DEX spot price as oracle",
      "No time-weighted average or multi-source oracle aggregation",
      "Attacker has sufficient capital or flash loan access",
    ],
    attackSteps: [
      "Attacker acquires large position via flash loan or own capital",
      "Attacker executes a large swap to skew the spot price on the DEX",
      "Attacker triggers the victim protocol's price-dependent operation",
      "Victim protocol reads manipulated price, executing at unfavorable terms",
      "Attacker reverses the trade and profits from the price discrepancy",
    ],
    invariantsViolated: [
      "Oracle price must approximate fair market value",
      "Collateral valuations must be resistant to single-block manipulation",
    ],
    scweIds: ["SCWE-015", "SCWE-065"],
    owasp2026: "SC01",
    realWorldExample: "Harvest Finance (2020)",
  },
  {
    id: "AS-007",
    category: "oracle-manipulation",
    name: "TWAP Oracle Manipulation",
    severity: "high",
    description:
      "Attacker manipulates a time-weighted average price oracle by sustaining price distortion across multiple blocks, exploiting short TWAP windows.",
    preConditions: [
      "Protocol uses a TWAP oracle with a short observation window",
      "Low liquidity in the observed pool allows price movement",
      "Attacker can sustain position across multiple blocks",
    ],
    attackSteps: [
      "Attacker identifies a TWAP oracle with a short window (e.g., 10 minutes)",
      "Attacker executes trades to push price in desired direction over multiple blocks",
      "TWAP gradually shifts toward the manipulated price",
      "Attacker exploits the victim protocol once TWAP reaches target deviation",
    ],
    invariantsViolated: [
      "TWAP must resist sustained multi-block manipulation",
      "Price feeds must reflect broad market consensus",
    ],
    scweIds: ["SCWE-015"],
    owasp2026: "SC01",
    realWorldExample: "Inverse Finance (2022)",
  },

  // ── mev-frontrunning ────────────────────────────────────────────────
  {
    id: "AS-008",
    category: "mev-frontrunning",
    name: "Sandwich Attack on DEX Swap",
    severity: "high",
    description:
      "MEV searcher front-runs and back-runs a victim's swap transaction, profiting from the price impact at the victim's expense.",
    preConditions: [
      "Victim submits a swap on a public mempool AMM",
      "Swap has low slippage tolerance or no minimum output set",
      "MEV searcher monitors the mempool for profitable opportunities",
    ],
    attackSteps: [
      "MEV searcher detects victim's pending swap transaction in the mempool",
      "Searcher front-runs by buying the target token, pushing the price up",
      "Victim's swap executes at a worse price due to the front-run",
      "Searcher back-runs by selling the token at the inflated price",
    ],
    invariantsViolated: [
      "User receives fair market price for their swap",
      "Price impact is limited to the user's own trade size",
    ],
    scweIds: ["SCWE-063"],
    owasp2026: "SC07",
    realWorldExample: "Widespread on Uniswap/Sushiswap (2020-present)",
  },
  {
    id: "AS-009",
    category: "mev-frontrunning",
    name: "Transaction Ordering Exploitation",
    severity: "high",
    description:
      "Attacker observes a profitable pending transaction and submits a competing transaction with higher gas to execute first, stealing the opportunity.",
    preConditions: [
      "Profitable transaction is visible in the public mempool",
      "Outcome depends on transaction execution order",
      "No commit-reveal or private submission mechanism is used",
    ],
    attackSteps: [
      "Attacker monitors mempool for profitable pending transactions",
      "Attacker copies or adapts the transaction for their own benefit",
      "Attacker submits with higher gas price to ensure priority execution",
      "Attacker's transaction executes first, capturing the value",
    ],
    invariantsViolated: [
      "First-mover advantage belongs to the original submitter",
      "Transaction outcomes should not depend on ordering within a block",
    ],
    scweIds: ["SCWE-063"],
    owasp2026: "SC07",
    realWorldExample: "Flashbots research on generalized frontrunning (2021)",
  },

  // ── governance ──────────────────────────────────────────────────────
  {
    id: "AS-010",
    category: "governance",
    name: "Flash Loan Governance Takeover",
    severity: "critical",
    description:
      "Attacker uses flash-borrowed tokens to reach quorum and pass a malicious governance proposal that drains the treasury or changes critical parameters.",
    preConditions: [
      "Governance voting power is based on current token balance, not snapshots",
      "No voting delay or lock period is enforced",
      "Governance token is available on flash loan platforms",
    ],
    attackSteps: [
      "Attacker creates a malicious governance proposal in advance",
      "Attacker waits until proposal reaches voting phase",
      "Attacker flash-borrows governance tokens to exceed quorum threshold",
      "Attacker votes to pass the malicious proposal in a single transaction",
      "Proposal executes, transferring treasury funds or changing parameters",
    ],
    invariantsViolated: [
      "Governance outcomes must reflect genuine stakeholder consensus",
      "Treasury funds must only be spent via legitimate governance",
    ],
    scweIds: ["SCWE-048"],
    owasp2026: "SC06",
    realWorldExample: "Beanstalk governance attack (2022)",
  },
  {
    id: "AS-011",
    category: "governance",
    name: "Timelock Bypass via Emergency Function",
    severity: "high",
    description:
      "Attacker exploits an unprotected emergency or admin function that bypasses the timelock, executing privileged operations without the required delay.",
    preConditions: [
      "Contract has an emergency function that bypasses timelock controls",
      "Emergency function lacks proper multi-sig or access control",
      "Attacker gains access to a privileged role",
    ],
    attackSteps: [
      "Attacker identifies an emergency function that skips the timelock",
      "Attacker compromises or social-engineers access to the admin key",
      "Attacker calls the emergency function to execute a privileged operation instantly",
      "Operation completes before community can react or intervene",
    ],
    invariantsViolated: [
      "All privileged operations must go through the timelock delay",
      "Emergency functions must require multi-sig authorization",
    ],
    scweIds: ["SCWE-048", "SCWE-053"],
    owasp2026: "SC06",
    realWorldExample: "Ronin Bridge (2022)",
  },

  // ── access-control ──────────────────────────────────────────────────
  {
    id: "AS-012",
    category: "access-control",
    name: "Unprotected Initializer Takeover",
    severity: "critical",
    description:
      "Attacker calls an unprotected initializer function on a proxy implementation contract, gaining ownership or admin privileges.",
    preConditions: [
      "Proxy pattern is used with a separate implementation contract",
      "Implementation contract's initialize function lacks the initializer modifier",
      "Implementation contract was not initialized after deployment",
    ],
    attackSteps: [
      "Attacker discovers the uninitialized implementation contract address",
      "Attacker calls the initialize function directly on the implementation",
      "Attacker sets themselves as owner or admin of the implementation",
      "Attacker uses admin privileges to upgrade the proxy to a malicious implementation",
    ],
    invariantsViolated: [
      "Only authorized deployers can initialize contracts",
      "Implementation contracts must be locked against direct initialization",
    ],
    scweIds: ["SCWE-053"],
    owasp2026: "SC04",
    realWorldExample: "Wormhole uninitialized proxy (2022)",
  },
  {
    id: "AS-013",
    category: "access-control",
    name: "Proxy Admin Slot Hijack",
    severity: "critical",
    description:
      "Attacker exploits a storage collision or unprotected admin function to overwrite the proxy admin slot, gaining full upgrade authority.",
    preConditions: [
      "Proxy uses a non-standard storage slot for admin address",
      "Storage layout collision exists between proxy and implementation",
      "Admin upgrade function is callable by non-admin addresses",
    ],
    attackSteps: [
      "Attacker analyzes proxy storage layout to identify admin slot",
      "Attacker finds a function that can write to the admin storage slot via collision",
      "Attacker calls the function with crafted input to overwrite the admin address",
      "Attacker upgrades the proxy to a malicious implementation contract",
    ],
    invariantsViolated: [
      "Only the designated admin can upgrade the proxy",
      "Storage slots must not collide between proxy and implementation",
    ],
    scweIds: ["SCWE-048", "SCWE-035"],
    owasp2026: "SC04",
    realWorldExample: "Audius proxy exploit (2022)",
  },

  // ── economic-logic ──────────────────────────────────────────────────
  {
    id: "AS-014",
    category: "economic-logic",
    name: "Reward Calculation Rounding Exploit",
    severity: "medium",
    description:
      "Attacker exploits integer division rounding in reward distribution to extract more rewards than entitled by making many small deposits or claims.",
    preConditions: [
      "Reward calculation uses integer division that rounds down",
      "Small deposits or frequent claims can accumulate rounding errors",
      "No minimum deposit or claim threshold is enforced",
    ],
    attackSteps: [
      "Attacker identifies rounding behavior in reward calculation",
      "Attacker makes many small deposits to maximize favorable rounding",
      "Attacker claims rewards frequently, each time benefiting from rounding in their favor",
      "Accumulated rounding errors result in attacker extracting excess rewards",
    ],
    invariantsViolated: [
      "Total distributed rewards must not exceed allocated reward pool",
      "Reward per user must be proportional to their contribution",
    ],
    scweIds: ["SCWE-106"],
    owasp2026: "SC03",
    realWorldExample: "Multiple DeFi yield farming exploits (2020-2021)",
  },
  {
    id: "AS-015",
    category: "economic-logic",
    name: "ERC4626 Vault Inflation Attack",
    severity: "high",
    description:
      "First depositor donates tokens directly to the vault to inflate the share price, causing subsequent depositors to receive zero shares due to rounding.",
    preConditions: [
      "ERC4626 vault has no initial deposits or virtual offset",
      "Share calculation uses totalAssets() which includes donated tokens",
      "No minimum deposit or virtual share mechanism is implemented",
    ],
    attackSteps: [
      "Attacker deposits a minimal amount (e.g., 1 wei) to become the first depositor",
      "Attacker donates a large amount of tokens directly to the vault (not via deposit)",
      "Share price is now extremely inflated (totalAssets / totalShares is very large)",
      "Subsequent depositors receive 0 shares due to integer division rounding",
      "Attacker redeems their shares to claim all deposited assets",
    ],
    invariantsViolated: [
      "Depositors must always receive a non-zero share amount",
      "Share price must not be manipulable by direct token transfers",
    ],
    scweIds: ["SCWE-106", "SCWE-029"],
    owasp2026: "SC03",
    realWorldExample: "OpenZeppelin ERC4626 inflation attack disclosure (2022)",
  },

  // ── cross-contract ──────────────────────────────────────────────────
  {
    id: "AS-016",
    category: "cross-contract",
    name: "Malicious ERC777 Token Callback",
    severity: "critical",
    description:
      "Attacker deploys or uses an ERC777 token whose transfer hooks re-enter the victim contract, exploiting the token callback mechanism.",
    preConditions: [
      "Victim contract accepts arbitrary ERC20-compatible tokens",
      "Victim does not account for ERC777 send/receive hooks",
      "Victim performs state changes after token transfer calls",
    ],
    attackSteps: [
      "Attacker identifies a contract that transfers tokens before updating state",
      "Attacker uses an ERC777 token with a tokensReceived hook",
      "During the token transfer, the hook re-enters the victim contract",
      "Victim contract executes with stale state, benefiting the attacker",
    ],
    invariantsViolated: [
      "Token transfers must not trigger re-entrant execution",
      "State must be updated before any external interaction",
    ],
    scweIds: ["SCWE-046", "SCWE-109"],
    owasp2026: "SC01",
    realWorldExample: "imBTC Uniswap pool drain (2020)",
  },
  {
    id: "AS-017",
    category: "cross-contract",
    name: "Composability Assumption Violation",
    severity: "high",
    description:
      "Protocol assumes a specific behavior from an external contract (e.g., standard ERC20) that is violated by a non-standard or malicious implementation.",
    preConditions: [
      "Protocol integrates with arbitrary external token contracts",
      "Protocol assumes standard ERC20 behavior (return values, no fee-on-transfer)",
      "No validation of actual token behavior is performed",
    ],
    attackSteps: [
      "Attacker identifies protocol assumptions about external token behavior",
      "Attacker deploys a token with non-standard behavior (fee-on-transfer, rebasing, etc.)",
      "Attacker interacts with the protocol using the non-standard token",
      "Protocol accounting breaks due to mismatched expected vs actual token behavior",
    ],
    invariantsViolated: [
      "Protocol accounting must match actual token balances",
      "External contract interactions must validate actual outcomes",
    ],
    scweIds: ["SCWE-109"],
    owasp2026: "SC01",
    realWorldExample: "Multiple DeFi protocols affected by fee-on-transfer tokens (2021)",
  },
];

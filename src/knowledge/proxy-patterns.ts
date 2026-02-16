export interface ProxyAntiPattern {
  id: string;
  name: string;
  severity: "critical" | "high" | "medium" | "low";
  patterns: RegExp[];
  description: string;
  recommendation: string;
}

/**
 * 8 proxy/upgrade anti-patterns for detecting unsafe upgrade practices.
 * These complement (not duplicate) the generic patterns in vulnerability-patterns.ts.
 * Applied only when the contract is detected as upgradeable.
 */
export const PROXY_ANTI_PATTERNS: ProxyAntiPattern[] = [
  {
    id: "PROXY-001",
    name: "Unprotected Initializer",
    severity: "critical",
    patterns: [
      // initialize/init function without `initializer` modifier (OZ v4+v5)
      /function\s+initialize\s*\([^)]*\)\s+(?:public|external)(?!\s+initializer)\b/,
      /function\s+init\s*\([^)]*\)\s+(?:public|external)(?!\s+initializer)\b/,
    ],
    description:
      "Initializer function lacks the `initializer` modifier, allowing anyone to re-initialize " +
      "the proxy and potentially take ownership. This is the most common proxy vulnerability.",
    recommendation:
      "Add the `initializer` modifier from OpenZeppelin's Initializable contract. " +
      "Use `reinitializer(n)` for subsequent version upgrades.",
  },
  {
    id: "PROXY-002",
    name: "Constructor in Upgradeable Contract",
    severity: "critical",
    patterns: [
      // constructor with parameters (state-setting logic, not just _disableInitializers)
      /constructor\s*\([^)]+\)\s*\{/,
      // constructor with body beyond _disableInitializers()
      /constructor\s*\(\s*\)\s*\{(?!\s*_disableInitializers\s*\(\s*\)\s*;\s*\})/,
    ],
    description:
      "Upgradeable contracts must not use constructors because constructor logic runs only on " +
      "the implementation, not through the proxy. State set in constructors is invisible to proxies.",
    recommendation:
      "Replace constructor with an `initialize()` function guarded by the `initializer` modifier. " +
      "Use `constructor() { _disableInitializers(); }` to lock the implementation.",
  },
  {
    id: "PROXY-003",
    name: "Missing _disableInitializers in Constructor",
    severity: "high",
    patterns: [
      // constructor that does NOT call _disableInitializers()
      /constructor\s*\(\s*\)\s*\{(?:(?!_disableInitializers)[\s\S])*?\}/,
    ],
    description:
      "Upgradeable implementation contracts should call `_disableInitializers()` in their " +
      "constructor to prevent the implementation itself from being initialized directly.",
    recommendation:
      "Add `constructor() { _disableInitializers(); }` to the implementation contract. " +
      "This is the recommended pattern since OpenZeppelin v4.6+.",
  },
  {
    id: "PROXY-004",
    name: "Selfdestruct in Upgradeable Implementation",
    severity: "critical",
    patterns: [/selfdestruct\s*\(/, /suicide\s*\(/],
    description:
      "selfdestruct in an upgradeable implementation can destroy the implementation contract, " +
      "bricking all proxies that delegate to it. Post-Dencun, selfdestruct only sends ETH " +
      "without destroying code, but remains dangerous in pre-Dencun contexts.",
    recommendation:
      "Remove selfdestruct entirely from upgradeable contracts. Use a withdrawal pattern " +
      "for ETH recovery. If emergency kill is needed, use a paused state instead.",
  },
  {
    id: "PROXY-005",
    name: "Unprotected upgradeTo Function",
    severity: "critical",
    patterns: [
      // upgradeTo or upgradeToAndCall without access control modifiers
      /function\s+upgradeTo\s*\([^)]*\)\s+(?:public|external)(?!\s*(?:onlyOwner|onlyRole|onlyAdmin|onlyProxy))/,
      /function\s+upgradeToAndCall\s*\([^)]*\)\s+(?:public|external)(?!\s*(?:onlyOwner|onlyRole|onlyAdmin|onlyProxy))/,
    ],
    description:
      "The upgrade function lacks access control, allowing any address to upgrade the proxy " +
      "to a malicious implementation. This gives an attacker full control over the contract.",
    recommendation:
      "In UUPS proxies, override `_authorizeUpgrade()` with `onlyOwner` or role-based access control. " +
      "For Transparent proxies, ensure only the ProxyAdmin can call upgrade functions.",
  },
  {
    id: "PROXY-006",
    name: "Missing Storage Gap",
    severity: "medium",
    patterns: [
      // Heuristic: contract is Initializable/upgradeable but has no __gap declaration
      // This pattern checks for ABSENCE — handled specially in analysis logic
      /contract\s+\w+\s+is\s+[^{]*(?:Initializable|UUPSUpgradeable|OwnableUpgradeable)/,
    ],
    description:
      "Upgradeable base contracts should reserve storage slots using `uint256[N] __gap` to allow " +
      "adding new state variables in future versions without shifting storage layout.",
    recommendation:
      "Add `uint256[50] private __gap;` at the end of each upgradeable base contract. " +
      "Reduce the gap size as you add new variables.",
  },
  {
    id: "PROXY-007",
    name: "Immutable Variable in Upgradeable Contract",
    severity: "medium",
    patterns: [
      // immutable keyword in a contract with upgrade-related inheritance
      /\bimmutable\b/,
    ],
    description:
      "Immutable variables are set in the constructor and stored in the bytecode, not in storage. " +
      "In upgradeable contracts, immutables on the implementation are not accessible through the proxy.",
    recommendation:
      "Replace immutable variables with regular state variables set in the initializer. " +
      "If the value truly never changes, use a constant or a storage variable with no setter.",
  },
  {
    id: "PROXY-008",
    name: "Direct Storage Slot Access Without ERC-1967",
    severity: "high",
    patterns: [
      // sload/sstore with hardcoded or non-ERC-1967 slots
      /assembly\s*\{[^}]*sload\s*\(\s*0x[0-9a-fA-F]+\s*\)/,
      /assembly\s*\{[^}]*sstore\s*\(\s*0x[0-9a-fA-F]+\s*\)/,
      // StorageSlot pattern with arbitrary bytes32 constant (not ERC-1967 standard slots)
      /bytes32\s+(?:private|internal)?\s*constant\s+\w*[Ss]lot\w*\s*=\s*0x(?!360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc|b53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103|a3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50)/,
    ],
    description:
      "Using hardcoded storage slots for proxy admin/implementation addresses instead of " +
      "ERC-1967 standard slots creates collision risks and breaks tooling compatibility.",
    recommendation:
      "Use ERC-1967 standard storage slots: implementation at " +
      "`0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc`, " +
      "admin at `0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103`. " +
      "Use OpenZeppelin's ERC1967Utils or StorageSlot libraries.",
  },
];

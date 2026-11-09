interface GuideMetadata {
  id: string;
  title: string;
  description: string;
  /** Path relative to the package root. */
  file: string;
}

export type GuideEntry =
  (GuideMetadata & { kind: "guide"; trigger: string }) | (GuideMetadata & { kind: "reference" });

export const GUIDES = [
  {
    id: "code-review",
    title: "Solidity Code Review & Security Guide",
    description:
      "Security thinking framework (CEI, least privilege, defense in depth), review methodology, severity classification, key inspection areas, secure patterns, improvement proposals, and reporting format.",
    file: "guides/code-review.md",
    kind: "guide",
    trigger: "Security audits, code reviews, and secure contract implementation",
  },
  {
    id: "adversarial-analysis",
    title: "Solidity Adversarial Scenario Analysis",
    description:
      "Attacker-perspective threat modeling: flash loans, oracle manipulation, MEV, governance, reentrancy, access control bypass, economic exploits, and cross-contract risks.",
    file: "guides/adversarial-analysis.md",
    kind: "guide",
    trigger: "Threat modeling, attack scenarios, and red-team reviews",
  },
  {
    id: "gas-optimization",
    title: "Solidity Gas Optimization",
    description:
      "Measure-first optimization workflow and candidates for storage, arithmetic, calldata, loops, events, data structures, batching, and deployment size.",
    file: "guides/gas-optimization.md",
    kind: "guide",
    trigger: "Gas or storage optimization and contract-size limits",
  },
  {
    id: "erc-standards",
    title: "ERC Token Standard Guidelines",
    description:
      "ERC20, ERC721, ERC1155, and ERC4626 implementation rules, common pitfalls, OpenZeppelin vs Solady, and testing strategies.",
    file: "guides/erc-standards.md",
    kind: "guide",
    trigger: "Implementing or reviewing ERC20, ERC721, ERC1155, or ERC4626 contracts",
  },
  {
    id: "foundry",
    title: "Foundry Development Guide",
    description:
      "forge/cast/anvil workflow: project setup, fuzz/invariant/fork testing, cheatcodes, deployment scripts, debugging, and configuration profiles.",
    file: "guides/foundry.md",
    kind: "guide",
    trigger: "Foundry setup, forge/cast/anvil, fuzz/invariant/fork tests, and forge scripts",
  },
  {
    id: "hardhat",
    title: "Hardhat 3 Development Guide",
    description:
      "Hardhat 3 ESM-first setup, defineConfig, Solidity and TypeScript tests, Ignition deployment, multichain support, and v2 migration.",
    file: "guides/hardhat.md",
    kind: "guide",
    trigger: "Hardhat 3 projects, tests, and Ignition deployments",
  },
  {
    id: "glamsterdam",
    title: "Glamsterdam (Amsterdam + Gloas) Audit Guide",
    description:
      "Ethereum L1 Glamsterdam hardfork impact on contracts: state gas and reservoir (EIP-8037), state access repricing, intrinsic gas split, larger code size limit, calldata floor, access list surcharge, ETH transfer logs, and a review checklist.",
    file: "guides/glamsterdam.md",
    kind: "guide",
    trigger:
      "Ethereum L1 Glamsterdam hardfork impact, including gas repricing and code-size changes",
  },
  {
    id: "audit-checklist",
    title: "Smart Contract Audit Checklist",
    description: "Item-by-item audit checklist referenced by the code-review guide.",
    file: "guides/references/audit-checklist.md",
    kind: "reference",
  },
  {
    id: "owasp-scwe-top10",
    title: "OWASP Smart Contract Top 10 Summary",
    description: "Condensed OWASP Smart Contract Top 10 with mapped SCWE IDs.",
    file: "guides/references/owasp-scwe-top10.md",
    kind: "reference",
  },
  {
    id: "solidity-style-guide",
    title: "Solidity Style Guide Reference",
    description: "Naming, ordering, and layout conventions from the official Solidity style guide.",
    file: "guides/references/solidity-style-guide.md",
    kind: "reference",
  },
  {
    id: "erc-interfaces",
    title: "ERC Standard Interfaces",
    description: "Interface definitions for ERC20, ERC721, ERC1155, and ERC4626.",
    file: "guides/references/erc-interfaces.md",
    kind: "reference",
  },
  {
    id: "foundry-cheatsheet",
    title: "Foundry Cheatsheet",
    description: "Command reference and code patterns for forge, cast, and anvil.",
    file: "guides/references/foundry-cheatsheet.md",
    kind: "reference",
  },
  {
    id: "hardhat-cheatsheet",
    title: "Hardhat 3 Cheatsheet",
    description: "Hardhat 3 configuration, test, and Ignition examples.",
    file: "guides/references/hardhat-cheatsheet.md",
    kind: "reference",
  },
] as const satisfies readonly GuideEntry[];

export type GuideId = (typeof GUIDES)[number]["id"];

export const GUIDE_IDS = GUIDES.map((g) => g.id) as [GuideId, ...GuideId[]];

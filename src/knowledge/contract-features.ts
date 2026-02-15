import type { AdversarialCategory } from "./adversarial-scenarios.js";

export interface ContractFeaturePattern {
  category: AdversarialCategory;
  name: string;
  patterns: RegExp[];
  description: string;
}

export const CONTRACT_FEATURE_PATTERNS: ContractFeaturePattern[] = [
  {
    category: "reentrancy",
    name: "External Value Transfers",
    patterns: [
      /\.call\s*\{[^}]*value/,
      /\.transfer\s*\(/,
      /\.send\s*\(/,
      /\.call\s*\{[^}]*\}\s*\(/,
      /\.call\.value\s*\(/,
    ],
    description: "Low-level calls and ETH transfers that may enable reentrancy.",
  },
  {
    category: "flash-loan",
    name: "Flash Loan Interfaces",
    patterns: [
      /IFlashLoanReceiver/,
      /flashLoan\s*\(/,
      /IERC3156/,
      /onFlashLoan\s*\(/,
      /IFlashBorrower/,
      /executeOperation\s*\(/,
    ],
    description: "Flash loan receiver interfaces and callback functions.",
  },
  {
    category: "oracle-manipulation",
    name: "Price Feed Usage",
    patterns: [
      /AggregatorV3Interface/,
      /latestRoundData\s*\(/,
      /getPrice\s*\(/,
      /priceFeed/,
      /getUnderlyingPrice\s*\(/,
      /latestAnswer\s*\(/,
    ],
    description: "Chainlink and custom price oracle integrations.",
  },
  {
    category: "mev-frontrunning",
    name: "DEX Swap Operations",
    patterns: [
      /swap\s*\(/,
      /amountOutMin/,
      /deadline/,
      /slippage/,
      /swapExactTokensFor/,
      /IUniswapV2Router/,
      /ISwapRouter/,
    ],
    description: "AMM swap calls with slippage and deadline parameters.",
  },
  {
    category: "governance",
    name: "Governance Mechanisms",
    patterns: [
      /propose\s*\(/,
      /castVote\s*\(/,
      /execute\s*\(/,
      /GovernorBravo/,
      /timelock/i,
      /queue\s*\(/,
      /vote\s*\(/,
    ],
    description: "On-chain governance proposal, voting, and execution functions.",
  },
  {
    category: "access-control",
    name: "Access Control and Proxy Patterns",
    patterns: [
      /initializ\w*\s*\(/,
      /onlyOwner/,
      /_transferOwnership\s*\(/,
      /upgradeTo\s*\(/,
      /upgradeToAndCall\s*\(/,
      /proxiableUUID\s*\(/,
      /onlyRole/,
    ],
    description: "Initializer functions, ownership, and proxy upgrade patterns.",
  },
  {
    category: "economic-logic",
    name: "Token Economics and Reward Calculations",
    patterns: [
      /rewardPerToken/,
      /mint\s*\(/,
      /burn\s*\(/,
      /totalSupply\s*[*/]/,
      /\.balanceOf\s*\([^)]*\)\s*[*/]/,
      /shares?\s*[*/=]/,
    ],
    description: "Reward distribution, minting, burning, and share calculations.",
  },
  {
    category: "cross-contract",
    name: "External Token Interactions",
    patterns: [
      /IERC20\s*\(/,
      /safeTransfer\s*\(/,
      /safeTransferFrom\s*\(/,
      /onERC721Received\s*\(/,
      /onERC1155Received\s*\(/,
      /tokensReceived\s*\(/,
    ],
    description: "External token calls and callback hooks for cross-contract interactions.",
  },
];

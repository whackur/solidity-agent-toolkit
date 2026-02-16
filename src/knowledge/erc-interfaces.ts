export interface ERCFunctionSignature {
  name: string;
  inputs: string[];
  outputs: string[];
  mutability: "view" | "pure" | "nonpayable" | "payable";
}

export interface ERCEventSignature {
  name: string;
  inputs: { type: string; indexed: boolean }[];
}

export interface ERCStandardSpec {
  title: string;
  description: string;
  interface: string;
  functions: ERCFunctionSignature[];
  events: ERCEventSignature[];
}

export const ERC_STANDARDS: Record<string, ERCStandardSpec> = {
  ERC20: {
    title: "ERC-20 Token Standard",
    description:
      "A standard interface for fungible tokens, providing basic functionality to transfer tokens, as well as allow tokens to be approved so they can be spent by another on-chain third party.",
    interface: `interface IERC20 {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256);
    function balanceOf(address account) external view returns (uint256);
    function transfer(address to, uint256 amount) external returns (bool);
    function allowance(address owner, address spender) external view returns (uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
}`,
    functions: [
      { name: "totalSupply", inputs: [], outputs: ["uint256"], mutability: "view" },
      { name: "balanceOf", inputs: ["address"], outputs: ["uint256"], mutability: "view" },
      {
        name: "transfer",
        inputs: ["address", "uint256"],
        outputs: ["bool"],
        mutability: "nonpayable",
      },
      {
        name: "allowance",
        inputs: ["address", "address"],
        outputs: ["uint256"],
        mutability: "view",
      },
      {
        name: "approve",
        inputs: ["address", "uint256"],
        outputs: ["bool"],
        mutability: "nonpayable",
      },
      {
        name: "transferFrom",
        inputs: ["address", "address", "uint256"],
        outputs: ["bool"],
        mutability: "nonpayable",
      },
    ],
    events: [
      {
        name: "Transfer",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "uint256", indexed: false },
        ],
      },
      {
        name: "Approval",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "uint256", indexed: false },
        ],
      },
    ],
  },
  ERC721: {
    title: "ERC-721 Non-Fungible Token Standard",
    description: "A standard interface for non-fungible tokens, also known as deeds.",
    interface: `interface IERC721 {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    function balanceOf(address owner) external view returns (uint256 balance);
    function ownerOf(uint256 tokenId) external view returns (address owner);
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external;
    function safeTransferFrom(address from, address to, uint256 tokenId) external;
    function transferFrom(address from, address to, uint256 tokenId) external;
    function approve(address to, uint256 tokenId) external;
    function setApprovalForAll(address operator, bool _approved) external;
    function getApproved(uint256 tokenId) external view returns (address operator);
    function isApprovedForAll(address owner, address operator) external view returns (bool);
}`,
    functions: [
      { name: "balanceOf", inputs: ["address"], outputs: ["uint256"], mutability: "view" },
      { name: "ownerOf", inputs: ["uint256"], outputs: ["address"], mutability: "view" },
      {
        name: "safeTransferFrom",
        inputs: ["address", "address", "uint256", "bytes"],
        outputs: [],
        mutability: "nonpayable",
      },
      {
        name: "safeTransferFrom",
        inputs: ["address", "address", "uint256"],
        outputs: [],
        mutability: "nonpayable",
      },
      {
        name: "transferFrom",
        inputs: ["address", "address", "uint256"],
        outputs: [],
        mutability: "nonpayable",
      },
      { name: "approve", inputs: ["address", "uint256"], outputs: [], mutability: "nonpayable" },
      {
        name: "setApprovalForAll",
        inputs: ["address", "bool"],
        outputs: [],
        mutability: "nonpayable",
      },
      { name: "getApproved", inputs: ["uint256"], outputs: ["address"], mutability: "view" },
      {
        name: "isApprovedForAll",
        inputs: ["address", "address"],
        outputs: ["bool"],
        mutability: "view",
      },
    ],
    events: [
      {
        name: "Transfer",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "uint256", indexed: true },
        ],
      },
      {
        name: "Approval",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "uint256", indexed: true },
        ],
      },
      {
        name: "ApprovalForAll",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "bool", indexed: false },
        ],
      },
    ],
  },
  ERC1155: {
    title: "ERC-1155 Multi-Token Standard",
    description:
      "A standard interface for contracts that manage multiple token types. A single deployed contract may include any combination of fungible tokens, non-fungible tokens or other configurations.",
    interface: `interface IERC1155 {
    event TransferSingle(address indexed operator, address indexed from, address indexed to, uint256 id, uint256 value);
    event TransferBatch(address indexed operator, address indexed from, address indexed to, uint256[] ids, uint256[] values);
    event ApprovalForAll(address indexed account, address indexed operator, bool approved);
    event URI(string value, uint256 indexed id);
    function balanceOf(address account, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory);
    function setApprovalForAll(address operator, bool approved) external;
    function isApprovedForAll(address account, address operator) external view returns (bool);
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external;
}`,
    functions: [
      {
        name: "balanceOf",
        inputs: ["address", "uint256"],
        outputs: ["uint256"],
        mutability: "view",
      },
      {
        name: "balanceOfBatch",
        inputs: ["address[]", "uint256[]"],
        outputs: ["uint256[]"],
        mutability: "view",
      },
      {
        name: "setApprovalForAll",
        inputs: ["address", "bool"],
        outputs: [],
        mutability: "nonpayable",
      },
      {
        name: "isApprovedForAll",
        inputs: ["address", "address"],
        outputs: ["bool"],
        mutability: "view",
      },
      {
        name: "safeTransferFrom",
        inputs: ["address", "address", "uint256", "uint256", "bytes"],
        outputs: [],
        mutability: "nonpayable",
      },
      {
        name: "safeBatchTransferFrom",
        inputs: ["address", "address", "uint256[]", "uint256[]", "bytes"],
        outputs: [],
        mutability: "nonpayable",
      },
    ],
    events: [
      {
        name: "TransferSingle",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "uint256", indexed: false },
          { type: "uint256", indexed: false },
        ],
      },
      {
        name: "TransferBatch",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "uint256[]", indexed: false },
          { type: "uint256[]", indexed: false },
        ],
      },
      {
        name: "ApprovalForAll",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "bool", indexed: false },
        ],
      },
      {
        name: "URI",
        inputs: [
          { type: "string", indexed: false },
          { type: "uint256", indexed: true },
        ],
      },
    ],
  },
  ERC4626: {
    title: "ERC-4626 Tokenized Vault Standard",
    description: "A standard for tokenized yield-bearing vaults.",
    interface: `interface IERC4626 is IERC20 {
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    function asset() external view returns (address assetTokenAddress);
    function totalAssets() external view returns (uint256 totalManagedAssets);
    function convertToShares(uint256 assets) external view returns (uint256 shares);
    function convertToAssets(uint256 shares) external view returns (uint256 assets);
    function maxDeposit(address receiver) external view returns (uint256 maxAssets);
    function previewDeposit(uint256 assets) external view returns (uint256 shares);
    function deposit(uint256 assets, address receiver) external returns (uint256 shares);
    function maxMint(address receiver) external view returns (uint256 maxShares);
    function previewMint(uint256 shares) external view returns (uint256 assets);
    function mint(uint256 shares, address receiver) external returns (uint256 assets);
    function maxWithdraw(address owner) external view returns (uint256 maxAssets);
    function previewWithdraw(uint256 assets) external view returns (uint256 shares);
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256 shares);
    function maxRedeem(address owner) external view returns (uint256 maxShares);
    function previewRedeem(uint256 shares) external view returns (uint256 assets);
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256 assets);
}`,
    functions: [
      { name: "asset", inputs: [], outputs: ["address"], mutability: "view" },
      { name: "totalAssets", inputs: [], outputs: ["uint256"], mutability: "view" },
      {
        name: "convertToShares",
        inputs: ["uint256"],
        outputs: ["uint256"],
        mutability: "view",
      },
      {
        name: "convertToAssets",
        inputs: ["uint256"],
        outputs: ["uint256"],
        mutability: "view",
      },
      { name: "maxDeposit", inputs: ["address"], outputs: ["uint256"], mutability: "view" },
      { name: "previewDeposit", inputs: ["uint256"], outputs: ["uint256"], mutability: "view" },
      {
        name: "deposit",
        inputs: ["uint256", "address"],
        outputs: ["uint256"],
        mutability: "nonpayable",
      },
      { name: "maxMint", inputs: ["address"], outputs: ["uint256"], mutability: "view" },
      { name: "previewMint", inputs: ["uint256"], outputs: ["uint256"], mutability: "view" },
      {
        name: "mint",
        inputs: ["uint256", "address"],
        outputs: ["uint256"],
        mutability: "nonpayable",
      },
      { name: "maxWithdraw", inputs: ["address"], outputs: ["uint256"], mutability: "view" },
      { name: "previewWithdraw", inputs: ["uint256"], outputs: ["uint256"], mutability: "view" },
      {
        name: "withdraw",
        inputs: ["uint256", "address", "address"],
        outputs: ["uint256"],
        mutability: "nonpayable",
      },
      { name: "maxRedeem", inputs: ["address"], outputs: ["uint256"], mutability: "view" },
      { name: "previewRedeem", inputs: ["uint256"], outputs: ["uint256"], mutability: "view" },
      {
        name: "redeem",
        inputs: ["uint256", "address", "address"],
        outputs: ["uint256"],
        mutability: "nonpayable",
      },
    ],
    events: [
      {
        name: "Deposit",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "uint256", indexed: false },
          { type: "uint256", indexed: false },
        ],
      },
      {
        name: "Withdraw",
        inputs: [
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "address", indexed: true },
          { type: "uint256", indexed: false },
          { type: "uint256", indexed: false },
        ],
      },
    ],
  },
};

export function getERCStandard(standard: string): string {
  const data = ERC_STANDARDS[standard.toUpperCase()];
  if (!data) {
    throw new Error(`Unsupported ERC standard: ${standard}`);
  }
  return `# ${data.title}\n\n${data.description}\n\n## Interface\n\n\`\`\`solidity\n${data.interface}\n\`\`\`\n`;
}

export function getSupportedERCStandards(): { id: string; title: string; description: string }[] {
  return Object.entries(ERC_STANDARDS).map(([id, spec]) => ({
    id,
    title: spec.title,
    description: spec.description,
  }));
}

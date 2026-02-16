import { describe, it, expect, beforeEach } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerContractAnalysisTools } from "../../mcp/tools/contract-analysis.js";

const FULL_ERC20 = `
pragma solidity ^0.8.0;
contract Token {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256) { return 0; }
    function balanceOf(address) external view returns (uint256) { return 0; }
    function transfer(address to, uint256 amount) external returns (bool) { return true; }
    function allowance(address, address) external view returns (uint256) { return 0; }
    function approve(address spender, uint256 amount) external returns (bool) { return true; }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) { return true; }
}`;

const ERC20_MISSING_APPROVE = `
pragma solidity ^0.8.0;
contract Token {
    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    function totalSupply() external view returns (uint256) { return 0; }
    function balanceOf(address) external view returns (uint256) { return 0; }
    function transfer(address to, uint256 amount) external returns (bool) { return true; }
    function allowance(address, address) external view returns (uint256) { return 0; }
    function transferFrom(address from, address to, uint256 amount) external returns (bool) { return true; }
}`;

const NON_TOKEN_CONTRACT = `
pragma solidity ^0.8.0;
contract SimpleStorage {
    uint256 private storedData;
    function set(uint256 x) public { storedData = x; }
    function get() public view returns (uint256) { return storedData; }
}`;

const FULL_ERC721 = `
pragma solidity ^0.8.0;
contract NFT {
    event Transfer(address indexed from, address indexed to, uint256 indexed tokenId);
    event Approval(address indexed owner, address indexed approved, uint256 indexed tokenId);
    event ApprovalForAll(address indexed owner, address indexed operator, bool approved);
    function balanceOf(address owner) external view returns (uint256) { return 0; }
    function ownerOf(uint256 tokenId) external view returns (address) { return address(0); }
    function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data) external {}
    function safeTransferFrom(address from, address to, uint256 tokenId) external {}
    function transferFrom(address from, address to, uint256 tokenId) external {}
    function approve(address to, uint256 tokenId) external {}
    function setApprovalForAll(address operator, bool _approved) external {}
    function getApproved(uint256 tokenId) external view returns (address) { return address(0); }
    function isApprovedForAll(address owner, address operator) external view returns (bool) { return false; }
}`;

const FULL_ERC4626 = `
pragma solidity ^0.8.0;
contract Vault {
    event Deposit(address indexed sender, address indexed owner, uint256 assets, uint256 shares);
    event Withdraw(address indexed sender, address indexed receiver, address indexed owner, uint256 assets, uint256 shares);
    function asset() external view returns (address) { return address(0); }
    function totalAssets() external view returns (uint256) { return 0; }
    function convertToShares(uint256 assets) external view returns (uint256) { return 0; }
    function convertToAssets(uint256 shares) external view returns (uint256) { return 0; }
    function maxDeposit(address) external view returns (uint256) { return 0; }
    function previewDeposit(uint256) external view returns (uint256) { return 0; }
    function deposit(uint256 assets, address receiver) external returns (uint256) { return 0; }
    function maxMint(address) external view returns (uint256) { return 0; }
    function previewMint(uint256) external view returns (uint256) { return 0; }
    function mint(uint256 shares, address receiver) external returns (uint256) { return 0; }
    function maxWithdraw(address) external view returns (uint256) { return 0; }
    function previewWithdraw(uint256) external view returns (uint256) { return 0; }
    function withdraw(uint256 assets, address receiver, address owner) external returns (uint256) { return 0; }
    function maxRedeem(address) external view returns (uint256) { return 0; }
    function previewRedeem(uint256) external view returns (uint256) { return 0; }
    function redeem(uint256 shares, address receiver, address owner) external returns (uint256) { return 0; }
}`;

describe("ERC Compliance Tools", () => {
  let server: McpServer;

  beforeEach(() => {
    server = new McpServer({ name: "test-server", version: "1.0.0" });
    registerContractAnalysisTools(server);
  });

  it("registers check_erc_compliance tool", () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    expect(tool).toBeDefined();
    expect(tool.description).toContain("ERC");
  });

  it("full ERC20 contract returns compliant", async () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    const result = await tool.handler({
      analysis: "erc_compliance",
      code: FULL_ERC20,
      standard: "ERC20",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("COMPLIANT ✓");
    expect(result.content[0].text).not.toContain("MISSING");
  });

  it("ERC20 contract missing approve returns non-compliant", async () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    const result = await tool.handler({
      analysis: "erc_compliance",
      code: ERC20_MISSING_APPROVE,
      standard: "ERC20",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("NON-COMPLIANT ✗");
    expect(result.content[0].text).toContain("approve");
    expect(result.content[0].text).toContain("MISSING");
  });

  it("non-token contract returns all missing", async () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    const result = await tool.handler({
      analysis: "erc_compliance",
      code: NON_TOKEN_CONTRACT,
      standard: "ERC20",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("NON-COMPLIANT ✗");
    expect(result.content[0].text).toContain("totalSupply");
    expect(result.content[0].text).toContain("0/6");
  });

  it("unknown standard returns error", async () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    const result = await tool.handler({
      analysis: "erc_compliance",
      code: FULL_ERC20,
      standard: "ERC999",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("Unsupported");
    expect(result.content[0].text).toContain("ERC999");
  });

  it("case insensitive standard", async () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    const result = await tool.handler({
      analysis: "erc_compliance",
      code: FULL_ERC20,
      standard: "erc20",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("COMPLIANT ✓");
  });

  it("empty code returns all missing", async () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    const result = await tool.handler({ analysis: "erc_compliance", code: "", standard: "ERC20" });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("NON-COMPLIANT ✗");
    expect(result.content[0].text).toContain("0/6");
    expect(result.content[0].text).toContain("0/2");
  });

  it("ERC721 compliance check", async () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    const result = await tool.handler({
      analysis: "erc_compliance",
      code: FULL_ERC721,
      standard: "ERC721",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("COMPLIANT ✓");
    expect(result.content[0].text).not.toContain("MISSING");
  });

  it("ERC4626 compliance check", async () => {
    // @ts-expect-error — accessing private for testing
    const tool = server._registeredTools["analyze_contract"];
    const result = await tool.handler({
      analysis: "erc_compliance",
      code: FULL_ERC4626,
      standard: "ERC4626",
    });

    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain("COMPLIANT ✓");
    expect(result.content[0].text).not.toContain("MISSING");
  });
});

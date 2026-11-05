# ERC Token Standard Guidelines

## When to Apply

- Implementing a new token (Fungible, NFT, Multi-token, or Vault).
- Reviewing existing token implementations for standard compliance.
- Integrating with external tokens (e.g., DeFi protocols, marketplaces).
- Extending standards with custom logic (e.g., Permit, Votes, Enumerable).

## ERC20: Fungible Tokens

- **Required**: `totalSupply`, `balanceOf`, `transfer`, `allowance`, `approve`, `transferFrom`.
- **SafeERC20**: ALWAYS wrap external ERC20 calls (`transfer`, `transferFrom`, `approve`) using OpenZeppelin's `SafeERC20` to handle tokens that return `false` instead of reverting.
- **Race Condition**: The `approve` function has a known race condition. Use `increaseAllowance` and `decreaseAllowance` (OpenZeppelin) or `ERC20Permit` to mitigate.
- **ERC20Permit (EIP-2612)**: Use for gasless approvals via signatures (`permit` function).
- **ERC20Votes**: Use for governance tokens to enable delegation and checkpointing.
- **Common Pitfall**: Some tokens (like USDT) do not return a boolean on `transfer`, causing calls to revert if the interface expects a return value.

## ERC721: Non-Fungible Tokens

- **Required**: `balanceOf`, `ownerOf`, `safeTransferFrom`, `transferFrom`, `approve`, `setApprovalForAll`, `getApproved`, `isApprovedForAll`.
- **safeTransferFrom**: Always prefer `safeTransferFrom` over `transferFrom` to ensure the recipient can handle NFTs (via `onERC721Received`).
- **ERC721Enumerable**: Provides on-chain tracking of all tokens. High gas cost for transfers; avoid unless necessary for on-chain discovery.
- **Metadata**: Use `tokenURI` to link to JSON metadata. Off-chain (IPFS/Arweave) is standard; on-chain (Base64) is used for "fully on-chain" NFTs.
- **Common Pitfall**: Reentrancy via `onERC721Received` callback during `safeTransferFrom`. Use `nonReentrant` or follow Checks-Effects-Interactions (SCWE-046, SCWE-138).

## ERC1155: Multi-Token

- **When to use**: When managing multiple token types (fungible and non-fungible) in a single contract. More gas-efficient for batch operations.
- **Batch Operations**: Use `safeBatchTransferFrom` and `balanceOfBatch` to reduce gas for multiple transfers.
- **URI Pattern**: Use a single URI with the `{id}` substitution string (e.g., `https://api.com/{id}.json`).
- **Common Pitfall**: Forgetting to implement `balanceOfBatch` or incorrect implementation of the receiver callback.

## ERC4626: Tokenized Vault

- **Calculations**: `convertToShares` (assets to shares) and `convertToAssets` (shares to assets).
- **Rounding**: Favor the vault. Round DOWN on `deposit`/`mint` (fewer shares for assets) and round UP on `withdraw`/`redeem` (more shares for assets).
- **Inflation Attack**: First depositor can manipulate share price. Prevent by minting "dead shares" to `address(0)` on the first deposit (SCWE-049).
- **Common Pitfall**: Incorrect rounding direction leading to "free" shares or assets over time.

## Implementation Choice

|             | OpenZeppelin   | Solady                    |
| ----------- | -------------- | ------------------------- |
| Gas         | Higher         | Lower                     |
| Readability | More readable  | More optimized            |
| Extensions  | Many available | Fewer but efficient       |
| When to use | Most projects  | Gas-critical applications |

## Testing Strategies

- **ERC20**: Test `transfer` (balance changes), `approve`/`transferFrom` (allowance logic), and edge cases (0 amount, `type(uint256).max`).
- **ERC721**: Test `mint`, `transfer`, `approval`, and `ERC721Enumerable` (if used). Verify `onERC721Received` triggers.
- **ERC1155**: Test batch transfers, URI substitution, and receiver callbacks.
- **ERC4626**: Test deposit/withdraw symmetry (1:1 if no yield), share calculations, and rounding edge cases.

## Related MCP Capabilities

**Interface Lookup:**

- `erc://{standard}`: Full interface definition, required functions, events, and extension list for ERC20, ERC721, ERC1155, ERC4626

**Implementation Verification:**

- `analyze_contract` with `analysis: "erc_compliance"`: Check required functions and events against the standard
- `run_security_scan` with `tool: "patterns"`: Detect missing SafeERC20, approval race conditions, reentrancy in callbacks
- `lookup_knowledge` with `query`: Look up SCWE entries related to token standards (e.g., "ERC20", "reentrancy") and their remediation

**Code Generation:**

- Use the `generate_erc` prompt for scaffolding compliant token implementations

## References

- `erc-interfaces` — ERC Standard Interfaces (load with `lookup_knowledge` `guide: "erc-interfaces"`)

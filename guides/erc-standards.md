# ERC Token Standard Guidelines

## When to Apply

- Implementing a new fungible token, NFT, multi-token contract, or tokenized vault.
- Reviewing standard compliance or integrating with external token contracts.
- Extending a token with features such as Permit, Votes, Enumerable, or custom callbacks.

## ERC20: Fungible Tokens

- **Core interface**: `totalSupply`, `balanceOf`, `transfer`, `allowance`, `approve`, and `transferFrom`.
- **External token calls**: Use a `SafeERC20` API supported by the project's installed OpenZeppelin version for calls to arbitrary ERC-20 tokens. It handles tokens that return `false` or no return data, subject to the library's documented behavior.
- **Allowance changes**: Replacing a nonzero allowance can race with spending of the old allowance. Where available and appropriate, use `safeIncreaseAllowance` for additive changes or a zero-first update when replacing an allowance. Check the installed SafeERC20 version before using helpers such as `forceApprove`; zero-reset handling is not itself a universal race fix. Permit signatures do not remove every allowance race, so account for nonce, deadline, spender, and execution-order behavior.
- **ERC20Permit (EIP-2612)**: Supports signature-based approvals; treat the signature and allowance as an authorization surface with replay and deadline checks.
- **ERC20Votes**: Adds delegation and vote checkpointing when governance needs historical voting power.

## ERC721: Non-Fungible Tokens

- **Core interface**: `balanceOf`, `ownerOf`, `safeTransferFrom`, `transferFrom`, `approve`, `setApprovalForAll`, `getApproved`, and `isApprovedForAll`.
- **Safe transfers**: Use `safeTransferFrom` when receiver-contract checks are required. The callback can execute arbitrary code; apply Checks-Effects-Interactions and review reentrancy across related functions (SCWE-046, SCWE-138).
- **ERC721Enumerable**: Adds on-chain enumeration with transfer and storage costs; include it only when on-chain discovery is required.
- **Metadata**: `tokenURI` can point to off-chain metadata (for example, content-addressed storage) or return on-chain data.

## ERC1155: Multi-Token

- **Use case**: Manage multiple token types in one contract, with batch methods when users need to transfer several entries together.
- **Batch operations**: Test `safeBatchTransferFrom` and `balanceOfBatch`, including mismatched lengths, authorization, callbacks, and bounded batch sizes.
- **URI pattern**: If using the `{id}` substitution convention, document how the token ID is encoded and how clients resolve the URI.
- **Receiver callbacks**: Verify ERC1155 receiver behavior and consider reentrancy and atomicity when callbacks run.

## ERC4626: Tokenized Vaults

Follow the [ERC-4626 specification](https://eips.ethereum.org/EIPS/eip-4626) for the complete interface and behavior. In particular, the rounding directions are not the same for every preview method:

| Method                               | Rounding direction | Value returned                                       |
| ------------------------------------ | ------------------ | ---------------------------------------------------- |
| `convertToShares`, `convertToAssets` | Down               | Idealized conversion, independent of caller and fees |
| `previewDeposit`                     | Down               | Shares for an asset deposit                          |
| `previewMint`                        | Up                 | Assets required to mint shares                       |
| `previewWithdraw`                    | Up                 | Shares burned to withdraw assets                     |
| `previewRedeem`                      | Down               | Assets returned for redeemed shares                  |

Preview methods are not interchangeable. Test that each operation is consistent with its corresponding preview under the same conditions, including fees, limits, and boundary amounts.

First-deposit donation or inflation attacks can distort the initial share price. Use a mitigation appropriate to the vault implementation, such as virtual assets and shares with a considered decimals offset, and test first deposits, direct donations, and small deposits. Do not assume that minting dead shares to `address(0)` is universally safe; token implementations may reject zero-address mints. OpenZeppelin's [ERC4626 security guidance](https://docs.openzeppelin.com/contracts/5.x/erc4626) explains the virtual-offset approach.

## Implementation Choice

| Consideration    | OpenZeppelin                               | Solady                                                    |
| ---------------- | ------------------------------------------ | --------------------------------------------------------- |
| Typical tradeoff | Broad extensions and familiar APIs         | Gas-oriented implementations                              |
| Review focus     | Version and extension behavior             | Version, assembly, and audit coverage                     |
| Selection        | Choose for project needs and compatibility | Benchmark and review before replacing an existing library |

## Testing Strategies

- **ERC20**: Test balances, transfer and allowance behavior, token return-value variations, zero amounts, and maximum allowances.
- **ERC721**: Test ownership, approvals, safe receiver callbacks, and callback reentrancy across affected state.
- **ERC1155**: Test batch validation, authorization, receiver callbacks, and batch bounds.
- **ERC4626**: Test previews and operation rounding, fee and limit behavior, first-deposit donation scenarios, and deposit/withdraw symmetry where the vault's economics imply it.

## Related MCP Capabilities

**Interface Lookup:**

- `erc://{standard}` provides an abbreviated core-interface excerpt. Consult the standard for inherited interfaces, extensions, and full compliance requirements.

**Implementation Verification:**

- `analyze_contract` with `analysis: "erc_compliance"`: Check recognized required functions and events.
- `run_security_scan` with `tool: "patterns"`: Check supported patterns, then review token callbacks, allowance semantics, and vault math in context.
- `lookup_knowledge` with `query`: Look up SCWE entries related to token standards, callbacks, or authorization.

**Code Generation:**

- Use the `generate_erc` prompt for a starting point, then verify the result against the selected standard and dependency version.

## References

- `erc-interfaces` — abbreviated ERC interface excerpts (load with `lookup_knowledge` and `guide: "erc-interfaces"`).

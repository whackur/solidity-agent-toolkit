import { getERCStandard } from "../resources/erc-standards.js";

const ERC_GUIDANCE: Record<string, { security: string; pitfalls: string; ozPatterns: string }> = {
  ERC20: {
    security: `
- **Reentrancy**: Always use nonReentrant modifier for functions that call external contracts.
- **Approval Race Condition**: Use \`increaseAllowance\` and \`decreaseAllowance\` instead of \`approve\` to avoid the front-running attack.
- **Decimal Handling**: Ensure correct scaling when interacting with other protocols. Most tokens use 18 decimals.
- **Fee-on-transfer Tokens**: Be aware that some tokens take a fee on transfer, which can break accounting logic.`,
    pitfalls: `
- **Zero Address**: Always check that \`to\` and \`from\` addresses are not \`address(0)\`.
- **Return Values**: Some older ERC20 tokens do not return a boolean on \`transfer\`/\`transferFrom\`. Use OpenZeppelin's \`SafeERC20\`.
- **Balance Updates**: Ensure internal balances are updated before emitting the \`Transfer\` event.`,
    ozPatterns: `
- Use \`ERC20\` base contract.
- Use \`ERC20Burnable\` for burning tokens.
- Use \`ERC20Pausable\` for emergency stops.
- Use \`ERC20Permit\` for gasless approvals (EIP-2612).`,
  },
  ERC721: {
    security: `
- **Reentrancy in safeTransferFrom**: The \`onERC721Received\` callback can be used for reentrancy attacks.
- **Minting Safety**: Use \`_safeMint\` instead of \`_mint\` to ensure the recipient can handle ERC721 tokens.
- **Access Control**: Ensure only authorized users can mint or burn tokens.`,
    pitfalls: `
- **Gas Costs**: Enumeration (\`ERC721Enumerable\`) significantly increases gas costs for transfers.
- **Token ID Uniqueness**: Ensure your minting logic guarantees unique token IDs.
- **Metadata Integrity**: If using off-chain metadata, ensure the URI logic is robust and ideally immutable (e.g., IPFS).`,
    ozPatterns: `
- Use \`ERC721\` base contract.
- Use \`ERC721Enumerable\` if you need to list tokens on-chain.
- Use \`ERC721URIStorage\` for flexible metadata management.
- Use \`ERC721Royalty\` (EIP-2981) for on-chain royalties.`,
  },
  ERC1155: {
    security: `
- **Batch Reentrancy**: \`safeBatchTransferFrom\` triggers multiple callbacks, increasing reentrancy surface.
- **Balance Tracking**: Ensure batch operations correctly update all involved balances.
- **Operator Permissions**: Be careful with \`setApprovalForAll\`, as it grants full control over all token types.`,
    pitfalls: `
- **URI Handling**: ERC1155 uses a single URI for all token types, using the \`{id}\` substitution.
- **Receiver Implementation**: Recipients must implement \`IERC1155Receiver\`.
- **Supply Tracking**: ERC1155 does not track total supply by default.`,
    ozPatterns: `
- Use \`ERC1155\` base contract.
- Use \`ERC1155Supply\` for tracking total supply per ID.
- Use \`ERC1155Burnable\` for burning tokens.
- Use \`ERC1155Pausable\` for emergency stops.`,
  },
  ERC4626: {
    security: `
- **Inflation Attack**: First depositor can manipulate share price. Use "virtual shares" or "dead shares" to mitigate.
- **Rounding Errors**: Always round down for \`previewWithdraw\`/\`previewRedeem\` and round up for \`previewDeposit\`/\`previewMint\`.
- **Slippage**: Implement slippage protection for users in your implementation.`,
    pitfalls: `
- **Asset Compatibility**: Ensure the underlying asset is a standard ERC20.
- **Exchange Rate**: Be careful with volatile exchange rates between assets and shares.
- **Integration**: Ensure third-party protocols correctly handle the vault's share token.`,
    ozPatterns: `
- Use \`ERC4626\` base contract.
- Use \`SafeERC20\` for all asset transfers.
- Implement \`_convertToShares\` and \`_convertToAssets\` carefully.`,
  },
};

export function buildERCPrompt(standard: string, features?: string[]): string {
  const guidance = ERC_GUIDANCE[standard];
  if (!guidance) {
    throw new Error(`Unsupported ERC standard: ${standard}`);
  }
  const interfaceInfo = getERCStandard(standard);

  let promptText = `# Implementation Guide for ${standard}\n\n`;
  promptText += interfaceInfo + "\n";

  if (features && features.length > 0) {
    promptText += `## Requested Features\n${features.map((f) => `- ${f}`).join("\n")}\n\n`;
  }

  promptText += `## Security Considerations\n${guidance.security}\n\n`;
  promptText += `## Common Pitfalls and Best Practices\n${guidance.pitfalls}\n\n`;
  promptText += `## OpenZeppelin Recommended Patterns\n${guidance.ozPatterns}\n\n`;

  promptText += `### Instructions for the AI:\n`;
  promptText += `1. Use the provided interface and security considerations to guide the user in implementing their ${standard} contract.\n`;
  promptText += `2. DO NOT generate the full contract code unless specifically asked for a snippet.\n`;
  promptText += `3. Focus on explaining the "why" behind the patterns and security measures.\n`;

  return promptText;
}

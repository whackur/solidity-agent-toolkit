// Clients such as Claude Code inject server instructions into the agent context, which replaces
// the automatic triggering that the former Agent Skills provided.
export const SERVER_INSTRUCTIONS = `Solidity smart contract security and development toolkit.

Before substantive Solidity work, load the matching methodology guide with lookup_knowledge { guide } (or read guide://{topic}) and follow it:
- Security audit, code review, writing secure contracts → code-review
- Threat modeling, attack scenarios, red-team review → adversarial-analysis
- Gas or storage optimization, contract size limits → gas-optimization
- Implementing or reviewing ERC20/721/1155/4626 → erc-standards
- forge/cast/anvil, fuzz/invariant/fork tests, forge script → foundry
- Hardhat 3, Ignition deployment → hardhat
- Ethereum L1 Glamsterdam hardfork impact (gas repricing, state gas, code size, ETH transfer logs) → glamsterdam

Tools: run_security_scan (Slither/Aderyn/Solhint CLIs, or tool "patterns" for a no-CLI AST scan of inline code), analyze_contract (adversarial, proxy safety, ERC compliance, access control, dependencies), lookup_knowledge (guides and OWASP SCWE lookup), check_code_quality (style guide, NatSpec), run_foundry (build, inspect, test, gas, deployment simulation via Foundry).`;

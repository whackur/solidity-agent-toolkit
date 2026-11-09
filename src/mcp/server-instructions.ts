import { GUIDES } from "../knowledge/guide-catalog.js";

// Clients such as Claude Code inject server instructions into the agent context, which replaces
// the automatic triggering that the former Agent Skills provided.
const GUIDE_ROUTING = GUIDES.filter((guide) => guide.kind === "guide")
  .map((guide) => `- ${guide.trigger} → ${guide.id}`)
  .join("\n");

export const SERVER_INSTRUCTIONS = `Solidity smart contract security and development toolkit.

Before substantive Solidity work, load the matching methodology guide with lookup_knowledge { guide } (or read guide://{topic}) and follow it:
${GUIDE_ROUTING}

Tools: run_security_scan (Slither/Aderyn/Solhint CLIs, or tool "patterns" for a no-CLI AST scan of inline code), analyze_contract (adversarial, proxy safety, ERC compliance, access control, dependencies), lookup_knowledge (guides and OWASP SCWE lookup), check_code_quality (style guide, NatSpec), run_foundry (build, inspect, test, gas, deployment simulation via Foundry).`;

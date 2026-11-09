import { GUIDES } from "../knowledge/guide-catalog.js";

// Clients such as Claude Code inject server instructions into the agent context, which replaces
// the automatic triggering that the former Agent Skills provided.
const GUIDE_ROUTING = GUIDES.filter((guide) => guide.kind === "guide")
  .map((guide) => `- ${guide.trigger} → ${guide.id}`)
  .join("\n");

export const SERVER_INSTRUCTIONS = `Solidity smart contract security and development toolkit.

Before substantive Solidity work, load the matching methodology guide with lookup_knowledge { guide } (or read guide://{topic}) and follow it:
${GUIDE_ROUTING}

For Solidity repository architecture/composition or UML requests, load architecture-diagrams. Even when the user does not say "UML," local shell access means inspect the requested Solidity roots, run the standalone sol2uml-light CLI, verify its output artifact, and report the actual command and artifact path; do not substitute hand-authored SVG or Mermaid. This MCP server does not expose a tool to execute sol2uml-light. Without shell access, use analyze_contract with analysis "dependencies" only on Solidity source supplied in the conversation and provide a limited Mermaid fallback; do not recursively scan a repository. If the user explicitly requests a whole-repository map including directories or off-chain components, inspect relevant files and draw Mermaid for that broader scope, adding generated sol2uml-light UML where Solidity relationships are relevant.

Tools: run_security_scan (Slither/Aderyn/Solhint CLIs, or tool "patterns" for a no-CLI AST scan of inline code), analyze_contract (adversarial, proxy safety, ERC compliance, access control, dependencies), lookup_knowledge (guides and OWASP SCWE lookup), check_code_quality (style guide, NatSpec), run_foundry (build, inspect, test, gas, deployment simulation via Foundry).`;

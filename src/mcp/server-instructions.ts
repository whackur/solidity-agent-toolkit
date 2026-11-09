import { GUIDES } from "../knowledge/guide-catalog.js";

// Clients such as Claude Code inject server instructions into the agent context, which replaces
// the automatic triggering that the former Agent Skills provided.
const GUIDE_ROUTING = GUIDES.filter((guide) => guide.kind === "guide")
  .map((guide) => `- ${guide.trigger} → ${guide.id}`)
  .join("\n");

export const SERVER_INSTRUCTIONS = `Solidity smart contract security and development toolkit.

Before substantive Solidity work, load the matching methodology guide with lookup_knowledge { guide } (or read guide://{topic}) and follow it:
${GUIDE_ROUTING}

For Solidity repository architecture/composition or UML requests, load architecture-diagrams and call generate_diagram even when the user does not say "UML." The tool reads one local Solidity file or directory from the MCP server's filesystem, returns the SVG/PNG artifact in the tool response, and requires no client shell. The default view is overview; choose detailed for class members or storage with a contractName for offline storage layout. Set outputPath only when the user wants a persistent server-local file; an existing file is never overwritten. Report the selected view and returned or saved artifact accurately. For supplied Solidity source without an accessible local path, use analyze_contract with analysis "dependencies" as a Mermaid fallback and state its limited scope. If the user explicitly requests a whole-repository map including directories or off-chain components, inspect relevant files and draw Mermaid for that broader scope, supplementing it with generated Solidity UML where relevant.

Tools: run_security_scan (Slither/Aderyn/Solhint CLIs, or tool "patterns" for a no-CLI AST scan of inline code), analyze_contract (adversarial, proxy safety, ERC compliance, access control, dependencies), generate_diagram (Solidity class overview/detail or offline storage diagram), lookup_knowledge (guides and OWASP SCWE lookup), check_code_quality (style guide, NatSpec), run_foundry (build, inspect, test, gas, deployment simulation via Foundry).`;

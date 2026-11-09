import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTop10Resources } from "./resources/top10-resources.js";
import { registerERCResources } from "./resources/erc-standards.js";
import { registerSCWEResources } from "./resources/scwe-resources.js";
import { registerAdversarialResources } from "./resources/adversarial-resources.js";
import { registerSlitherResources } from "./resources/slither-resources.js";
import { registerSolhintResources } from "./resources/solhint-resources.js";
import { registerGuideResources } from "./resources/guide-resources.js";
import { registerSecurityScanTools } from "./tools/security-scan.js";
import { registerContractAnalysisTools } from "./tools/contract-analysis.js";
import { registerKnowledgeLookupTools } from "./tools/knowledge-lookup.js";
import { registerCodeQualityTools } from "./tools/code-quality.js";
import { registerFoundryTools } from "./tools/foundry.js";
import { registerDiagramTools } from "./tools/diagram.js";
import { registerERCPatternPrompts } from "./prompts/erc-patterns.js";
import { registerSecurityAuditPrompts } from "./prompts/security-audit.js";
import { registerCodeReviewPrompts } from "./prompts/code-review.js";
import { registerGasOptimizationPrompts } from "./prompts/gas-optimization.js";
import { registerAdversarialPrompts } from "./prompts/adversarial-analysis.js";
import { SERVER_INSTRUCTIONS } from "./server-instructions.js";
import { getCurrentVersion, notifyIfUpdateAvailable } from "../core/version-checker.js";

export function createMcpServer(): McpServer {
  const server = new McpServer(
    { name: "solidity-agent-toolkit", version: getCurrentVersion() },
    { instructions: SERVER_INSTRUCTIONS },
  );

  registerTop10Resources(server);
  registerERCResources(server);
  registerSCWEResources(server);
  registerAdversarialResources(server);
  registerSlitherResources(server);
  registerSolhintResources(server);
  registerGuideResources(server);

  registerSecurityScanTools(server);
  registerContractAnalysisTools(server);
  registerKnowledgeLookupTools(server);
  registerCodeQualityTools(server);
  registerFoundryTools(server);
  registerDiagramTools(server);

  registerERCPatternPrompts(server);
  registerSecurityAuditPrompts(server);
  registerCodeReviewPrompts(server);
  registerGasOptimizationPrompts(server);
  registerAdversarialPrompts(server);

  return server;
}

export async function startMcpServer(): Promise<void> {
  notifyIfUpdateAvailable();
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

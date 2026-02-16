import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTop10Resources } from "./resources/top10-resources.js";
import { registerERCResources } from "./resources/erc-standards.js";
import { registerSCWEResources } from "./resources/scwe-resources.js";
import { registerAdversarialResources } from "./resources/adversarial-resources.js";
import { registerSlitherResources } from "./resources/slither-resources.js";
import { registerSolhintResources } from "./resources/solhint-resources.js";
import { registerSecurityScanTools } from "./tools/security-scan.js";
import { registerCompileTools } from "./tools/compile.js";
import { registerTestRunnerTools } from "./tools/test-runner.js";
import { registerGasTools } from "./tools/gas-analysis.js";
import { registerDeployTools } from "./tools/deploy.js";
import { registerNatSpecTools } from "./tools/natspec.js";
import { registerStyleGuideTools } from "./tools/style-guide.js";
import { registerVulnerabilitySearchTools } from "./tools/vulnerability-search.js";
import { registerVulnerabilityPatternTools } from "./tools/vulnerability-patterns.js";
import { registerContractAnalysisTools } from "./tools/contract-analysis.js";
import { registerERCPatternPrompts } from "./prompts/erc-patterns.js";
import { registerSecurityAuditPrompts } from "./prompts/security-audit.js";
import { registerCodeReviewPrompts } from "./prompts/code-review.js";
import { registerGasOptimizationPrompts } from "./prompts/gas-optimization.js";
import { registerAdversarialPrompts } from "./prompts/adversarial-analysis.js";
import { notifyIfUpdateAvailable } from "../core/version-checker.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "solidity-agent-toolkit",
    version: "0.2.0",
  });

  // Resources (6 registration groups → 12 resources)
  registerTop10Resources(server);
  registerERCResources(server);
  registerSCWEResources(server);
  registerAdversarialResources(server);
  registerSlitherResources(server);
  registerSolhintResources(server);

  // Tools (10 consolidated tools)
  registerSecurityScanTools(server);
  registerCompileTools(server);
  registerTestRunnerTools(server);
  registerGasTools(server);
  registerDeployTools(server);
  registerNatSpecTools(server);
  registerStyleGuideTools(server);
  registerVulnerabilitySearchTools(server);
  registerVulnerabilityPatternTools(server);
  registerContractAnalysisTools(server);

  // Prompts (5 registration groups → 7 prompts)
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

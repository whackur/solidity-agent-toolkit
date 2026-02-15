import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTop10Resources } from "./resources/top10-resources.js";
import { registerPatternMatcherTool } from "./tools/vuln-pattern-matcher.js";
import { registerSolhintTools } from "./tools/solhint.js";
import { registerAderynTools } from "./tools/aderyn.js";
import { registerCompileTools } from "./tools/compile.js";
import { registerTestRunnerTools } from "./tools/test-runner.js";
import { registerSlitherTools } from "./tools/slither.js";
import { registerNatSpecTools } from "./tools/natspec.js";
import { registerGasAnalysisTools } from "./tools/gas-analysis.js";
import { registerDeployTools } from "./tools/deploy.js";
import { registerStyleGuideTools } from "./tools/style-guide.js";
import { registerSCWESearchTools } from "./tools/scwe-search.js";
import { registerERCPatternPrompts } from "./prompts/erc-patterns.js";
import { registerERCResources } from "./resources/erc-standards.js";
import { registerSCWEResources } from "./resources/scwe-resources.js";
import { registerSecurityAuditPrompts } from "./prompts/security-audit.js";
import { registerCodeReviewPrompts } from "./prompts/code-review.js";
import { registerGasOptimizationPrompts } from "./prompts/gas-optimization.js";
import { registerAdversarialTools } from "./tools/adversarial.js";
import { registerAdversarialPrompts } from "./prompts/adversarial-analysis.js";
import { registerAdversarialResources } from "./resources/adversarial-resources.js";

export function createMcpServer(): McpServer {
  const server = new McpServer({
    name: "solidity-agent-toolkit",
    version: "0.2.0",
  });

  registerTop10Resources(server);
  registerPatternMatcherTool(server);
  registerSolhintTools(server);
  registerAderynTools(server);
  registerCompileTools(server);
  registerTestRunnerTools(server);
  registerSlitherTools(server);
  registerNatSpecTools(server);
  registerGasAnalysisTools(server);
  registerDeployTools(server);
  registerStyleGuideTools(server);
  registerSCWESearchTools(server);
  registerERCPatternPrompts(server);
  registerERCResources(server);
  registerSCWEResources(server);
  registerSecurityAuditPrompts(server);
  registerCodeReviewPrompts(server);
  registerGasOptimizationPrompts(server);
  registerAdversarialPrompts(server);
  registerAdversarialTools(server);
  registerAdversarialResources(server);

  return server;
}

export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

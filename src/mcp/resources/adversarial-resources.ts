import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ADVERSARIAL_SCENARIOS, type AdversarialScenario } from "../../knowledge/index.js";

function formatSingleScenario(scenario: AdversarialScenario): string {
  let markdown = `# ${scenario.id}: ${scenario.name}\n\n`;
  markdown += `**Severity**: ${scenario.severity.toUpperCase()}\n`;
  markdown += `**Category**: ${scenario.category}\n`;
  markdown += `**SCWE IDs**: ${scenario.scweIds.join(", ")}\n`;
  markdown += `**OWASP 2026**: ${scenario.owasp2026}\n\n`;

  markdown += `## Description\n\n${scenario.description}\n\n`;

  markdown += `## Pre-Conditions\n\n`;
  for (const condition of scenario.preConditions) {
    markdown += `- ${condition}\n`;
  }
  markdown += "\n";

  markdown += `## Attack Steps\n\n`;
  for (let i = 0; i < scenario.attackSteps.length; i++) {
    markdown += `${i + 1}. ${scenario.attackSteps[i]}\n`;
  }
  markdown += "\n";

  markdown += `## Invariants Violated\n\n`;
  for (const invariant of scenario.invariantsViolated) {
    markdown += `- ${invariant}\n`;
  }
  markdown += "\n";

  markdown += `## Real-World Example\n\n${scenario.realWorldExample}\n`;

  return markdown;
}

function formatScenariosByCategory(category: string, scenarios: AdversarialScenario[]): string {
  let markdown = `# Adversarial Scenarios: ${category}\n\n`;
  markdown += `Found ${scenarios.length} scenario(s)\n\n`;

  for (const scenario of scenarios) {
    markdown += `## ${scenario.id}: ${scenario.name}\n\n`;
    markdown += `**Severity**: ${scenario.severity}\n`;
    markdown += `**SCWE IDs**: ${scenario.scweIds.join(", ")}\n`;
    markdown += `**OWASP 2026**: ${scenario.owasp2026}\n\n`;
    markdown += `${scenario.description}\n\n`;
    markdown += `---\n\n`;
  }

  return markdown;
}

function formatScenarioSummaryList(scenarios: AdversarialScenario[]): string {
  let markdown = `# Adversarial Attack Scenarios\n\n`;
  markdown += `Total scenarios: ${scenarios.length}\n\n`;

  const categories = new Map<string, AdversarialScenario[]>();
  for (const scenario of scenarios) {
    if (!categories.has(scenario.category)) {
      categories.set(scenario.category, []);
    }
    categories.get(scenario.category)!.push(scenario);
  }

  for (const [category, categoryScenarios] of categories) {
    markdown += `## ${category}\n\n`;
    markdown += `Scenarios: ${categoryScenarios.length}\n\n`;
    for (const scenario of categoryScenarios) {
      markdown += `- **${scenario.id}**: ${scenario.name} (${scenario.severity})\n`;
    }
    markdown += "\n";
  }

  return markdown;
}

export function registerAdversarialResources(server: McpServer): void {
  server.registerResource(
    "adversarial-list",
    "adversarial://list",
    {
      description: "List all adversarial attack scenarios grouped by category",
      mimeType: "text/markdown",
    },
    async () => {
      return {
        contents: [
          {
            uri: "adversarial://list",
            mimeType: "text/markdown",
            text: formatScenarioSummaryList(ADVERSARIAL_SCENARIOS),
          },
        ],
      };
    },
  );

  const adversarialCategoryTemplate = new ResourceTemplate("adversarial://category/{category}", {
    list: undefined,
  });

  server.registerResource(
    "adversarial-by-category",
    adversarialCategoryTemplate,
    {
      description: "Get adversarial scenarios by attack category (e.g., reentrancy, flash-loan)",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const category = Array.isArray(variables.category)
        ? variables.category[0]
        : variables.category;
      if (!category) {
        throw new Error("Missing required parameter: category");
      }

      const filtered = ADVERSARIAL_SCENARIOS.filter((s) => s.category === category);

      if (filtered.length === 0) {
        throw new Error(`No adversarial scenarios found for category: ${category}`);
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/markdown",
            text: formatScenariosByCategory(category, filtered),
          },
        ],
      };
    },
  );

  const adversarialIdTemplate = new ResourceTemplate("adversarial://scenario/{id}", {
    list: undefined,
  });

  server.registerResource(
    "adversarial-by-id",
    adversarialIdTemplate,
    {
      description:
        "Get a specific adversarial attack scenario by ID (e.g., adversarial://scenario/AS-001)",
      mimeType: "text/markdown",
    },
    async (uri, variables) => {
      const id = Array.isArray(variables.id) ? variables.id[0] : variables.id;
      if (!id) {
        throw new Error("Missing required parameter: id");
      }

      const scenario = ADVERSARIAL_SCENARIOS.find((s) => s.id === id);

      if (!scenario) {
        throw new Error(`Adversarial scenario not found: ${id}`);
      }

      return {
        contents: [
          {
            uri: uri.toString(),
            mimeType: "text/markdown",
            text: formatSingleScenario(scenario),
          },
        ],
      };
    },
  );
}

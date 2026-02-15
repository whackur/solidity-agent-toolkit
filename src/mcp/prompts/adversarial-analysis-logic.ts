import { detectContractFeatures } from "../../core/adversarial-analysis.js";
import { ADVERSARIAL_SCENARIOS, type AdversarialScenario } from "../../knowledge/index.js";

export function buildAdversarialPrompt(
  contractCode: string,
  focusCategory?: string,
): { system: string; user: string } {
  const detectedFeatures = detectContractFeatures(contractCode);
  const detectedCategories = new Set(detectedFeatures.map((f) => f.category));

  // Filter scenarios: use focusCategory if provided, otherwise use detected categories
  let applicableScenarios: AdversarialScenario[] = [];
  if (focusCategory) {
    applicableScenarios = ADVERSARIAL_SCENARIOS.filter((s) => s.category === focusCategory);
  } else if (detectedCategories.size > 0) {
    applicableScenarios = ADVERSARIAL_SCENARIOS.filter((s) => detectedCategories.has(s.category));
  }

  const system =
    "You are a smart contract security researcher performing adversarial analysis. " +
    "Think like an attacker. Your goal is to identify multi-step attack vectors, " +
    "construct realistic exploit scenarios, and verify which contract invariants could be violated.";

  let scenarioContext = "";
  if (applicableScenarios.length > 0) {
    scenarioContext =
      "### Applicable Attack Scenarios:\n\n" +
      applicableScenarios
        .map(
          (scenario) =>
            `**${scenario.name}** (${scenario.id} - ${scenario.severity})\n` +
            `Category: ${scenario.category}\n` +
            `Description: ${scenario.description}\n\n` +
            `Pre-Conditions:\n${scenario.preConditions.map((pc) => `- ${pc}`).join("\n")}\n\n` +
            `Attack Steps:\n${scenario.attackSteps.map((step) => `- ${step}`).join("\n")}\n\n` +
            `Invariants Violated:\n${scenario.invariantsViolated.map((inv) => `- ${inv}`).join("\n")}\n\n` +
            `Related SCWE IDs: ${scenario.scweIds.join(", ")}\n` +
            `OWASP 2026: ${scenario.owasp2026}\n` +
            `Real-World Example: ${scenario.realWorldExample}`,
        )
        .join("\n\n---\n\n");
  }

  const user =
    (scenarioContext
      ? `${scenarioContext}\n\n`
      : "### General Adversarial Analysis Framework:\n" +
        "Even though no specific attack scenarios were detected, analyze the contract for:\n" +
        "- State management vulnerabilities\n" +
        "- External call patterns and ordering\n" +
        "- Access control weaknesses\n" +
        "- Economic incentive misalignments\n\n") +
    `### Contract Code to Analyze:\n\`\`\`solidity\n${contractCode}\n\`\`\`\n\n` +
    "### Analysis Instructions:\n" +
    "For each applicable scenario:\n" +
    "1. Verify pre-conditions against this specific contract.\n" +
    "2. Adapt the attack steps to the contract's actual functions and state.\n" +
    "3. Identify the exact invariants that would be violated.\n" +
    "4. Assess the likelihood and impact of the attack.\n" +
    "5. Suggest defensive mitigations (e.g., CEI pattern, reentrancy guards, state validation).";

  return { system, user };
}

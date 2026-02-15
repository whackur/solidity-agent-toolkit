import {
  ADVERSARIAL_SCENARIOS,
  CONTRACT_FEATURE_PATTERNS,
  type AdversarialScenario,
  type AdversarialCategory,
} from "../knowledge/index.js";

export interface DetectedFeature {
  category: AdversarialCategory;
  name: string;
  matchedLines: { line: number; text: string }[];
}

export interface ScenarioMatch {
  scenario: AdversarialScenario;
  detectedFeatures: DetectedFeature[];
}

export interface AdversarialAnalysisResult {
  success: boolean;
  detectedFeatures: DetectedFeature[];
  matchedScenarios: ScenarioMatch[];
  error?: string;
}

export function detectContractFeatures(code: string): DetectedFeature[] {
  const lines = code.split("\n");
  const featureMap = new Map<AdversarialCategory, DetectedFeature>();

  for (const pattern of CONTRACT_FEATURE_PATTERNS) {
    const matchedLines: { line: number; text: string }[] = [];

    for (const regex of pattern.patterns) {
      const re = new RegExp(regex.source, regex.flags.replace("g", ""));
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          const alreadyFound = matchedLines.some((m) => m.line === i + 1);
          if (!alreadyFound) {
            matchedLines.push({ line: i + 1, text: lines[i].trim() });
          }
        }
      }
    }

    if (matchedLines.length > 0) {
      const existing = featureMap.get(pattern.category);
      if (existing) {
        for (const ml of matchedLines) {
          if (!existing.matchedLines.some((m) => m.line === ml.line)) {
            existing.matchedLines.push(ml);
          }
        }
      } else {
        featureMap.set(pattern.category, {
          category: pattern.category,
          name: pattern.name,
          matchedLines: [...matchedLines],
        });
      }
    }
  }

  return Array.from(featureMap.values());
}

export function analyzeAdversarialScenarios(code: string): AdversarialAnalysisResult {
  const detectedFeatures = detectContractFeatures(code);
  const detectedCategories = new Set(detectedFeatures.map((f) => f.category));

  const matchedScenarios: ScenarioMatch[] = ADVERSARIAL_SCENARIOS.filter((s) =>
    detectedCategories.has(s.category),
  ).map((scenario) => ({
    scenario,
    detectedFeatures: detectedFeatures.filter((f) => f.category === scenario.category),
  }));

  return { success: true, detectedFeatures, matchedScenarios };
}

export function formatAdversarialAnalysis(result: AdversarialAnalysisResult): string {
  if (result.matchedScenarios.length === 0) {
    return "No adversarial scenarios identified. The contract does not exhibit features commonly targeted by known attack patterns.";
  }

  const categories = new Set(result.matchedScenarios.map((m) => m.scenario.category));
  const header =
    `# Adversarial Scenario Analysis\n\n` +
    `Found ${result.matchedScenarios.length} applicable adversarial scenarios ` +
    `across ${categories.size} attack categories.\n`;

  const scenarioSections = result.matchedScenarios
    .map((match) => {
      const s = match.scenario;
      const scweList = s.scweIds.join(", ");
      const preConditions = s.preConditions.map((p) => `- ${p}`).join("\n");
      const steps = s.attackSteps.map((step, i) => `${i + 1}. ${step}`).join("\n");
      const invariants = s.invariantsViolated.map((iv) => `- ${iv}`).join("\n");

      return (
        `## ${s.name}\n\n` +
        `**Severity:** ${s.severity.toUpperCase()} | **SCWE:** ${scweList} | **OWASP:** ${s.owasp2026}\n\n` +
        `${s.description}\n\n` +
        `### Pre-Conditions\n${preConditions}\n\n` +
        `### Attack Steps\n${steps}\n\n` +
        `### Invariants Violated\n${invariants}\n\n` +
        `**Real-World Example:** ${s.realWorldExample}`
      );
    })
    .join("\n\n---\n\n");

  const featureSection = result.detectedFeatures
    .map((f) => {
      const lines = f.matchedLines.map((ml) => `  - Line ${ml.line}: \`${ml.text}\``).join("\n");
      return `- **${f.name}** (${f.category})\n${lines}`;
    })
    .join("\n");

  return (
    header +
    "\n" +
    scenarioSections +
    "\n\n---\n\n" +
    `## Detected Contract Features\n\n${featureSection}\n`
  );
}

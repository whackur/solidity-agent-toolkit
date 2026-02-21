import { loadAllTop10 } from "../../knowledge/top10-parser.js";
import { getSCWEById, loadAllSCWE } from "../../knowledge/scwe-parser.js";
import { detectContractFeatures } from "../../core/adversarial-analysis.js";
import { getScweIdsForCategories } from "../../knowledge/feature-scwe-mappings.js";

export function buildAuditPrompt(
  contractCode: string,
  level: "quick" | "deep",
): { system: string; user: string } {
  let knowledgeBase = "";

  if (level === "quick") {
    const top10 = loadAllTop10();
    knowledgeBase =
      "OWASP Smart Contract Top 10 Checklist:\n" +
      top10.map((e) => `- ${e.id}: ${e.title}\n  Description: ${e.description}`).join("\n\n");
  } else {
    // Detect contract features to prioritize relevant SCWE entries
    const features = detectContractFeatures(contractCode);
    const detectedCategories = features.map((f) => f.category);
    const priorityScweIds = new Set(getScweIdsForCategories(detectedCategories));

    const allScwe = loadAllSCWE();
    const prioritized = allScwe.filter((e) => priorityScweIds.has(e.id));
    const remaining = allScwe.filter((e) => !priorityScweIds.has(e.id));

    knowledgeBase = "";
    if (prioritized.length > 0) {
      const featureNames = features.map((f) => f.name).join(", ");
      knowledgeBase +=
        `Detected contract features: ${featureNames}\n\n` +
        "**Priority SCWE entries (matched to detected features):**\n" +
        prioritized
          .map((e) => `- ${e.id}: ${e.title}\n  Description: ${e.description}`)
          .join("\n\n") +
        "\n\n";
    }
    knowledgeBase +=
      "Full SCWE Knowledge Base:\n" +
      remaining.map((e) => `- ${e.id}: ${e.title}\n  Description: ${e.description}`).join("\n\n");
  }

  const system =
    level === "quick"
      ? "You are a security auditor specializing in Solidity. Use the OWASP Smart Contract Top 10 as your primary checklist."
      : "You are a security auditor specializing in Solidity. Use the full Smart Contract Weakness Enumeration (SCWE) as your knowledge base.";

  const user = `Please perform a ${level} security audit on the following Solidity smart contract.

${knowledgeBase}

### Contract Code to Audit:
\`\`\`solidity
${contractCode}
\`\`\`

### Instructions:
1. Identify potential vulnerabilities based on the provided knowledge base.
2. For each finding, provide:
   - Vulnerability ID and Title
   - Location (line numbers or function names)
   - Severity (High/Medium/Low)
   - Description of the issue
   - Remediation advice`;

  return { system, user };
}

export function buildVulnerabilityFixPrompt(code: string, vulnerabilityId: string): string {
  const entry = getSCWEById(vulnerabilityId);

  if (!entry) {
    return `I need help fixing a vulnerability in this code, but I couldn't find details for vulnerability ID: ${vulnerabilityId}.\n\nCode:\n\`\`\`solidity\n${code}\n\`\`\``;
  }

  return `Vulnerability: ${entry.id} - ${entry.title}

### Description:
${entry.description}

### Remediation Guide:
${entry.remediation}

### Vulnerable Code:
\`\`\`solidity
${code}
\`\`\`

### Task:
Please provide a fixed version of the code above, following the remediation guide. Explain the changes you made to secure the contract.`;
}

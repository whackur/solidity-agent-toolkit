import { loadAllTop10 } from "../knowledge/top10-parser.js";
import { getSCWEById, loadAllSCWE } from "../knowledge/scwe-parser.js";

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
    const scwe = loadAllSCWE();
    knowledgeBase =
      "Smart Contract Weakness Enumeration (SCWE) Knowledge Base:\n" +
      scwe.map((e) => `- ${e.id}: ${e.title}\n  Description: ${e.description}`).join("\n\n");
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

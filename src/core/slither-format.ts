import { execSync } from "child_process";
import { isCliAvailable } from "./tool-checker.js";
import type { SlitherFinding } from "./slither.js";

export function formatFindings(findings: SlitherFinding[]): string {
  if (findings.length === 0) {
    return "No vulnerabilities detected.";
  }

  const header = `Found ${findings.length} potential issue(s):\n`;

  const grouped = findings.reduce(
    (acc, finding) => {
      const key = finding.severity;
      if (!acc[key]) acc[key] = [];
      acc[key].push(finding);
      return acc;
    },
    {} as Record<string, SlitherFinding[]>,
  );

  const severityOrder: Array<SlitherFinding["severity"]> = [
    "High",
    "Medium",
    "Low",
    "Informational",
    "Optimization",
  ];

  let body = "";
  for (const severity of severityOrder) {
    const items = grouped[severity];
    if (!items || items.length === 0) continue;

    body += `\n## ${severity} Severity (${items.length})\n\n`;

    for (const finding of items) {
      const scweTag = finding.scweMapping ? ` [${finding.scweMapping}]` : "";
      body += `### ${finding.detector}${scweTag}\n`;
      body += `- **Confidence**: ${finding.confidence}\n`;
      body += `- **Location**: ${finding.location.file}:${finding.location.line}\n`;
      body += `- **Description**: ${finding.description.trim()}\n\n`;
    }
  }

  return header + body;
}

export function listSlitherDetectors(): string {
  if (!isCliAvailable("slither")) {
    return "Slither is not installed. Install it with: pip install slither-analyzer";
  }

  try {
    const output = execSync("slither --list-detectors", {
      encoding: "utf-8",
      maxBuffer: 5 * 1024 * 1024,
    });

    return output;
  } catch (error: unknown) {
    return `Failed to list detectors: ${error instanceof Error ? error.message : String(error)}`;
  }
}

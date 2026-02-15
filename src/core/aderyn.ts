import { execSync } from "child_process";

export interface AderynFinding {
  detector: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  title: string;
  description: string;
  location: {
    file: string;
    line: number;
  };
}

export function checkAderynInstalled(): boolean {
  try {
    execSync("aderyn --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

interface RawAderynFinding {
  detector?: string;
  severity?: string;
  title?: string;
  description?: string;
  location?: { file?: string; line?: number };
}

export function parseAderynJson(output: string): AderynFinding[] {
  try {
    const parsed = JSON.parse(output);
    if (parsed.findings && Array.isArray(parsed.findings)) {
      return parsed.findings.map((finding: RawAderynFinding) => ({
        detector: finding.detector || "Unknown",
        severity: finding.severity || "Medium",
        title: finding.title || "Untitled Finding",
        description: finding.description || "",
        location: {
          file: finding.location?.file || "Unknown",
          line: finding.location?.line || 0,
        },
      }));
    }
    return [];
  } catch {
    return [];
  }
}

export function formatFindingsAsMarkdown(findings: AderynFinding[]): string {
  if (findings.length === 0) {
    return "# Aderyn Analysis Results\n\nNo security findings detected.";
  }

  let markdown = `# Aderyn Security Analysis Results\n\nFound ${findings.length} issue(s):\n\n`;

  const bySeverity: Record<string, AderynFinding[]> = {
    Critical: [],
    High: [],
    Medium: [],
    Low: [],
  };

  for (const finding of findings) {
    if (bySeverity[finding.severity]) {
      bySeverity[finding.severity].push(finding);
    }
  }

  for (const severity of ["Critical", "High", "Medium", "Low"]) {
    const severityFindings = bySeverity[severity as keyof typeof bySeverity];
    if (severityFindings.length === 0) continue;

    markdown += `## ${severity} (${severityFindings.length})\n\n`;

    for (const finding of severityFindings) {
      markdown += `### ${finding.title}\n`;
      markdown += `**Detector:** ${finding.detector}\n`;
      markdown += `**Location:** ${finding.location.file}:${finding.location.line}\n`;
      markdown += `**Description:** ${finding.description}\n\n`;
    }
  }

  return markdown;
}

export function runAderyn(
  path: string = ".",
  outputFormat: "json" | "markdown" = "json",
): { text: string; isError: boolean } {
  if (!checkAderynInstalled()) {
    return {
      text: `Aderyn is not installed. Please install it using:\n\n\`\`\`bash\nbrew install cyfrin/tap/aderyn\n\`\`\`\n\nOr visit: https://github.com/Cyfrin/aderyn`,
      isError: true,
    };
  }

  const targetPath = path || ".";
  const command = `aderyn ${targetPath} --output json`;

  let output: string;
  try {
    output = execSync(command, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
  } catch (error) {
    if (error instanceof Error && "stdout" in error) {
      output = typeof error.stdout === "string" ? error.stdout : "";
    } else {
      throw error;
    }
  }

  const findings = parseAderynJson(output);

  let resultText: string;
  if (outputFormat === "markdown") {
    resultText = formatFindingsAsMarkdown(findings);
  } else {
    resultText = JSON.stringify(
      {
        summary: {
          total: findings.length,
          critical: findings.filter((f) => f.severity === "Critical").length,
          high: findings.filter((f) => f.severity === "High").length,
          medium: findings.filter((f) => f.severity === "Medium").length,
          low: findings.filter((f) => f.severity === "Low").length,
        },
        findings,
      },
      null,
      2,
    );
  }

  return { text: resultText, isError: false };
}

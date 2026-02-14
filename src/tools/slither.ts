import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { execSync } from "child_process";
import { z } from "zod";
import { getScweIdForDetector } from "../knowledge/slither-mappings.js";

export interface SlitherFinding {
  detector: string;
  severity: "High" | "Medium" | "Low" | "Informational" | "Optimization";
  confidence: "High" | "Medium" | "Low";
  description: string;
  location: {
    file: string;
    line: number;
    column?: number;
  };
  scweMapping?: string;
}

export interface SlitherResult {
  success: boolean;
  findings: SlitherFinding[];
  error?: string;
}

function checkSlitherInstalled(): boolean {
  try {
    execSync("slither --version", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function parseSlitherJson(jsonOutput: string): SlitherFinding[] {
  try {
    const data = JSON.parse(jsonOutput);
    const findings: SlitherFinding[] = [];

    if (!data.results || !data.results.detectors) {
      return findings;
    }

    for (const detector of data.results.detectors) {
      const firstElement = detector.elements?.[0];
      const location = firstElement?.source_mapping || {};

      const finding: SlitherFinding = {
        detector: detector.check || "unknown",
        severity: mapSeverity(detector.impact),
        confidence: mapConfidence(detector.confidence),
        description: detector.description || "No description",
        location: {
          file: location.filename_relative || location.filename_absolute || "unknown",
          line: location.lines?.[0] || 0,
          column: location.starting_column,
        },
      };

      const scweId = getScweIdForDetector(finding.detector);
      if (scweId) {
        finding.scweMapping = scweId;
      }

      findings.push(finding);
    }

    return findings;
  } catch (error) {
    throw new Error(`Failed to parse Slither JSON output: ${error}`);
  }
}

function mapSeverity(impact: string): SlitherFinding["severity"] {
  const normalized = impact?.toLowerCase() || "";
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  if (normalized === "low") return "Low";
  if (normalized === "informational") return "Informational";
  if (normalized === "optimization") return "Optimization";
  return "Informational";
}

function mapConfidence(confidence: string): SlitherFinding["confidence"] {
  const normalized = confidence?.toLowerCase() || "";
  if (normalized === "high") return "High";
  if (normalized === "medium") return "Medium";
  if (normalized === "low") return "Low";
  return "Medium";
}

export function runSlither(
  path: string = ".",
  detectors?: string[],
  exclude?: string[],
): SlitherResult {
  if (!checkSlitherInstalled()) {
    return {
      success: false,
      findings: [],
      error: "Slither is not installed. Install it with: pip install slither-analyzer",
    };
  }

  try {
    let command = `slither ${path} --json -`;

    if (detectors && detectors.length > 0) {
      command += ` --detect ${detectors.join(",")}`;
    }

    if (exclude && exclude.length > 0) {
      command += ` --exclude ${exclude.join(",")}`;
    }

    const output = execSync(command, {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    });

    const findings = parseSlitherJson(output);

    return {
      success: true,
      findings,
    };
  } catch (error: any) {
    if (error.stdout) {
      try {
        const findings = parseSlitherJson(error.stdout);
        return {
          success: true,
          findings,
        };
      } catch {
        // Fall through to error handling
      }
    }

    const errorMessage = error.stderr || error.message || "Unknown error";

    if (errorMessage.includes("No contract found")) {
      return {
        success: false,
        findings: [],
        error: "No Solidity contracts found in the specified path",
      };
    }

    if (errorMessage.includes("Compilation failed")) {
      return {
        success: false,
        findings: [],
        error: `Compilation failed: ${errorMessage}`,
      };
    }

    return {
      success: false,
      findings: [],
      error: `Slither analysis failed: ${errorMessage}`,
    };
  }
}

function formatFindings(findings: SlitherFinding[]): string {
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
  if (!checkSlitherInstalled()) {
    return "Slither is not installed. Install it with: pip install slither-analyzer";
  }

  try {
    const output = execSync("slither --list-detectors", {
      encoding: "utf-8",
      maxBuffer: 5 * 1024 * 1024,
    });

    return output;
  } catch (error: any) {
    return `Failed to list detectors: ${error.message}`;
  }
}

export function registerSlitherTools(server: McpServer): void {
  server.tool(
    "run_slither",
    "Run Slither static analysis on Solidity contracts and map findings to SCWE IDs",
    {
      path: z.string().optional().describe("Path to Solidity project (default: current directory)"),
      detectors: z
        .array(z.string())
        .optional()
        .describe('Specific detectors to run (e.g., ["reentrancy-eth", "tx-origin"])'),
      exclude: z.array(z.string()).optional().describe("Detectors to exclude from analysis"),
      jsonOutput: z
        .boolean()
        .optional()
        .describe("Return raw JSON output instead of formatted text"),
    },
    async ({ path, detectors, exclude, jsonOutput }) => {
      const result = runSlither(path, detectors, exclude);

      if (!result.success) {
        return {
          content: [{ type: "text" as const, text: result.error || "Analysis failed" }],
          isError: true,
        };
      }

      if (jsonOutput) {
        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result.findings, null, 2),
            },
          ],
          isError: false,
        };
      }

      return {
        content: [{ type: "text" as const, text: formatFindings(result.findings) }],
        isError: false,
      };
    },
  );

  server.tool(
    "list_slither_detectors",
    "List all available Slither detectors with descriptions",
    {},
    async () => {
      const output = listSlitherDetectors();

      return {
        content: [{ type: "text" as const, text: output }],
        isError: output.includes("not installed"),
      };
    },
  );
}

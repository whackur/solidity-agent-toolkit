import { execSync } from "child_process";
import { getScweIdForDetector } from "../knowledge/slither-mappings.js";
import { isCliAvailable } from "./tool-checker.js";

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

export function checkSlitherInstalled(): boolean {
  return isCliAvailable("slither");
}

export function parseSlitherJson(jsonOutput: string): SlitherFinding[] {
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

    return { success: true, findings };
  } catch (error: unknown) {
    const execErr = error as Error & { stdout?: string; stderr?: string };
    if (execErr.stdout) {
      try {
        const findings = parseSlitherJson(execErr.stdout);
        return { success: true, findings };
      } catch {
        // Fall through to error handling
      }
    }

    const errorMessage = execErr.stderr || execErr.message || "Unknown error";

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

export { formatFindings, listSlitherDetectors } from "./slither-format.js";

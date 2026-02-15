import { type Diagnostic } from "vscode-languageserver/node.js";
import { runCliAsync } from "./cli-runner.js";
import { mapToLspSeverity } from "./severity-mapper.js";
import { parseSlitherJson, type SlitherFinding } from "../core/slither.js";
import { parseSolhintOutput, type SolhintViolation } from "../core/solhint.js";
import { parseAderynJson, type AderynFinding } from "../core/aderyn.js";

function slitherFindingToDiagnostic(finding: SlitherFinding): Diagnostic {
  const line = Math.max((finding.location?.line ?? 1) - 1, 0);
  const col = Math.max((finding.location?.column ?? 1) - 1, 0);

  return {
    range: {
      start: { line, character: col },
      end: { line, character: col + 1 },
    },
    severity: mapToLspSeverity("slither", finding.severity),
    source: "slither",
    code: finding.scweMapping ?? undefined,
    message: `[${finding.detector}] ${finding.description}`,
  };
}

function solhintViolationToDiagnostic(violation: SolhintViolation): Diagnostic {
  const line = Math.max((violation.line ?? 1) - 1, 0);
  const col = Math.max((violation.column ?? 1) - 1, 0);

  return {
    range: {
      start: { line, character: col },
      end: { line, character: col + 1 },
    },
    severity: mapToLspSeverity("solhint", violation.severity),
    source: "solhint",
    code: violation.ruleId,
    message: violation.message,
  };
}

function aderynFindingToDiagnostic(finding: AderynFinding): Diagnostic {
  const line = Math.max((finding.location?.line ?? 1) - 1, 0);

  return {
    range: {
      start: { line, character: 0 },
      end: { line, character: Number.MAX_SAFE_INTEGER },
    },
    severity: mapToLspSeverity("aderyn", finding.severity),
    source: "aderyn",
    message: `[${finding.detector}] ${finding.title}: ${finding.description}`,
  };
}

async function isToolAvailable(command: string): Promise<boolean> {
  try {
    const result = await runCliAsync(command, ["--version"], { timeout: 5_000 });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

export async function getSlitherDiagnostics(filePath: string, cwd: string): Promise<Diagnostic[]> {
  try {
    if (!(await isToolAvailable("slither"))) return [];

    const result = await runCliAsync("slither", [filePath, "--json", "-"], { cwd });
    const findings = parseSlitherJson(result.stdout || result.stderr);
    return findings.map(slitherFindingToDiagnostic);
  } catch {
    return [];
  }
}

export async function getSolhintDiagnostics(filePath: string, cwd: string): Promise<Diagnostic[]> {
  try {
    if (!(await isToolAvailable("solhint"))) return [];

    const result = await runCliAsync("solhint", [filePath, "--formatter", "json"], { cwd });
    const violations = parseSolhintOutput(result.stdout);
    return violations.map(solhintViolationToDiagnostic);
  } catch {
    return [];
  }
}

export async function getAderynDiagnostics(filePath: string, cwd: string): Promise<Diagnostic[]> {
  try {
    if (!(await isToolAvailable("aderyn"))) return [];

    const result = await runCliAsync("aderyn", [filePath, "--output", "json"], { cwd });
    const findings = parseAderynJson(result.stdout);
    return findings.map(aderynFindingToDiagnostic);
  } catch {
    return [];
  }
}

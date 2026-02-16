import { ERC_STANDARDS } from "../knowledge/erc-interfaces.js";
import type { ERCFunctionSignature, ERCStandardSpec } from "../knowledge/erc-interfaces.js";

export interface ComplianceResult {
  standard: string;
  compliant: boolean;
  missingFunctions: string[];
  missingEvents: string[];
  presentFunctions: string[];
  presentEvents: string[];
  warnings: string[];
}

const SUPPORTED_STANDARDS = Object.keys(ERC_STANDARDS).join(", ");

function countParamsInLine(code: string, fnName: string): number | null {
  const fnRegex = new RegExp(`function\\s+${fnName}\\s*\\(([^)]*)\\)`);
  const match = code.match(fnRegex);
  if (!match) return null;
  const params = match[1].trim();
  if (params === "") return 0;
  return params.split(",").length;
}

function checkSignatureWarning(
  code: string,
  fn: ERCFunctionSignature,
  _standard: string,
): string | null {
  const paramCount = countParamsInLine(code, fn.name);
  if (paramCount === null) return null;
  if (paramCount !== fn.inputs.length) {
    const expectedParams = fn.inputs.length > 0 ? fn.inputs.join(", ") : "none";
    return `${fn.name}() found but signature may not match expected (${expectedParams})`;
  }
  return null;
}

export function checkERCCompliance(code: string, standard: string): ComplianceResult {
  const normalized = standard.toUpperCase();

  if (!(normalized in ERC_STANDARDS)) {
    return {
      standard: normalized,
      compliant: false,
      missingFunctions: [],
      missingEvents: [],
      presentFunctions: [],
      presentEvents: [],
      warnings: [`Unsupported ERC standard: ${normalized}. Supported: ${SUPPORTED_STANDARDS}`],
    };
  }

  const spec: ERCStandardSpec = ERC_STANDARDS[normalized];
  const warnings: string[] = [];

  const uniqueFnNames = [...new Set(spec.functions.map((fn) => fn.name))];
  const presentFunctions: string[] = [];
  const missingFunctions: string[] = [];

  for (const name of uniqueFnNames) {
    const fnRegex = new RegExp(`function\\s+${name}\\s*\\(`);
    if (fnRegex.test(code)) {
      presentFunctions.push(name);
    } else {
      missingFunctions.push(name);
    }
  }

  for (const fn of spec.functions) {
    if (presentFunctions.includes(fn.name)) {
      const warning = checkSignatureWarning(code, fn, normalized);
      if (warning && !warnings.includes(warning)) {
        warnings.push(warning);
      }
    }
  }

  const uniqueEventNames = [...new Set(spec.events.map((ev) => ev.name))];
  const presentEvents: string[] = [];
  const missingEvents: string[] = [];

  for (const name of uniqueEventNames) {
    const evRegex = new RegExp(`event\\s+${name}\\s*\\(`);
    if (evRegex.test(code)) {
      presentEvents.push(name);
    } else {
      missingEvents.push(name);
    }
  }

  const compliant = missingFunctions.length === 0 && missingEvents.length === 0;

  return {
    standard: normalized,
    compliant,
    missingFunctions,
    missingEvents,
    presentFunctions,
    presentEvents,
    warnings,
  };
}

export function formatComplianceResult(result: ComplianceResult): string {
  const unsupportedWarning = result.warnings.find((w) => w.startsWith("Unsupported ERC standard"));
  if (unsupportedWarning) {
    return unsupportedWarning;
  }

  const status = result.compliant ? "COMPLIANT ✓" : "NON-COMPLIANT ✗";
  const totalFn = result.presentFunctions.length + result.missingFunctions.length;
  const totalEv = result.presentEvents.length + result.missingEvents.length;

  const fnLines = [
    ...result.presentFunctions.map((name) => `- ✓ ${name}`),
    ...result.missingFunctions.map((name) => `- ✗ ${name} (MISSING)`),
  ].join("\n");

  const evLines = [
    ...result.presentEvents.map((name) => `- ✓ ${name}`),
    ...result.missingEvents.map((name) => `- ✗ ${name} (MISSING)`),
  ].join("\n");

  let output =
    `# ERC Compliance Check: ${result.standard}\n\n` +
    `**Status:** ${status}\n\n` +
    `## Required Functions (${result.presentFunctions.length}/${totalFn})\n${fnLines}\n\n` +
    `## Required Events (${result.presentEvents.length}/${totalEv})\n${evLines}`;

  const nonUnsupportedWarnings = result.warnings.filter(
    (w) => !w.startsWith("Unsupported ERC standard"),
  );
  if (nonUnsupportedWarnings.length > 0) {
    output += `\n\n## Warnings\n${nonUnsupportedWarnings.map((w) => `- ${w}`).join("\n")}`;
  }

  return output;
}

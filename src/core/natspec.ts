import {
  parseFunctions,
  extractNatSpec,
  type FunctionSignature,
  type NatSpecDoc,
} from "./natspec-parser.js";

export { parseFunctions, extractNatSpec, type FunctionSignature, type NatSpecDoc };

export interface NatSpecIssue {
  functionName: string;
  line: number;
  missing: ("notice" | "param" | "return")[];
  severity: "error" | "warning";
}

export function validateNatSpec(code: string): NatSpecIssue[] {
  const functions = parseFunctions(code);
  const issues: NatSpecIssue[] = [];

  for (const func of functions) {
    if (func.visibility !== "public" && func.visibility !== "external") {
      continue;
    }

    const natspec = extractNatSpec(code, func.startLine);
    const missing: ("notice" | "param" | "return")[] = [];

    if (!natspec.notice) {
      missing.push("notice");
    }

    for (const param of func.params) {
      if (!natspec.params.has(param.name)) {
        missing.push("param");
        break;
      }
    }

    if (func.returns.length > 0 && !natspec.returns) {
      missing.push("return");
    }

    if (missing.length > 0) {
      issues.push({
        functionName: func.name,
        line: func.line,
        missing,
        severity: "error",
      });
    }
  }

  return issues;
}

export function generateNatSpec(code: string): string {
  const functions = parseFunctions(code);
  const lines = code.split("\n");
  const insertions: Map<number, string[]> = new Map();

  for (const func of functions) {
    if (func.visibility !== "public" && func.visibility !== "external") {
      continue;
    }

    const natspec = extractNatSpec(code, func.startLine);
    const missing: string[] = [];

    const needsNotice = !natspec.notice;
    const missingParams = func.params.filter((p) => !natspec.params.has(p.name));
    const needsReturn = func.returns.length > 0 && !natspec.returns;

    if (needsNotice) {
      missing.push("/// @notice [Description of what function does]");
    }

    for (const param of missingParams) {
      missing.push(`/// @param ${param.name} [Description]`);
    }

    if (needsReturn) {
      missing.push("/// @return [Description of return value]");
    }

    if (missing.length > 0) {
      const insertLine = func.startLine - 1;
      insertions.set(insertLine, missing);
    }
  }

  const sortedInsertions = Array.from(insertions.entries()).sort((a, b) => b[0] - a[0]);

  for (const [lineIndex, natspecLines] of sortedInsertions) {
    const functionLine = lines[lineIndex];
    const indent = functionLine.match(/^(\s*)/)?.[1] || "";

    const indentedLines = natspecLines.map((line) => indent + line);
    lines.splice(lineIndex, 0, ...indentedLines);
  }

  return lines.join("\n");
}

export function formatValidationResults(issues: NatSpecIssue[]): string {
  if (issues.length === 0) {
    return "All public/external functions have complete NatSpec documentation.";
  }

  const header = `Found ${issues.length} function(s) with incomplete NatSpec documentation:\n`;
  const body = issues
    .map(
      (issue, i) =>
        `${i + 1}. Function "${issue.functionName}" (line ${issue.line})\n` +
        `   Missing: ${issue.missing.map((m) => `@${m}`).join(", ")}\n` +
        `   Severity: ${issue.severity}`,
    )
    .join("\n\n");

  return header + "\n" + body;
}

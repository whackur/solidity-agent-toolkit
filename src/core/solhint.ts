import { isCliAvailable } from "./tool-checker.js";

export interface SolhintViolation {
  ruleId: string;
  severity: "error" | "warning";
  message: string;
  line: number;
  column: number;
  file: string;
  fix?: string;
}

export interface SolhintRule {
  name: string;
  description: string;
  category?: string;
}

export const SOLHINT_RULES: SolhintRule[] = [
  { name: "no-unused-vars", description: "Disallow unused variables", category: "Best Practices" },
  { name: "max-line-length", description: "Maximum line length", category: "Style" },
  { name: "no-empty-blocks", description: "Disallow empty blocks", category: "Best Practices" },
  {
    name: "no-constant-functions",
    description: "Disallow constant functions",
    category: "Best Practices",
  },
  { name: "no-global-import", description: "Disallow global imports", category: "Best Practices" },
  { name: "no-inline-assembly", description: "Disallow inline assembly", category: "Security" },
  { name: "no-named-parameters", description: "Disallow named parameters", category: "Style" },
  {
    name: "no-restricted-names",
    description: "Disallow restricted names",
    category: "Best Practices",
  },
  { name: "no-shadowing", description: "Disallow variable shadowing", category: "Best Practices" },
  {
    name: "no-state-functions",
    description: "Disallow state functions",
    category: "Best Practices",
  },
  { name: "no-tx-origin", description: "Disallow tx.origin usage", category: "Security" },
  {
    name: "no-unreachable-code",
    description: "Disallow unreachable code",
    category: "Best Practices",
  },
  { name: "ordering", description: "Enforce code ordering", category: "Style" },
  { name: "quotes", description: "Enforce quote style", category: "Style" },
  {
    name: "reason-string",
    description: "Require reason strings in require/revert",
    category: "Best Practices",
  },
  {
    name: "separate-by-one-line-in-contract",
    description: "Separate contract elements by one line",
    category: "Style",
  },
  {
    name: "two-lines-top-level-separator",
    description: "Require two lines between top-level elements",
    category: "Style",
  },
  {
    name: "var-name-mixedcase",
    description: "Enforce variable naming convention",
    category: "Style",
  },
  {
    name: "visibility-modifier-order",
    description: "Enforce visibility modifier order",
    category: "Style",
  },
  {
    name: "func-name-mixedcase",
    description: "Enforce function naming convention",
    category: "Style",
  },
  {
    name: "contract-name-camelcase",
    description: "Enforce contract naming convention",
    category: "Style",
  },
  {
    name: "const-name-snakecase",
    description: "Enforce constant naming convention",
    category: "Style",
  },
  {
    name: "event-name-camelcase",
    description: "Enforce event naming convention",
    category: "Style",
  },
  {
    name: "modifier-name-mixedcase",
    description: "Enforce modifier naming convention",
    category: "Style",
  },
  { name: "no-console", description: "Disallow console usage", category: "Best Practices" },
];

export function checkSolhintInstalled(): boolean {
  return isCliAvailable("solhint");
}

export function parseSolhintOutput(jsonOutput: string): SolhintViolation[] {
  try {
    const parsed = JSON.parse(jsonOutput);
    const reports = Array.isArray(parsed) ? parsed : [parsed];
    const violations: SolhintViolation[] = [];

    for (const report of reports) {
      if (report.reports && Array.isArray(report.reports)) {
        for (const violation of report.reports) {
          violations.push({
            ruleId: violation.ruleId || "unknown",
            severity: violation.severity || "warning",
            message: violation.message || "",
            line: violation.line || 0,
            column: violation.column || 0,
            file: report.file || "unknown",
            fix: violation.fix,
          });
        }
      } else if (report.file && report.reports === undefined) {
        violations.push({
          ruleId: report.ruleId || "unknown",
          severity: report.severity || "warning",
          message: report.message || "",
          line: report.line || 0,
          column: report.column || 0,
          file: report.file,
          fix: report.fix,
        });
      }
    }

    return violations.sort((a, b) => {
      if (a.file !== b.file) return a.file.localeCompare(b.file);
      if (a.line !== b.line) return a.line - b.line;
      return a.column - b.column;
    });
  } catch (error) {
    throw new Error(`Failed to parse solhint output: ${error}`, { cause: error });
  }
}

export function formatViolations(violations: SolhintViolation[]): string {
  if (violations.length === 0) {
    return "No linting violations found.";
  }

  const header = `Found ${violations.length} linting violation(s):\n`;
  const grouped = violations.reduce(
    (acc, v) => {
      if (!acc[v.file]) acc[v.file] = [];
      acc[v.file].push(v);
      return acc;
    },
    {} as Record<string, SolhintViolation[]>,
  );

  const body = Object.entries(grouped)
    .map(([file, fileViolations]) => {
      const fileHeader = `\n${file}:`;
      const items = fileViolations
        .map(
          (v, i) =>
            `  ${i + 1}. [${v.severity.toUpperCase()}] ${v.ruleId}\n` +
            `     Line ${v.line}:${v.column}: ${v.message}`,
        )
        .join("\n");
      return fileHeader + "\n" + items;
    })
    .join("\n");

  return header + body;
}

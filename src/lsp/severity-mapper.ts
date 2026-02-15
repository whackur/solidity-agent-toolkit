import { DiagnosticSeverity } from "vscode-languageserver/node.js";

export type DiagnosticSource = "slither" | "solhint" | "aderyn" | "pattern";

const SLITHER_MAP: Record<string, DiagnosticSeverity> = {
  high: DiagnosticSeverity.Error,
  medium: DiagnosticSeverity.Warning,
  low: DiagnosticSeverity.Information,
  informational: DiagnosticSeverity.Hint,
  optimization: DiagnosticSeverity.Hint,
};

const SOLHINT_MAP: Record<string, DiagnosticSeverity> = {
  error: DiagnosticSeverity.Error,
  warning: DiagnosticSeverity.Warning,
};

const ADERYN_MAP: Record<string, DiagnosticSeverity> = {
  critical: DiagnosticSeverity.Error,
  high: DiagnosticSeverity.Error,
  medium: DiagnosticSeverity.Warning,
  low: DiagnosticSeverity.Information,
};

const PATTERN_MAP: Record<string, DiagnosticSeverity> = {
  critical: DiagnosticSeverity.Error,
  high: DiagnosticSeverity.Error,
  medium: DiagnosticSeverity.Warning,
  low: DiagnosticSeverity.Information,
};

const SOURCE_MAPS: Record<DiagnosticSource, Record<string, DiagnosticSeverity>> = {
  slither: SLITHER_MAP,
  solhint: SOLHINT_MAP,
  aderyn: ADERYN_MAP,
  pattern: PATTERN_MAP,
};

export function mapToLspSeverity(source: DiagnosticSource, severity: string): DiagnosticSeverity {
  const map = SOURCE_MAPS[source];
  return map[severity.toLowerCase()] ?? DiagnosticSeverity.Hint;
}

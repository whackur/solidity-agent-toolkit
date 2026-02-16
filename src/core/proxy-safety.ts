import { PROXY_ANTI_PATTERNS, type ProxyAntiPattern } from "../knowledge/proxy-patterns.js";

export interface ProxySafetyFinding {
  id: string;
  name: string;
  severity: ProxyAntiPattern["severity"];
  line: number;
  matchedText: string;
  description: string;
  recommendation: string;
}

export interface ProxySafetyResult {
  isUpgradeable: boolean;
  proxyPattern: "UUPS" | "Transparent" | "Beacon" | "unknown" | "none";
  findings: ProxySafetyFinding[];
}

const UPGRADEABLE_INDICATORS = [
  /\bupgradeTo\s*\(/,
  /\bupgradeToAndCall\s*\(/,
  /\binitializer\b/,
  /\bproxiableUUID\b/,
  /\bInitializable\b/,
  /\bUUPSUpgradeable\b/,
  /\bTransparentUpgradeableProxy\b/,
  /\bOwnableUpgradeable\b/,
  /\bBeaconProxy\b/,
  /\bIBeacon\b/,
];

function detectUpgradeable(code: string): boolean {
  return UPGRADEABLE_INDICATORS.some((re) => re.test(code));
}

function detectProxyPattern(code: string): ProxySafetyResult["proxyPattern"] {
  if (/\bproxiableUUID\b/.test(code) || /\bUUPSUpgradeable\b/.test(code)) return "UUPS";
  if (/\bTransparentUpgradeableProxy\b/.test(code) || /\b_admin\b/.test(code)) return "Transparent";
  if (/\bIBeacon\b/.test(code) || /\bBeaconProxy\b/.test(code)) return "Beacon";
  return "unknown";
}

function matchAntiPatterns(code: string): ProxySafetyFinding[] {
  const lines = code.split("\n");
  const findings: ProxySafetyFinding[] = [];
  const hasGap = /__gap/.test(code);

  for (const pattern of PROXY_ANTI_PATTERNS) {
    if (pattern.id === "PROXY-006" && hasGap) continue;
    if (pattern.id === "PROXY-006" && !pattern.patterns[0].test(code)) continue;

    for (const regex of pattern.patterns) {
      if (pattern.id === "PROXY-006") {
        if (!hasGap) {
          findings.push({
            id: pattern.id,
            name: pattern.name,
            severity: pattern.severity,
            line: 1,
            matchedText: "No __gap declaration found",
            description: pattern.description,
            recommendation: pattern.recommendation,
          });
        }
        break;
      }

      const re = new RegExp(regex.source, regex.flags.replace("g", ""));
      for (let i = 0; i < lines.length; i++) {
        if (re.test(lines[i])) {
          const alreadyFound = findings.some((f) => f.id === pattern.id && f.line === i + 1);
          if (!alreadyFound) {
            findings.push({
              id: pattern.id,
              name: pattern.name,
              severity: pattern.severity,
              line: i + 1,
              matchedText: lines[i].trim(),
              description: pattern.description,
              recommendation: pattern.recommendation,
            });
          }
        }
      }
    }
  }

  return findings;
}

export function analyzeProxySafety(code: string): ProxySafetyResult {
  if (!code.trim()) {
    return { isUpgradeable: false, proxyPattern: "none", findings: [] };
  }

  const isUpgradeable = detectUpgradeable(code);
  if (!isUpgradeable) {
    return { isUpgradeable: false, proxyPattern: "none", findings: [] };
  }

  const proxyPattern = detectProxyPattern(code);
  const findings = matchAntiPatterns(code);

  return { isUpgradeable, proxyPattern, findings };
}

export function formatProxySafetyResult(result: ProxySafetyResult): string {
  if (!result.isUpgradeable) {
    return "No proxy/upgrade patterns detected. This contract does not appear to be upgradeable.";
  }

  if (result.findings.length === 0) {
    return (
      `# Proxy Safety Analysis\n\n` +
      `**Proxy Pattern:** ${result.proxyPattern}\n\n` +
      `No proxy anti-patterns detected. The contract follows upgrade safety best practices.`
    );
  }

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of result.findings) severityCounts[f.severity]++;

  const header =
    `# Proxy Safety Analysis\n\n` +
    `**Proxy Pattern:** ${result.proxyPattern}\n` +
    `**Findings:** ${result.findings.length} issue(s) — ` +
    `${severityCounts.critical} critical, ${severityCounts.high} high, ` +
    `${severityCounts.medium} medium, ${severityCounts.low} low\n`;

  const findingSections = result.findings
    .map(
      (f) =>
        `## [${f.severity.toUpperCase()}] ${f.name} (${f.id})\n\n` +
        `**Line ${f.line}:** \`${f.matchedText}\`\n\n` +
        `${f.description}\n\n` +
        `**Recommendation:** ${f.recommendation}`,
    )
    .join("\n\n---\n\n");

  return header + "\n" + findingSections + "\n";
}

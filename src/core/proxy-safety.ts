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
  isProxyContract: boolean;
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

const PROXY_CONTRACT_INDICATORS = [
  /\bis\s+(?:\w+\s*,\s*)*Proxy\b/,
  /import\s+\{[^}]*Proxy[^}]*\}\s+from\s+["'][^"']*\/proxy\/Proxy\.sol["']/,
  /\bfunction\s+_implementation\s*\(/,
  /\bfunction\s+_fallback\s*\(/,
  /\bfunction\s+_delegate\s*\(/,
  /\bis\s+(?:\w+\s*,\s*)*ERC1967Proxy\b/,
  /\bis\s+(?:\w+\s*,\s*)*TransparentUpgradeableProxy\b/,
  /\bis\s+(?:\w+\s*,\s*)*BeaconProxy\b/,
];

function detectUpgradeable(code: string): boolean {
  return UPGRADEABLE_INDICATORS.some((re) => re.test(code));
}

function detectIsProxyContract(code: string): boolean {
  return PROXY_CONTRACT_INDICATORS.some((re) => re.test(code));
}

function detectProxyPattern(code: string): ProxySafetyResult["proxyPattern"] {
  if (/\bproxiableUUID\b/.test(code) || /\bUUPSUpgradeable\b/.test(code)) return "UUPS";
  if (/\bTransparentUpgradeableProxy\b/.test(code) || /\b_admin\b/.test(code)) return "Transparent";
  if (/\bIBeacon\b/.test(code) || /\bBeaconProxy\b/.test(code)) return "Beacon";
  return "unknown";
}

function shouldApply(pattern: ProxyAntiPattern, isProxyContract: boolean): boolean {
  if (pattern.appliesTo === "both") return true;
  if (isProxyContract) return pattern.appliesTo === "proxy";
  return pattern.appliesTo === "implementation";
}

function matchAntiPatterns(code: string, isProxyContract: boolean): ProxySafetyFinding[] {
  const lines = code.split("\n");
  const findings: ProxySafetyFinding[] = [];
  const hasGap = /__gap/.test(code);

  for (const pattern of PROXY_ANTI_PATTERNS) {
    if (!shouldApply(pattern, isProxyContract)) continue;
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
    return { isUpgradeable: false, isProxyContract: false, proxyPattern: "none", findings: [] };
  }

  const isUpgradeable = detectUpgradeable(code);
  if (!isUpgradeable) {
    return { isUpgradeable: false, isProxyContract: false, proxyPattern: "none", findings: [] };
  }

  const isProxyContract = detectIsProxyContract(code);
  const proxyPattern = detectProxyPattern(code);
  const findings = matchAntiPatterns(code, isProxyContract);

  return { isUpgradeable, isProxyContract, proxyPattern, findings };
}

export function formatProxySafetyResult(result: ProxySafetyResult): string {
  if (!result.isUpgradeable) {
    return "No proxy/upgrade patterns detected. This contract does not appear to be upgradeable.";
  }

  const roleLabel = result.isProxyContract ? " (proxy contract)" : " (implementation contract)";

  if (result.findings.length === 0) {
    return (
      `# Proxy Safety Analysis\n\n` +
      `**Proxy Pattern:** ${result.proxyPattern}${roleLabel}\n\n` +
      `No proxy anti-patterns detected. The contract follows upgrade safety best practices.`
    );
  }

  const severityCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const f of result.findings) severityCounts[f.severity]++;

  const header =
    `# Proxy Safety Analysis\n\n` +
    `**Proxy Pattern:** ${result.proxyPattern}${roleLabel}\n` +
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

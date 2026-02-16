export interface FunctionAccessEntry {
  functionName: string;
  visibility: "public" | "external" | "internal" | "private" | "unknown";
  mutability: "view" | "pure" | "payable" | "nonpayable";
  modifiers: string[];
  inlineChecks: string[];
  accessLevel: "unrestricted" | "owner" | "role-based" | "custom" | "internal-only";
}

export interface AccessControlMatrix {
  contractName: string;
  functions: FunctionAccessEntry[];
  unprotectedExternalFunctions: string[];
  summary: { total: number; protected: number; unprotected: number; internalOnly: number };
}

const SOLIDITY_KEYWORDS = new Set([
  "returns",
  "override",
  "virtual",
  "view",
  "pure",
  "payable",
  "public",
  "external",
  "internal",
  "private",
]);

const OWNER_MODIFIERS = new Set(["onlyowner"]);
const ROLE_MODIFIERS = new Set(["onlyrole"]);
const UTILITY_MODIFIERS = new Set(["nonreentrant", "whennotpaused", "whenpaused"]);

function extractContractName(code: string): string {
  const match = code.match(/contract\s+(\w+)/);
  return match ? match[1] : "Unknown";
}

function classifyAccessLevel(
  visibility: FunctionAccessEntry["visibility"],
  modifiers: string[],
  inlineChecks: string[],
): FunctionAccessEntry["accessLevel"] {
  if (visibility === "internal" || visibility === "private") return "internal-only";

  const lowerMods = modifiers.map((m) => m.toLowerCase());

  if (lowerMods.some((m) => OWNER_MODIFIERS.has(m))) return "owner";
  if (lowerMods.some((m) => ROLE_MODIFIERS.has(m))) return "role-based";

  for (const check of inlineChecks) {
    const lower = check.toLowerCase();
    if (lower.includes("_checkowner")) return "owner";
    if (lower.includes("msg.sender == owner") || lower.includes("msg.sender != owner"))
      return "owner";
    if (lower.includes("_checkrole") || lower.includes("hasrole")) return "role-based";
    if (lower.includes("msg.sender")) return "custom";
  }

  const nonUtilityMods = lowerMods.filter((m) => !UTILITY_MODIFIERS.has(m));
  if (nonUtilityMods.length > 0) return "custom";

  return "unrestricted";
}

function extractInlineChecks(body: string): string[] {
  const checks: string[] = [];
  const requirePattern = /require\s*\([^)]*msg\.sender[^)]*\)/g;
  const revertPattern = /if\s*\([^)]*msg\.sender[^)]*\)\s*revert/g;
  const checkOwnerPattern = /_checkOwner\s*\(\s*\)/g;
  const checkRolePattern = /_checkRole\s*\([^)]*\)/g;
  const hasRolePattern = /hasRole\s*\([^)]*\)/g;

  for (const pattern of [
    requirePattern,
    revertPattern,
    checkOwnerPattern,
    checkRolePattern,
    hasRolePattern,
  ]) {
    for (const m of body.matchAll(pattern)) {
      checks.push(m[0]);
    }
  }
  return checks;
}

function extractFunctionBody(code: string, startIdx: number): string {
  let depth = 0;
  let bodyStart = -1;
  for (let i = startIdx; i < code.length; i++) {
    if (code[i] === "{") {
      if (depth === 0) bodyStart = i;
      depth++;
    } else if (code[i] === "}") {
      depth--;
      if (depth === 0) return code.slice(bodyStart, i + 1);
    }
  }
  return "";
}

function parseFunctions(code: string): FunctionAccessEntry[] {
  const entries: FunctionAccessEntry[] = [];
  const funcRegex = /function\s+(\w+)\s*\(([^)]*)\)\s*([^{]*)\{/g;

  for (const match of code.matchAll(funcRegex)) {
    const functionName = match[1];
    const signatureParts = match[3].trim();

    const visMatch = signatureParts.match(/\b(public|external|internal|private)\b/);
    const visibility = (visMatch ? visMatch[1] : "unknown") as FunctionAccessEntry["visibility"];

    let mutability: FunctionAccessEntry["mutability"] = "nonpayable";
    if (/\bview\b/.test(signatureParts)) mutability = "view";
    else if (/\bpure\b/.test(signatureParts)) mutability = "pure";
    else if (/\bpayable\b/.test(signatureParts)) mutability = "payable";

    const tokens = signatureParts
      .replace(/returns\s*\([^)]*\)/g, "")
      .split(/\s+/)
      .filter((t) => t.length > 0 && !SOLIDITY_KEYWORDS.has(t.toLowerCase()));
    const modifiers = tokens.filter((t) => /^\w+$/.test(t));

    const body = extractFunctionBody(code, match.index! + match[0].length - 1);
    const inlineChecks = extractInlineChecks(body);

    const accessLevel = classifyAccessLevel(visibility, modifiers, inlineChecks);
    entries.push({ functionName, visibility, mutability, modifiers, inlineChecks, accessLevel });
  }
  return entries;
}

export function analyzeAccessControl(code: string): AccessControlMatrix {
  const contractName = extractContractName(code);
  const functions = parseFunctions(code);

  const unprotectedExternalFunctions = functions
    .filter(
      (f) =>
        f.accessLevel === "unrestricted" &&
        (f.visibility === "public" || f.visibility === "external") &&
        f.mutability !== "view" &&
        f.mutability !== "pure",
    )
    .map((f) => f.functionName);

  const internalOnly = functions.filter((f) => f.accessLevel === "internal-only").length;
  const unprotected = unprotectedExternalFunctions.length;
  const protected_ = functions.length - internalOnly - unprotected;

  return {
    contractName,
    functions,
    unprotectedExternalFunctions,
    summary: { total: functions.length, protected: protected_, unprotected, internalOnly },
  };
}

export function formatAccessControlMatrix(matrix: AccessControlMatrix): string {
  const header = `# Access Control Matrix: ${matrix.contractName}\n\n`;

  const tableHeader =
    "| Function | Visibility | Mutability | Modifiers | Access Level |\n" +
    "| --- | --- | --- | --- | --- |\n";
  const rows = matrix.functions
    .map(
      (f) =>
        `| ${f.functionName} | ${f.visibility} | ${f.mutability} | ${f.modifiers.join(", ") || "none"} | ${f.accessLevel} |`,
    )
    .join("\n");

  const summary =
    `\n\n## Summary\n\n` +
    `- **Total functions:** ${matrix.summary.total}\n` +
    `- **Protected:** ${matrix.summary.protected}\n` +
    `- **Unprotected (state-changing):** ${matrix.summary.unprotected}\n` +
    `- **Internal only:** ${matrix.summary.internalOnly}\n`;

  const warnings =
    matrix.unprotectedExternalFunctions.length > 0
      ? `\n## ⚠ Unprotected State-Changing Functions\n\n` +
        matrix.unprotectedExternalFunctions.map((f) => `- \`${f}\``).join("\n") +
        "\n"
      : "";

  return header + tableHeader + rows + summary + warnings;
}

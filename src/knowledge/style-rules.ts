/**
 * Solidity Style Guide rules based on the official style guide:
 * https://docs.soliditylang.org/en/latest/style-guide.html
 */

export interface StyleViolation {
  ruleId: string;
  line: number;
  message: string;
  severity: "error" | "warning";
  fix?: string;
}

export interface StyleRule {
  id: string;
  name: string;
  description: string;
  check: (code: string, lines: string[]) => StyleViolation[];
}

function isInsideBlockComment(lines: string[], lineIndex: number): boolean {
  let inBlock = false;
  for (let i = 0; i < lineIndex; i++) {
    const line = lines[i];
    let j = 0;
    while (j < line.length) {
      if (!inBlock && j + 1 < line.length && line[j] === "/" && line[j + 1] === "*") {
        inBlock = true;
        j += 2;
      } else if (inBlock && j + 1 < line.length && line[j] === "*" && line[j + 1] === "/") {
        inBlock = false;
        j += 2;
      } else {
        j++;
      }
    }
  }
  return inBlock;
}

function isCommentOrEmpty(line: string): boolean {
  const trimmed = line.trim();
  return (
    trimmed === "" ||
    trimmed.startsWith("//") ||
    trimmed.startsWith("*") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*/")
  );
}

export const INDENTATION_RULE: StyleRule = {
  id: "style-indentation",
  name: "Indentation",
  description: "Use 4 spaces for indentation, not tabs",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.includes("\t")) {
        violations.push({
          ruleId: "style-indentation",
          line: i + 1,
          message: "Use 4 spaces for indentation instead of tabs",
          severity: "warning",
          fix: line.replace(/\t/g, "    "),
        });
      }
    }
    return violations;
  },
};

export const MAX_LINE_LENGTH_RULE: StyleRule = {
  id: "style-max-line-length",
  name: "Max Line Length",
  description: "Lines should not exceed 120 characters",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].length > 120) {
        violations.push({
          ruleId: "style-max-line-length",
          line: i + 1,
          message: `Line exceeds 120 characters (${lines[i].length} chars)`,
          severity: "warning",
          fix: "Break the line into multiple lines",
        });
      }
    }
    return violations;
  },
};

export const BLANK_LINES_RULE: StyleRule = {
  id: "style-blank-lines",
  name: "Blank Lines",
  description:
    "Two blank lines between top-level declarations, one between functions inside contract",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];
    const topLevelPattern = /^(contract|library|interface|abstract\s+contract)\s+/;

    let lastTopLevelEnd = -1;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (topLevelPattern.test(trimmed)) {
        if (lastTopLevelEnd >= 0) {
          let blankCount = 0;
          for (let j = lastTopLevelEnd + 1; j < i; j++) {
            if (lines[j].trim() === "") {
              blankCount++;
            }
          }
          if (blankCount < 2) {
            violations.push({
              ruleId: "style-blank-lines",
              line: i + 1,
              message: "Expected 2 blank lines before top-level declaration",
              severity: "warning",
              fix: "Add blank lines between top-level declarations",
            });
          }
        }
      }

      if (trimmed === "}" && !lines[i].startsWith(" ") && !lines[i].startsWith("\t")) {
        lastTopLevelEnd = i;
      }
    }
    return violations;
  },
};

export const IMPORT_ORDER_RULE: StyleRule = {
  id: "style-import-order",
  name: "Import Order",
  description: "Import statements should be at the top of the file, after pragma",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];
    let seenNonImport = false;
    let pastPragmaAndImports = false;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (
        trimmed === "" ||
        trimmed.startsWith("//") ||
        trimmed.startsWith("/*") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("*/")
      ) {
        continue;
      }

      if (trimmed.startsWith("pragma ") || trimmed.startsWith("// SPDX")) {
        continue;
      }

      if (trimmed.startsWith("import ")) {
        if (pastPragmaAndImports && seenNonImport) {
          violations.push({
            ruleId: "style-import-order",
            line: i + 1,
            message: "Import statements should be grouped at the top of the file",
            severity: "warning",
            fix: "Move this import to the top of the file after pragma",
          });
        }
      } else {
        if (!pastPragmaAndImports) {
          pastPragmaAndImports = true;
        }
        seenNonImport = true;
      }
    }
    return violations;
  },
};

export const FUNCTION_ORDER_RULE: StyleRule = {
  id: "style-function-order",
  name: "Function Ordering",
  description:
    "Functions should be ordered: constructor → receive → fallback → external (→ view → pure) → public (→ view → pure) → internal (→ view → pure) → private (→ view → pure)",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];

    const functionOrder: Record<string, number> = {
      constructor: 0,
      receive: 1,
      fallback: 2,
      external: 3,
      "external-view": 4,
      "external-pure": 5,
      public: 6,
      "public-view": 7,
      "public-pure": 8,
      internal: 9,
      "internal-view": 10,
      "internal-pure": 11,
      private: 12,
      "private-view": 13,
      "private-pure": 14,
    };

    const displayKey = (key: string): string => key.replace(/-/g, " ");

    const functionDefs: { visibility: string; line: number; order: number }[] = [];

    let inContract = false;
    let braceDepth = 0;

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      if (isInsideBlockComment(lines, i)) continue;

      if (/^(contract|library|interface|abstract\s+contract)\s+/.test(trimmed)) {
        inContract = true;
      }

      // Depth BEFORE counting this line's braces. A contract's direct members
      // (functions/constructor) start at depth 1; using the post-count depth
      // misses any member whose opening brace is on the declaration line.
      const depthAtLineStart = braceDepth;

      for (const ch of trimmed) {
        if (ch === "{") braceDepth++;
        if (ch === "}") braceDepth--;
      }

      if (braceDepth === 0 && inContract) {
        inContract = false;
        for (let j = 1; j < functionDefs.length; j++) {
          if (functionDefs[j].order < functionDefs[j - 1].order) {
            violations.push({
              ruleId: "style-function-order",
              line: functionDefs[j].line,
              message: `'${displayKey(functionDefs[j].visibility)}' function should come before '${displayKey(functionDefs[j - 1].visibility)}'`,
              severity: "warning",
              fix: `Reorder: constructor → receive → fallback → external (→ view → pure) → public (→ view → pure) → internal (→ view → pure) → private (→ view → pure)`,
            });
          }
        }
        functionDefs.length = 0;
        continue;
      }

      if (!inContract || depthAtLineStart !== 1) continue;

      if (/^\s*constructor\s*\(/.test(lines[i])) {
        functionDefs.push({ visibility: "constructor", line: i + 1, order: 0 });
        continue;
      }

      if (/^\s*receive\s*\(\s*\)/.test(lines[i])) {
        functionDefs.push({ visibility: "receive", line: i + 1, order: 1 });
        continue;
      }
      if (/^\s*fallback\s*\(/.test(lines[i])) {
        functionDefs.push({ visibility: "fallback", line: i + 1, order: 2 });
        continue;
      }

      const funcMatch = lines[i].match(/^\s*function\s+\w+\s*\(/);
      if (funcMatch) {
        const lineStr = lines[i];
        let visibility = "internal";
        if (/\bexternal\b/.test(lineStr)) visibility = "external";
        else if (/\bpublic\b/.test(lineStr)) visibility = "public";
        else if (/\binternal\b/.test(lineStr)) visibility = "internal";
        else if (/\bprivate\b/.test(lineStr)) visibility = "private";

        let mutability = "";
        if (/\bpure\b/.test(lineStr)) mutability = "pure";
        else if (/\bview\b/.test(lineStr)) mutability = "view";

        const orderKey = mutability ? `${visibility}-${mutability}` : visibility;

        functionDefs.push({
          visibility: orderKey,
          line: i + 1,
          order: functionOrder[orderKey] ?? 9,
        });
      }
    }

    for (let i = 1; i < functionDefs.length; i++) {
      if (functionDefs[i].order < functionDefs[i - 1].order) {
        violations.push({
          ruleId: "style-function-order",
          line: functionDefs[i].line,
          message: `'${displayKey(functionDefs[i].visibility)}' function should come before '${displayKey(functionDefs[i - 1].visibility)}'`,
          severity: "warning",
          fix: `Reorder: constructor → receive → fallback → external (→ view → pure) → public (→ view → pure) → internal (→ view → pure) → private (→ view → pure)`,
        });
      }
    }

    return violations;
  },
};

export const MODIFIER_ORDER_RULE: StyleRule = {
  id: "style-modifier-order",
  name: "Modifier Ordering",
  description: "Modifiers should be ordered: visibility → mutability → virtual → override → custom",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];

    const modifierOrder: Record<string, number> = {
      external: 0,
      public: 0,
      internal: 0,
      private: 0,
      pure: 1,
      view: 1,
      payable: 1,
      virtual: 2,
      override: 3,
    };

    for (let i = 0; i < lines.length; i++) {
      if (isInsideBlockComment(lines, i)) continue;

      const funcMatch = lines[i].match(/^\s*function\s+\w+\s*\([^)]*\)\s+(.+?)(?:\{|$)/);
      if (!funcMatch) continue;

      const modifiers = funcMatch[1].trim();
      const knownModifiers = [
        "external",
        "public",
        "internal",
        "private",
        "pure",
        "view",
        "payable",
        "virtual",
        "override",
      ];
      const found: { name: string; order: number; pos: number }[] = [];

      for (const mod of knownModifiers) {
        const regex = new RegExp(`\\b${mod}\\b`);
        const match = modifiers.match(regex);
        if (match && match.index !== undefined) {
          found.push({ name: mod, order: modifierOrder[mod] ?? 4, pos: match.index });
        }
      }

      found.sort((a, b) => a.pos - b.pos);

      for (let j = 1; j < found.length; j++) {
        if (found[j].order < found[j - 1].order) {
          violations.push({
            ruleId: "style-modifier-order",
            line: i + 1,
            message: `Modifier '${found[j].name}' should come before '${found[j - 1].name}'. Order: visibility → mutability → virtual → override`,
            severity: "warning",
            fix: `Reorder modifiers: visibility → mutability → virtual → override → custom`,
          });
          break;
        }
      }
    }

    return violations;
  },
};

export const NAMING_CONTRACT_RULE: StyleRule = {
  id: "style-naming-contract",
  name: "Naming: Contracts/Structs/Events/Enums",
  description: "Contracts, structs, events, and enums should use PascalCase",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];
    const pascalCase = /^[A-Z][a-zA-Z0-9]*$/;

    for (let i = 0; i < lines.length; i++) {
      if (isInsideBlockComment(lines, i)) continue;
      const trimmed = lines[i].trim();

      const patterns: { type: string; regex: RegExp }[] = [
        { type: "Contract", regex: /^(?:abstract\s+)?contract\s+(\w+)/ },
        { type: "Interface", regex: /^interface\s+(\w+)/ },
        { type: "Library", regex: /^library\s+(\w+)/ },
        { type: "Struct", regex: /^\s*struct\s+(\w+)/ },
        { type: "Event", regex: /^\s*event\s+(\w+)/ },
        { type: "Enum", regex: /^\s*enum\s+(\w+)/ },
      ];

      for (const { type, regex } of patterns) {
        const match = trimmed.match(regex);
        if (match && match[1] && !pascalCase.test(match[1])) {
          violations.push({
            ruleId: "style-naming-contract",
            line: i + 1,
            message: `${type} name '${match[1]}' should be PascalCase`,
            severity: "warning",
            fix: `Rename to ${match[1].charAt(0).toUpperCase() + match[1].slice(1)}`,
          });
        }
      }
    }
    return violations;
  },
};

export const NAMING_FUNCTION_RULE: StyleRule = {
  id: "style-naming-function",
  name: "Naming: Functions/Modifiers",
  description: "Functions and modifiers should use camelCase",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];
    const camelCase = /^[a-z_][a-zA-Z0-9]*$/;

    for (let i = 0; i < lines.length; i++) {
      if (isInsideBlockComment(lines, i)) continue;
      const trimmed = lines[i].trim();

      const funcMatch = trimmed.match(/^\s*function\s+(\w+)\s*\(/);
      if (funcMatch && funcMatch[1]) {
        const name = funcMatch[1];
        if (name !== "constructor" && name !== "receive" && name !== "fallback") {
          if (!camelCase.test(name)) {
            violations.push({
              ruleId: "style-naming-function",
              line: i + 1,
              message: `Function name '${name}' should be camelCase`,
              severity: "warning",
              fix: `Rename to ${name.charAt(0).toLowerCase() + name.slice(1)}`,
            });
          }
        }
      }

      const modMatch = trimmed.match(/^\s*modifier\s+(\w+)/);
      if (modMatch && modMatch[1]) {
        if (!camelCase.test(modMatch[1])) {
          violations.push({
            ruleId: "style-naming-function",
            line: i + 1,
            message: `Modifier name '${modMatch[1]}' should be camelCase`,
            severity: "warning",
            fix: `Rename to ${modMatch[1].charAt(0).toLowerCase() + modMatch[1].slice(1)}`,
          });
        }
      }
    }
    return violations;
  },
};

export const NAMING_CONSTANT_RULE: StyleRule = {
  id: "style-naming-constant",
  name: "Naming: Constants",
  description: "Constants should use UPPER_CASE_WITH_UNDERSCORES",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];
    // A single leading underscore is a valid private/internal visibility marker,
    // not a casing violation (e.g. `_VERSION`). Allow it before the UPPER_CASE body.
    const upperSnake = /^_?[A-Z][A-Z0-9_]*$/;

    for (let i = 0; i < lines.length; i++) {
      if (isInsideBlockComment(lines, i)) continue;

      const constMatch = lines[i].match(/\b(?:constant|immutable)\b.*?\s+(\w+)\s*[=;]/);
      if (constMatch && constMatch[1]) {
        const name = constMatch[1];
        if (!upperSnake.test(name)) {
          violations.push({
            ruleId: "style-naming-constant",
            line: i + 1,
            message: `Constant '${name}' should be UPPER_CASE_WITH_UNDERSCORES`,
            severity: "warning",
            fix: `Rename to ${name.replace(/([a-z])([A-Z])/g, "$1_$2").toUpperCase()}`,
          });
        }
      }
    }
    return violations;
  },
};

export const NAMING_VARIABLE_RULE: StyleRule = {
  id: "style-naming-variable",
  name: "Naming: Variables",
  description: "State variables should use camelCase (except constants)",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];
    const camelCase = /^_?[a-z][a-zA-Z0-9]*$/;
    const typePattern = /^\s*(?:mapping|uint\d*|int\d*|address|bool|string|bytes\d*)\b/;

    for (let i = 0; i < lines.length; i++) {
      if (isInsideBlockComment(lines, i)) continue;
      const trimmed = lines[i].trim();

      if (/\bconstant\b/.test(trimmed) || /\bimmutable\b/.test(trimmed)) continue;

      if (typePattern.test(trimmed)) {
        const varMatch = trimmed.match(
          /(?:mapping\s*\([^)]+\)|uint\d*|int\d*|address|bool|string|bytes\d*)\s+(?:public\s+|private\s+|internal\s+)?(\w+)\s*[=;]/,
        );
        if (varMatch && varMatch[1]) {
          if (!camelCase.test(varMatch[1])) {
            violations.push({
              ruleId: "style-naming-variable",
              line: i + 1,
              message: `Variable name '${varMatch[1]}' should be camelCase`,
              severity: "warning",
              fix: `Rename to ${varMatch[1].charAt(0).toLowerCase() + varMatch[1].slice(1)}`,
            });
          }
        }
      }
    }
    return violations;
  },
};

export const WHITESPACE_RULE: StyleRule = {
  id: "style-whitespace",
  name: "Whitespace",
  description: "No extra spaces inside parentheses or brackets",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (isInsideBlockComment(lines, i)) continue;
      if (isCommentOrEmpty(lines[i])) continue;

      const line = lines[i];

      if (/\(\s{2,}/.test(line) || /\[\s{2,}/.test(line)) {
        violations.push({
          ruleId: "style-whitespace",
          line: i + 1,
          message: "Avoid extra whitespace inside parentheses/brackets",
          severity: "warning",
          fix: "Remove extra spaces inside parentheses/brackets",
        });
      }

      if (/\s{2,}\)/.test(line) || /\s{2,}\]/.test(line)) {
        violations.push({
          ruleId: "style-whitespace",
          line: i + 1,
          message: "Avoid extra whitespace before closing parenthesis/bracket",
          severity: "warning",
          fix: "Remove extra spaces before closing parenthesis/bracket",
        });
      }
    }
    return violations;
  },
};

export const NATSPEC_RULE: StyleRule = {
  id: "style-natspec",
  name: "NatSpec Comments",
  description: "Public and external functions should have NatSpec documentation",
  check: (_code: string, lines: string[]): StyleViolation[] => {
    const violations: StyleViolation[] = [];

    for (let i = 0; i < lines.length; i++) {
      if (isInsideBlockComment(lines, i)) continue;

      const line = lines[i];
      const funcMatch = line.match(/^\s*function\s+(\w+)\s*\(/);
      if (!funcMatch) continue;

      const isPublicOrExternal = /\b(public|external)\b/.test(line);
      if (!isPublicOrExternal) continue;

      let hasNatSpec = false;
      for (let j = i - 1; j >= 0 && j >= i - 10; j--) {
        const prevLine = lines[j].trim();
        if (prevLine === "") continue;
        if (
          prevLine.startsWith("///") ||
          prevLine.startsWith("/**") ||
          prevLine.startsWith("*") ||
          prevLine.startsWith("*/")
        ) {
          hasNatSpec = true;
          break;
        }
        break;
      }

      if (!hasNatSpec) {
        violations.push({
          ruleId: "style-natspec",
          line: i + 1,
          message: `Function '${funcMatch[1]}' is public/external and should have NatSpec documentation`,
          severity: "warning",
          fix: `Add /// @notice above the function declaration`,
        });
      }
    }
    return violations;
  },
};

/**
 * All style rules
 */
export const STYLE_RULES: StyleRule[] = [
  INDENTATION_RULE,
  MAX_LINE_LENGTH_RULE,
  BLANK_LINES_RULE,
  IMPORT_ORDER_RULE,
  FUNCTION_ORDER_RULE,
  MODIFIER_ORDER_RULE,
  NAMING_CONTRACT_RULE,
  NAMING_FUNCTION_RULE,
  NAMING_CONSTANT_RULE,
  NAMING_VARIABLE_RULE,
  WHITESPACE_RULE,
  NATSPEC_RULE,
];

/**
 * Run all style rules against Solidity code
 */
export function checkAllRules(code: string): StyleViolation[] {
  const lines = code.split("\n");
  const violations: StyleViolation[] = [];

  for (const rule of STYLE_RULES) {
    violations.push(...rule.check(code, lines));
  }

  return violations.sort((a, b) => a.line - b.line);
}

/**
 * Format style violations for display
 */
export function formatStyleViolations(violations: StyleViolation[]): string {
  if (violations.length === 0) {
    return "No style violations found. Code follows the Solidity Style Guide.";
  }

  const header = `Found ${violations.length} style violation(s):\n`;

  const grouped = violations.reduce(
    (acc, v) => {
      if (!acc[v.ruleId]) acc[v.ruleId] = [];
      acc[v.ruleId].push(v);
      return acc;
    },
    {} as Record<string, StyleViolation[]>,
  );

  const body = Object.entries(grouped)
    .map(([ruleId, ruleViolations]) => {
      const ruleName = STYLE_RULES.find((r) => r.id === ruleId)?.name ?? ruleId;
      const header = `\n[${ruleId}] ${ruleName}:`;
      const items = ruleViolations
        .map(
          (v, i) =>
            `  ${i + 1}. [${v.severity.toUpperCase()}] Line ${v.line}: ${v.message}` +
            (v.fix ? `\n     Fix: ${v.fix}` : ""),
        )
        .join("\n");
      return header + "\n" + items;
    })
    .join("\n");

  return header + body;
}

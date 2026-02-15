export interface FunctionSignature {
  name: string;
  visibility: "public" | "external" | "internal" | "private";
  params: { name: string; type: string }[];
  returns: { name?: string; type: string }[];
  line: number;
  startLine: number;
}

export interface NatSpecIssue {
  functionName: string;
  line: number;
  missing: ("notice" | "param" | "return")[];
  severity: "error" | "warning";
}

export interface NatSpecDoc {
  notice?: string;
  params: Map<string, string>;
  returns?: string;
}

export function parseFunctions(code: string): FunctionSignature[] {
  const functions: FunctionSignature[] = [];

  const functionRegex =
    /function\s+(\w+)\s*\(([^)]*)\)\s+(public|external|internal|private)(?:\s+(?!returns\b)\w+)*(?:\s+returns\s*\(([^)]*)\))?/gs;

  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    const [, name, paramsStr, visibility, returnsStr] = match;

    const upToMatch = code.slice(0, match.index);
    const line = upToMatch.split("\n").length;

    const params: { name: string; type: string }[] = [];
    if (paramsStr.trim()) {
      const paramParts = paramsStr.split(",").map((p) => p.trim());
      for (const param of paramParts) {
        const paramMatch = param.match(/^(.+?)\s+(\w+)$/);
        if (paramMatch) {
          const [, type, paramName] = paramMatch;
          params.push({ name: paramName, type: type.trim() });
        }
      }
    }

    const returns: { name?: string; type: string }[] = [];
    if (returnsStr) {
      const returnParts = returnsStr.split(",").map((r) => r.trim());
      for (const ret of returnParts) {
        const retMatch = ret.match(/^(.+?)(?:\s+(\w+))?$/);
        if (retMatch) {
          const [, type, retName] = retMatch;
          returns.push({ type: type.trim(), name: retName });
        }
      }
    }

    functions.push({
      name,
      visibility: visibility as FunctionSignature["visibility"],
      params,
      returns,
      line,
      startLine: line,
    });
  }

  return functions;
}

export function extractNatSpec(code: string, functionLine: number): NatSpecDoc {
  const lines = code.split("\n");
  const doc: NatSpecDoc = {
    params: new Map(),
  };

  let i = functionLine - 2;
  const natspecLines: string[] = [];

  while (i >= 0) {
    const line = lines[i].trim();

    if (line.length === 0) {
      i--;
      continue;
    }

    if (line.startsWith("///")) {
      natspecLines.unshift(line.slice(3).trim());
      i--;
      continue;
    }

    if (line.includes("*/")) {
      const commentLines: string[] = [];
      let j = i;
      while (j >= 0) {
        const commentLine = lines[j].trim();
        commentLines.unshift(commentLine);
        if (commentLine.includes("/**")) {
          break;
        }
        j--;
      }

      const commentText = commentLines.join("\n");
      const cleanedLines = commentText
        .replace(/\/\*\*|\*\//g, "")
        .split("\n")
        .map((l) => l.replace(/^\s*\*\s?/, "").trim())
        .filter((l) => l.length > 0);

      natspecLines.unshift(...cleanedLines);
      i = j - 1;
      continue;
    }

    break;
  }

  for (const line of natspecLines) {
    if (line.startsWith("@notice")) {
      doc.notice = line.slice(7).trim();
    } else if (line.startsWith("@param")) {
      const paramMatch = line.match(/@param\s+(\w+)\s+(.+)/);
      if (paramMatch) {
        doc.params.set(paramMatch[1], paramMatch[2]);
      }
    } else if (line.startsWith("@return")) {
      doc.returns = line.slice(7).trim();
    }
  }

  return doc;
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

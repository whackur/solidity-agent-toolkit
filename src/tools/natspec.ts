import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export interface FunctionSignature {
  name: string;
  visibility: "public" | "external" | "internal" | "private";
  params: { name: string; type: string }[];
  returns: { name?: string; type: string }[];
  line: number;
  startLine: number; // Line where function declaration starts
}

export interface NatSpecIssue {
  functionName: string;
  line: number;
  missing: ("notice" | "param" | "return")[];
  severity: "error" | "warning";
}

export interface NatSpecDoc {
  notice?: string;
  params: Map<string, string>; // param name -> description
  returns?: string;
}

/**
 * Parse Solidity function signatures from code
 */
export function parseFunctions(code: string): FunctionSignature[] {
  const functions: FunctionSignature[] = [];

  // Regex to match function declarations
  // Matches: function name(...) visibility [modifiers] [returns (...)]
  const functionRegex =
    /function\s+(\w+)\s*\(([^)]*)\)\s+(public|external|internal|private)(?:\s+(?!returns\b)\w+)*(?:\s+returns\s*\(([^)]*)\))?/gs;

  let match;
  while ((match = functionRegex.exec(code)) !== null) {
    const [, name, paramsStr, visibility, returnsStr] = match;

    // Find line number
    const upToMatch = code.slice(0, match.index);
    const line = upToMatch.split("\n").length;

    // Parse parameters
    const params: { name: string; type: string }[] = [];
    if (paramsStr.trim()) {
      const paramParts = paramsStr.split(",").map((p) => p.trim());
      for (const param of paramParts) {
        // Match: type [storage] name
        const paramMatch = param.match(/^(.+?)\s+(\w+)$/);
        if (paramMatch) {
          const [, type, paramName] = paramMatch;
          params.push({ name: paramName, type: type.trim() });
        }
      }
    }

    // Parse return types
    const returns: { name?: string; type: string }[] = [];
    if (returnsStr) {
      const returnParts = returnsStr.split(",").map((r) => r.trim());
      for (const ret of returnParts) {
        // Match: type [name]
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

/**
 * Extract NatSpec documentation before a function
 */
export function extractNatSpec(code: string, functionLine: number): NatSpecDoc {
  const lines = code.split("\n");
  const doc: NatSpecDoc = {
    params: new Map(),
  };

  // Look backwards from function line for NatSpec comments
  let i = functionLine - 2; // Start from line before function (0-indexed)
  const natspecLines: string[] = [];

  while (i >= 0) {
    const line = lines[i].trim();

    // Skip empty lines
    if (line.length === 0) {
      i--;
      continue;
    }

    // Check for single-line NatSpec (///)
    if (line.startsWith("///")) {
      natspecLines.unshift(line.slice(3).trim());
      i--;
      continue;
    }

    // Check for multi-line NatSpec (/** */)
    if (line.includes("*/")) {
      // Found end of multi-line comment, collect until start
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

      // Parse multi-line comment
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

    // Stop at any non-NatSpec, non-empty line
    break;
  }

  // Parse NatSpec tags
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

/**
 * Validate NatSpec documentation for Solidity code
 */
export function validateNatSpec(code: string): NatSpecIssue[] {
  const functions = parseFunctions(code);
  const issues: NatSpecIssue[] = [];

  for (const func of functions) {
    // Only check public and external functions
    if (func.visibility !== "public" && func.visibility !== "external") {
      continue;
    }

    const natspec = extractNatSpec(code, func.startLine);
    const missing: ("notice" | "param" | "return")[] = [];

    // Check for @notice
    if (!natspec.notice) {
      missing.push("notice");
    }

    // Check for @param tags
    for (const param of func.params) {
      if (!natspec.params.has(param.name)) {
        missing.push("param");
        break; // Only report once per function
      }
    }

    // Check for @return tag
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

/**
 * Generate NatSpec templates for functions missing documentation
 */
export function generateNatSpec(code: string): string {
  const functions = parseFunctions(code);
  const lines = code.split("\n");
  const insertions: Map<number, string[]> = new Map();

  for (const func of functions) {
    // Only generate for public and external functions
    if (func.visibility !== "public" && func.visibility !== "external") {
      continue;
    }

    const natspec = extractNatSpec(code, func.startLine);
    const missing: string[] = [];

    // Check what's missing
    const needsNotice = !natspec.notice;
    const missingParams = func.params.filter((p) => !natspec.params.has(p.name));
    const needsReturn = func.returns.length > 0 && !natspec.returns;

    // Generate template lines
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
      // Find the line to insert before (the function declaration)
      const insertLine = func.startLine - 1; // 0-indexed
      insertions.set(insertLine, missing);
    }
  }

  // Apply insertions in reverse order to maintain line numbers
  const sortedInsertions = Array.from(insertions.entries()).sort((a, b) => b[0] - a[0]);

  for (const [lineIndex, natspecLines] of sortedInsertions) {
    // Get indentation from the function line
    const functionLine = lines[lineIndex];
    const indent = functionLine.match(/^(\s*)/)?.[1] || "";

    // Insert NatSpec lines with proper indentation
    const indentedLines = natspecLines.map((line) => indent + line);
    lines.splice(lineIndex, 0, ...indentedLines);
  }

  return lines.join("\n");
}

function formatValidationResults(issues: NatSpecIssue[]): string {
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

export function registerNatSpecTools(server: McpServer): void {
  server.tool(
    "validate_natspec",
    "Validate NatSpec documentation in Solidity code, checking for missing @notice, @param, and @return tags",
    {
      code: z.string().describe("Solidity source code to validate"),
    },
    async ({ code }) => {
      const issues = validateNatSpec(code);
      return {
        content: [{ type: "text" as const, text: formatValidationResults(issues) }],
        isError: false,
        _meta: { readOnlyHint: true },
      };
    },
  );

  server.tool(
    "generate_natspec",
    "Generate NatSpec documentation templates for functions missing documentation",
    {
      code: z.string().describe("Solidity source code to add NatSpec to"),
    },
    async ({ code }) => {
      const result = generateNatSpec(code);
      return {
        content: [
          {
            type: "text" as const,
            text: "Generated NatSpec templates:\n\n```solidity\n" + result + "\n```",
          },
        ],
        isError: false,
        _meta: { readOnlyHint: true },
      };
    },
  );
}

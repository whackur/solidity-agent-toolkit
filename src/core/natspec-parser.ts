export interface FunctionSignature {
  name: string;
  visibility: "public" | "external" | "internal" | "private";
  params: { name: string; type: string }[];
  returns: { name?: string; type: string }[];
  line: number;
  startLine: number;
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

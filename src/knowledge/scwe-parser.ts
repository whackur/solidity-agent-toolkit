import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { escapeRegex } from "./markdown-section.js";

export interface SCWEMappings {
  scsvsCg: string[];
  scsvsScg: string[];
  cwe: number[];
}

export interface SCWEExamples {
  vulnerable: string;
  fixed: string;
}

export interface SCWEEntry {
  id: string;
  title: string;
  alias: string[];
  platform: string[];
  profiles: string[];
  status: string;
  mappings: SCWEMappings;
  description: string;
  remediation: string;
  examples: SCWEExamples;
  relationships: string;
}

const DATA_ROOT = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  "../../data/owasp-scs/docs/SCWE",
);

function toStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  if (typeof val === "string" && val.length > 0) return [val];
  return [];
}

function toNumberArray(val: unknown): number[] {
  if (Array.isArray(val)) return val.map(Number).filter((n) => !Number.isNaN(n));
  if (typeof val === "number") return [val];
  return [];
}

/** Regex-based: extract content between `## <heading>` and next `## ` (or EOF). */
function extractSection(body: string, heading: string): string {
  const re = new RegExp(`^##\\s+${escapeRegex(heading)}\\b[^\\n]*`, "im");
  const match = re.exec(body);
  if (!match) return "";
  const start = match.index + match[0].length;
  const nextHeading = body.indexOf("\n## ", start);
  const slice = nextHeading === -1 ? body.slice(start) : body.slice(start, nextHeading);
  return slice.trim();
}

/** Heuristic: first solidity code block = vulnerable, second = fixed. */
function extractExamples(examplesSection: string): SCWEExamples {
  const codeBlockRe = /```(?:solidity)?\s*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = codeBlockRe.exec(examplesSection)) !== null) {
    blocks.push(m[1].trim());
  }

  return {
    vulnerable: blocks[0] ?? "",
    fixed: blocks[1] ?? "",
  };
}

function parseSCWEFile(filePath: string): SCWEEntry | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  const { data: fm, content: body } = matter(raw);
  const mappingsRaw = (fm.mappings ?? {}) as Record<string, unknown>;

  return {
    id: String(fm.id ?? ""),
    title: String(fm.title ?? ""),
    alias: toStringArray(fm.alias),
    platform: toStringArray(fm.platform),
    profiles: toStringArray(fm.profiles),
    status: String(fm.status ?? ""),
    mappings: {
      scsvsCg: toStringArray(mappingsRaw["scsvs-cg"]),
      scsvsScg: toStringArray(mappingsRaw["scsvs-scg"]),
      cwe: toNumberArray(mappingsRaw.cwe),
    },
    description: extractSection(body, "Description"),
    remediation: extractSection(body, "Remediation"),
    examples: extractExamples(extractSection(body, "Examples")),
    relationships: extractSection(body, "Relationships"),
  };
}

function discoverSCWEFiles(): string[] {
  const files: string[] = [];

  let categoryDirs: string[];
  try {
    categoryDirs = fs.readdirSync(DATA_ROOT);
  } catch {
    return files;
  }

  for (const dir of categoryDirs) {
    const dirPath = path.join(DATA_ROOT, dir);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    for (const entry of fs.readdirSync(dirPath)) {
      if (/^SCWE-\d+\.md$/.test(entry)) {
        files.push(path.join(dirPath, entry));
      }
    }
  }

  files.sort((a, b) => {
    const numA = parseInt(path.basename(a).match(/\d+/)?.[0] ?? "0", 10);
    const numB = parseInt(path.basename(b).match(/\d+/)?.[0] ?? "0", 10);
    return numA - numB;
  });

  return files;
}

let _cache: SCWEEntry[] | null = null;

export function loadAllSCWE(): SCWEEntry[] {
  if (_cache) return _cache;

  const files = discoverSCWEFiles();
  const entries: SCWEEntry[] = [];

  for (const f of files) {
    const entry = parseSCWEFile(f);
    if (entry && entry.id) {
      entries.push(entry);
    }
  }

  _cache = entries;
  return entries;
}

export function getSCWEById(id: string): SCWEEntry | undefined {
  return loadAllSCWE().find((e) => e.id.toUpperCase() === id.toUpperCase());
}

export function searchSCWE(query: string): SCWEEntry[] {
  const q = query.toLowerCase();
  return loadAllSCWE().filter((e) => {
    const haystack = [e.title, e.description, e.remediation, e.relationships]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function getScweByCwe(cweId: number): SCWEEntry[] {
  return loadAllSCWE().filter((e) => e.mappings.cwe.includes(cweId));
}

export function _resetCache(): void {
  _cache = null;
}

import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { escapeRegex } from "./markdown-section.js";
import { enrichTop10WithSCWE } from "./top10-scwe-mappings.js";

export interface SCTop10Examples {
  vulnerable: string;
  fixed: string;
}

export interface SCTop10Entry {
  id: string;
  title: string;
  description: string;
  examples: SCTop10Examples;
  caseStudies: string[];
  mitigations: string[];
  relatedSCWE: string[];
}

const DATA_ROOT = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  "../../data/owasp-scs/docs/sctop10",
);

const TOP10_FILE_RE = /^SC(\d{2})-.*\.md$/;

/** Regex-based: extract `### <heading>` section until next `### ` or `## ` (or EOF). */
function extractSubSection(body: string, heading: string): string {
  const re = new RegExp(`^###\\s+${escapeRegex(heading)}\\b[^\\n]*`, "im");
  const match = re.exec(body);
  if (!match) return "";
  const start = match.index + match[0].length;
  const nextH = /\n###?\s+/.exec(body.slice(start));
  const slice = nextH ? body.slice(start, start + nextH.index) : body.slice(start);
  return slice.trim();
}

/** Regex-based: find first `### ` section whose heading contains `pattern` (case-insensitive). */
function extractSubSectionByPattern(body: string, pattern: RegExp): string {
  const headingRe = /^(###\s+.+)$/gm;
  let m: RegExpExecArray | null;
  while ((m = headingRe.exec(body)) !== null) {
    if (pattern.test(m[1])) {
      const start = m.index + m[0].length;
      const nextH = /\n###?\s+/.exec(body.slice(start));
      const slice = nextH ? body.slice(start, start + nextH.index) : body.slice(start);
      return slice.trim();
    }
  }
  return "";
}

function extractFirstCodeBlock(section: string): string {
  const m = /```(?:solidity)?\s*\n([\s\S]*?)```/.exec(section);
  return m ? m[1].trim() : "";
}

function extractAllCodeBlocks(body: string): string[] {
  const re = /```(?:solidity)?\s*\n([\s\S]*?)```/g;
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    blocks.push(m[1].trim());
  }
  return blocks;
}

function extractBulletItems(section: string): string[] {
  return section
    .split("\n")
    .filter((l) => /^\s*-\s+/.test(l))
    .map((l) => l.replace(/^\s*-\s+/, "").trim())
    .filter(Boolean);
}

/**
 * Extract case study bullet items. Handles `### 2025 Case Study`, `### 2025 Case Studies`,
 * and `### 2025 Case Study: <title>` variants.
 */
function extractCaseStudies(body: string): string[] {
  const section = extractSubSectionByPattern(body, /###\s+\d{4}\s+Case\s+Stud/i);
  if (!section) return [];

  const studies: string[] = [];
  const lines = section.split("\n");
  let current = "";

  for (const line of lines) {
    if (/^\s*-\s+\*\*/.test(line)) {
      if (current) studies.push(current.trim());
      current = line.replace(/^\s*-\s+/, "");
    } else if (current && line.trim()) {
      current += " " + line.trim();
    } else if (current) {
      studies.push(current.trim());
      current = "";
    }
  }
  if (current) studies.push(current.trim());

  return studies.length > 0 ? studies : extractBulletItems(section);
}

function extractMitigations(body: string): string[] {
  const section = extractSubSection(body, "Best Practices & Mitigations");
  if (!section) return [];

  const bullets = extractBulletItems(section);
  if (bullets.length > 0) return bullets;

  const paragraphs = section
    .split(/\n\n+/)
    .map((p) => p.replace(/\n/g, " ").trim())
    .filter(Boolean);
  return paragraphs;
}

function extractExamples(body: string): SCTop10Examples {
  const vulnSection = extractSubSectionByPattern(body, /###\s+Example\s*\(?.*[Vv]ulnerable/i);
  const fixedSection = extractSubSectionByPattern(
    body,
    /###\s+Example\s*\(?.*(?:[Ff]ixed|[Ss]afe|[Hh]arden|[Mm]itigat|[Rr]obust|[Ss]ecure|RBAC)/i,
  );

  if (vulnSection || fixedSection) {
    return {
      vulnerable: extractFirstCodeBlock(vulnSection),
      fixed: extractFirstCodeBlock(fixedSection),
    };
  }

  const allBlocks = extractAllCodeBlocks(body);
  return {
    vulnerable: allBlocks[0] ?? "",
    fixed: allBlocks[1] ?? "",
  };
}

function parseSCTop10File(filePath: string): SCTop10Entry | null {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf-8");
  } catch {
    return null;
  }

  const { data: fm, content: body } = matter(raw);

  return {
    id: String(fm.id ?? ""),
    title: String(fm.title ?? ""),
    description: extractSubSection(body, "Description"),
    examples: extractExamples(body),
    caseStudies: extractCaseStudies(body),
    mitigations: extractMitigations(body),
    relatedSCWE: [],
  };
}

function discoverTop10Files(): string[] {
  let entries: string[];
  try {
    entries = fs.readdirSync(DATA_ROOT);
  } catch {
    return [];
  }

  return entries
    .filter((e) => TOP10_FILE_RE.test(e))
    .sort((a, b) => {
      const numA = parseInt(a.match(TOP10_FILE_RE)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(TOP10_FILE_RE)?.[1] ?? "0", 10);
      return numA - numB;
    })
    .map((e) => path.join(DATA_ROOT, e));
}

let _cache: SCTop10Entry[] | null = null;

export function loadAllTop10(): SCTop10Entry[] {
  if (_cache) return _cache;

  const files = discoverTop10Files();
  const entries: SCTop10Entry[] = [];

  for (const f of files) {
    const entry = parseSCTop10File(f);
    if (entry && entry.id) {
      entries.push(entry);
    }
  }

  _cache = enrichTop10WithSCWE(entries);
  return _cache;
}

export function getTop10ById(id: string): SCTop10Entry | undefined {
  return loadAllTop10().find((e) => e.id.toUpperCase() === id.toUpperCase());
}

export function searchTop10(query: string): SCTop10Entry[] {
  const q = query.toLowerCase();
  return loadAllTop10().filter((e) => {
    const haystack = [e.title, e.description, ...e.mitigations, ...e.caseStudies]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function _resetCache(): void {
  _cache = null;
}

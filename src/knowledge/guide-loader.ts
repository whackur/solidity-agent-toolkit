import fs from "node:fs";
import path from "node:path";
import { GUIDES } from "./guide-catalog.js";
import type { GuideEntry } from "./guide-catalog.js";
import { findPackageRoot } from "./package-root.js";

export interface GuideLoadResult {
  success: boolean;
  guide?: GuideEntry;
  content?: string;
  error?: string;
}

const contentCache = new Map<string, string>();

export function getGuideEntry(id: string): GuideEntry | undefined {
  return GUIDES.find((g) => g.id === id);
}

export function loadGuide(id: string): GuideLoadResult {
  const guide = getGuideEntry(id);
  if (!guide) {
    return {
      success: false,
      error: `Unknown guide "${id}". Available: ${GUIDES.map((g) => g.id).join(", ")}`,
    };
  }
  const cached = contentCache.get(id);
  if (cached !== undefined) return { success: true, guide, content: cached };

  try {
    const content = fs.readFileSync(path.join(findPackageRoot(), guide.file), "utf8");
    contentCache.set(id, content);
    return { success: true, guide, content };
  } catch (error) {
    return {
      success: false,
      guide,
      error: `Failed to read guide "${id}": ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export function formatGuideList(): string {
  const section = (kind: GuideEntry["kind"], heading: string): string =>
    `## ${heading}\n\n` +
    GUIDES.filter((g) => g.kind === kind)
      .map((g) => `- **${g.id}** — ${g.title}: ${g.description}`)
      .join("\n");
  return `# Solidity Guides\n\n${section("guide", "Guides")}\n\n${section("reference", "References")}\n`;
}

import type { SCTop10Entry } from "./top10-parser.js";

export const TOP10_SCWE_MAPPINGS: Record<string, string[]> = {
  SC01: ["SCWE-048", "SCWE-018", "SCWE-029", "SCWE-053"],
  SC02: ["SCWE-040"],
  SC03: ["SCWE-015"],
  SC04: ["SCWE-046", "SCWE-010"],
  SC05: ["SCWE-025", "SCWE-106"],
  SC06: ["SCWE-109", "SCWE-030"],
  SC07: ["SCWE-106"],
  SC08: ["SCWE-046", "SCWE-010", "SCWE-077"],
  SC09: ["SCWE-106"],
  SC10: ["SCWE-035", "SCWE-038", "SCWE-053"],
};

export function enrichTop10WithSCWE(entries: SCTop10Entry[]): SCTop10Entry[] {
  return entries.map((entry) => ({
    ...entry,
    relatedSCWE: TOP10_SCWE_MAPPINGS[entry.id] ?? [],
  }));
}

export function getScweIdsForTop10(id: string): string[] {
  return TOP10_SCWE_MAPPINGS[id.toUpperCase()] ?? [];
}

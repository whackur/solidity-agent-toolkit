import type { SCTop10Entry } from "./top10-parser.js";

export const TOP10_SCWE_MAPPINGS: Record<string, string[]> = {
  SC01: ["SCWE-016", "SCWE-017", "SCWE-049"],
  SC02: ["SCWE-012", "SCWE-015", "SCWE-083"],
  SC03: ["SCWE-028", "SCWE-029", "SCWE-030"],
  SC04: ["SCWE-101"],
  SC05: ["SCWE-143", "SCWE-122"],
  SC06: ["SCWE-048", "SCWE-042"],
  SC07: ["SCWE-047"],
  SC08: ["SCWE-046", "SCWE-102"],
  SC09: ["SCWE-047"],
  SC10: ["SCWE-005", "SCWE-117", "SCWE-118"],
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

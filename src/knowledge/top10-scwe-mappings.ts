import type { SCTop10Entry } from "./top10-parser.js";

export const TOP10_SCWE_MAPPINGS: Record<string, string[]> = {
  SC01: ["SCWE-016", "SCWE-018", "SCWE-049"],
  SC02: ["SCWE-067", "SCWE-083"],
  SC03: ["SCWE-028", "SCWE-029"],
  SC04: ["SCWE-046", "SCWE-101"],
  SC05: ["SCWE-143", "SCWE-145", "SCWE-091"],
  SC06: ["SCWE-048", "SCWE-004"],
  SC07: ["SCWE-047", "SCWE-124"],
  SC08: ["SCWE-046", "SCWE-137"],
  SC09: ["SCWE-047"],
  SC10: ["SCWE-005", "SCWE-098", "SCWE-099"],
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

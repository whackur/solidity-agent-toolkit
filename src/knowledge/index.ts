export type { SCWEEntry, SCWEMappings, SCWEExamples } from "./scwe-parser.js";
export { loadAllSCWE, getSCWEById, searchSCWE } from "./scwe-parser.js";

export type { SCTop10Entry, SCTop10Examples } from "./top10-parser.js";
export { loadAllTop10, getTop10ById, searchTop10 } from "./top10-parser.js";

export type { VulnerabilityPattern } from "./vulnerability-patterns.js";
export { VULNERABILITY_PATTERNS } from "./vulnerability-patterns.js";

import { searchSCWE } from "./scwe-parser.js";
import { searchTop10 } from "./top10-parser.js";
import type { SCWEEntry } from "./scwe-parser.js";
import type { SCTop10Entry } from "./top10-parser.js";

export type KnowledgeSearchResult =
  | { type: "scwe"; entry: SCWEEntry }
  | { type: "top10"; entry: SCTop10Entry };

export function searchKnowledge(query: string): KnowledgeSearchResult[] {
  const scweResults = searchSCWE(query).map(
    (entry): KnowledgeSearchResult => ({ type: "scwe", entry }),
  );
  const top10Results = searchTop10(query).map(
    (entry): KnowledgeSearchResult => ({ type: "top10", entry }),
  );
  return [...scweResults, ...top10Results];
}

export type { SCWEEntry, SCWEMappings, SCWEExamples } from "./scwe-parser.js";
export { loadAllSCWE, getSCWEById, searchSCWE } from "./scwe-parser.js";

export type { SCTop10Entry, SCTop10Examples } from "./top10-parser.js";
export { loadAllTop10, getTop10ById, searchTop10 } from "./top10-parser.js";

export type { VulnerabilityPattern } from "./vulnerability-patterns.js";
export { VULNERABILITY_PATTERNS } from "./vulnerability-patterns.js";

export type { AdversarialScenario, AdversarialCategory } from "./adversarial-scenarios.js";
export { ADVERSARIAL_SCENARIOS } from "./adversarial-scenarios.js";

export type { ContractFeaturePattern } from "./contract-features.js";
export { CONTRACT_FEATURE_PATTERNS } from "./contract-features.js";

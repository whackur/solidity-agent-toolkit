import { ADVERSARIAL_SCENARIOS, type AdversarialCategory } from "./adversarial-scenarios.js";

/**
 * Returns unique SCWE IDs associated with the given adversarial categories.
 * Derived from ADVERSARIAL_SCENARIOS which map attack vectors to SCWE entries.
 */
export function getScweIdsForCategories(categories: AdversarialCategory[]): string[] {
  const categorySet = new Set(categories);
  const scweIds = new Set<string>();

  for (const scenario of ADVERSARIAL_SCENARIOS) {
    if (categorySet.has(scenario.category)) {
      for (const id of scenario.scweIds) {
        scweIds.add(id);
      }
    }
  }

  return [...scweIds].sort();
}

/**
 * Returns all adversarial categories that reference a given SCWE ID.
 */
export function getCategoriesForScweId(scweId: string): AdversarialCategory[] {
  const categories = new Set<AdversarialCategory>();

  for (const scenario of ADVERSARIAL_SCENARIOS) {
    if (scenario.scweIds.includes(scweId)) {
      categories.add(scenario.category);
    }
  }

  return [...categories];
}

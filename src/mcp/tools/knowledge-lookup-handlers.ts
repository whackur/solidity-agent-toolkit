import {
  formatSearchResult,
  formatRemediationResult,
  searchAndFilterSCWE,
  getSCWEEntry,
} from "../../core/scwe-search.js";
import type { GuideId } from "../../knowledge/guide-catalog.js";
import { formatGuideList, loadGuide } from "../../knowledge/guide-loader.js";
import { errorResult, type ToolResult } from "./tool-result.js";

export interface VulnerabilityFilters {
  category?: string;
  cwe?: number;
  severity?: string;
}

export const SCWE_SEARCH_HINT =
  "Tip: pass `query` (keyword) or `vulnerabilityId` (e.g., SCWE-046) to search the OWASP SCWE vulnerability database.";

export function handleGuideList(): ToolResult {
  return {
    content: [{ type: "text" as const, text: `${formatGuideList()}\n\n${SCWE_SEARCH_HINT}` }],
    isError: false,
  };
}

export function handleGuide(topic: GuideId): ToolResult {
  const result = loadGuide(topic);
  if (!result.success || result.content === undefined) {
    return errorResult(result.error ?? `Guide "${topic}" unavailable`);
  }
  return { content: [{ type: "text" as const, text: result.content }], isError: false };
}

export function handleVulnerabilityLookup(vulnerabilityId: string): ToolResult {
  const entry = getSCWEEntry(vulnerabilityId);
  if (!entry) {
    return errorResult(
      `Vulnerability ID "${vulnerabilityId}" not found. Please use a valid SCWE ID (e.g., SCWE-046).`,
    );
  }
  return { content: [{ type: "text" as const, text: formatRemediationResult(entry) }] };
}

export function handleVulnerabilitySearch(
  query: string,
  filters?: VulnerabilityFilters,
): ToolResult {
  const results = searchAndFilterSCWE(query, filters);
  if (results.length === 0) {
    return {
      content: [
        { type: "text" as const, text: `No vulnerabilities found matching query: "${query}"` },
      ],
    };
  }
  const formattedResults = results.map(formatSearchResult).join("\n\n---\n\n");
  return {
    content: [
      {
        type: "text" as const,
        text: `Found ${results.length} vulnerability(ies) matching "${query}":\n\n${formattedResults}`,
      },
    ],
  };
}

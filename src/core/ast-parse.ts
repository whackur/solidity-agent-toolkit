import { parse } from "@solidity-parser/parser";
import type {
  SourceUnit,
  ContractDefinition,
  FunctionDefinition,
  PragmaDirective,
} from "@solidity-parser/parser/src/ast-types.js";

export type { SourceUnit, ContractDefinition, FunctionDefinition, PragmaDirective };

export interface ParseResult {
  ast: SourceUnit | null;
  parseError?: string;
}

/**
 * Simple LRU-ish cache keyed by code hash (content identity).
 * Avoids re-parsing identical code within the same process lifecycle.
 */
const cache = new Map<string, ParseResult>();
const MAX_CACHE = 32;

function cacheKey(code: string): string {
  // Fast identity: length + first/last 128 chars. Collisions are acceptable
  // because a collision just means we parsed an extra time.
  const head = code.slice(0, 128);
  const tail = code.slice(-128);
  return `${code.length}:${head}:${tail}`;
}

/**
 * Parse Solidity code tolerantly with location info. Returns cached result
 * if the same code was parsed before. On parse failure, returns
 * `{ ast: null, parseError }` — never throws.
 */
export function parseSolidity(code: string): ParseResult {
  const key = cacheKey(code);
  const cached = cache.get(key);
  if (cached) return cached;

  let result: ParseResult;
  try {
    const ast = parse(code, { tolerant: true, loc: true });
    result = { ast };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    result = { ast: null, parseError: message };
  }

  // Evict oldest entry when cache is full
  if (cache.size >= MAX_CACHE) {
    const oldest = cache.keys().next().value!;
    cache.delete(oldest);
  }
  cache.set(key, result);

  return result;
}

/** Reset cache — for testing only. */
export function _resetParseCache(): void {
  cache.clear();
}

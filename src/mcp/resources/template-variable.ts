import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";

export function requireTemplateVariable(variables: Variables, name: string): string {
  const raw = variables[name];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) {
    throw new Error(`Missing required parameter: ${name}`);
  }
  return value;
}

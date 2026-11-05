import type { GetPromptResult } from "@modelcontextprotocol/sdk/types.js";

export function userPrompt(text: string): GetPromptResult {
  return { messages: [{ role: "user", content: { type: "text", text } }] };
}

// MCP prompts have no system role, so system guidance is sent as a leading user message.
export function systemUserPrompt(system: string, user: string): GetPromptResult {
  return {
    messages: [
      { role: "user", content: { type: "text", text: `SYSTEM INSTRUCTIONS:\n${system}` } },
      { role: "user", content: { type: "text", text: user } },
    ],
  };
}

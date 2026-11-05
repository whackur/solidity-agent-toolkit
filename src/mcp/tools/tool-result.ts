export type ToolResult = {
  content: { type: "text"; text: string }[];
  isError?: boolean;
  _meta?: Record<string, unknown>;
};

export function errorResult(text: string): ToolResult {
  return { content: [{ type: "text" as const, text }], isError: true };
}

export function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

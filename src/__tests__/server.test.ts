import { describe, it, expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

describe("MCP Server", () => {
  it("should create server instance", () => {
    const server = new McpServer({
      name: "test-server",
      version: "1.0.0",
    });
    expect(server).toBeDefined();
  });
});

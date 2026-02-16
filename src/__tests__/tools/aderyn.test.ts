import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import { registerSecurityScanTools, type AderynFinding } from "../../mcp/tools/security-scan.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

vi.mock("child_process");

describe("Aderyn Tool", () => {
  let mockServer: McpServer;
  let registeredTools: Map<string, any>;

  beforeEach(() => {
    registeredTools = new Map();
    mockServer = {
      registerTool: vi.fn((name: string, config: any, handler: any) => {
        registeredTools.set(name, {
          description: config.description,
          schema: config.inputSchema,
          handler,
        });
      }),
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Tool Registration", () => {
    it("registers run_aderyn tool", () => {
      registerSecurityScanTools(mockServer);
      expect(registeredTools.has("run_security_scan")).toBe(true);
    });

    it("tool has correct description", () => {
      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      expect(tool.description).toContain("Aderyn");
      expect(tool.description).toContain("security");
    });

    it.skip("tool has readOnlyHint annotation", () => {
      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      expect(tool.schema.annotations?.readOnlyHint).toBe(true);
    });
  });

  describe("Aderyn Not Installed", () => {
    it("returns installation instructions when aderyn not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("aderyn not found");
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("not installed");
      expect(result.content[0].text).toContain("brew install");
      expect(result.content[0].text).toContain("cyfrin/tap/aderyn");
    });
  });

  describe("JSON Output Format", () => {
    it("parses aderyn json output correctly", async () => {
      const mockOutput = JSON.stringify({
        findings: [
          {
            detector: "UnprotectedInitialize",
            severity: "Critical",
            title: "Unprotected Initialize",
            description: "Initialize function is not protected",
            location: {
              file: "contracts/Token.sol",
              line: 42,
            },
          },
          {
            detector: "MissingZeroAddressCheck",
            severity: "High",
            title: "Missing Zero Address Check",
            description: "Function does not check for zero address",
            location: {
              file: "contracts/Token.sol",
              line: 15,
            },
          },
        ],
      });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "json" });

      expect(result.isError).toBeFalsy();
      const content = result.content[0].text;
      const parsed = JSON.parse(content);

      expect(parsed.summary.total).toBe(2);
      expect(parsed.summary.critical).toBe(1);
      expect(parsed.summary.high).toBe(1);
      expect(parsed.findings.length).toBe(2);
      expect(parsed.findings[0].detector).toBe("UnprotectedInitialize");
      expect(parsed.findings[0].severity).toBe("Critical");
    });

    it("includes summary statistics in json output", async () => {
      const mockOutput = JSON.stringify({
        findings: [
          {
            detector: "Critical1",
            severity: "Critical",
            title: "Critical Issue",
            description: "desc",
            location: { file: "test.sol", line: 1 },
          },
          {
            detector: "High1",
            severity: "High",
            title: "High Issue",
            description: "desc",
            location: { file: "test.sol", line: 2 },
          },
          {
            detector: "Medium1",
            severity: "Medium",
            title: "Medium Issue",
            description: "desc",
            location: { file: "test.sol", line: 3 },
          },
          {
            detector: "Low1",
            severity: "Low",
            title: "Low Issue",
            description: "desc",
            location: { file: "test.sol", line: 4 },
          },
        ],
      });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "json" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary).toEqual({
        total: 4,
        critical: 1,
        high: 1,
        medium: 1,
        low: 1,
      });
    });

    it("handles empty findings", async () => {
      const mockOutput = JSON.stringify({ findings: [] });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "json" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.total).toBe(0);
      expect(parsed.findings.length).toBe(0);
    });
  });

  describe("Markdown Output Format", () => {
    it("formats findings as markdown", async () => {
      const mockOutput = JSON.stringify({
        findings: [
          {
            detector: "UnprotectedInitialize",
            severity: "Critical",
            title: "Unprotected Initialize",
            description: "Initialize function is not protected",
            location: {
              file: "contracts/Token.sol",
              line: 42,
            },
          },
          {
            detector: "MissingZeroAddressCheck",
            severity: "High",
            title: "Missing Zero Address Check",
            description: "Function does not check for zero address",
            location: {
              file: "contracts/Token.sol",
              line: 15,
            },
          },
        ],
      });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "markdown" });

      const markdown = result.content[0].text;
      expect(markdown).toContain("# Aderyn Security Analysis Results");
      expect(markdown).toContain("Found 2 issue(s)");
      expect(markdown).toContain("## Critical");
      expect(markdown).toContain("## High");
      expect(markdown).toContain("Unprotected Initialize");
      expect(markdown).toContain("Missing Zero Address Check");
      expect(markdown).toContain("contracts/Token.sol:42");
      expect(markdown).toContain("contracts/Token.sol:15");
    });

    it("groups findings by severity in markdown", async () => {
      const mockOutput = JSON.stringify({
        findings: [
          {
            detector: "D1",
            severity: "Low",
            title: "Low Issue",
            description: "desc",
            location: { file: "test.sol", line: 1 },
          },
          {
            detector: "D2",
            severity: "Critical",
            title: "Critical Issue",
            description: "desc",
            location: { file: "test.sol", line: 2 },
          },
          {
            detector: "D3",
            severity: "Medium",
            title: "Medium Issue",
            description: "desc",
            location: { file: "test.sol", line: 3 },
          },
        ],
      });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "markdown" });

      const markdown = result.content[0].text;
      const criticalIndex = markdown.indexOf("## Critical");
      const mediumIndex = markdown.indexOf("## Medium");
      const lowIndex = markdown.indexOf("## Low");

      expect(criticalIndex).toBeLessThan(mediumIndex);
      expect(mediumIndex).toBeLessThan(lowIndex);
    });

    it("shows no findings message when empty", async () => {
      const mockOutput = JSON.stringify({ findings: [] });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "markdown" });

      const markdown = result.content[0].text;
      expect(markdown).toContain("No security findings detected");
    });
  });

  describe("Path Parameter", () => {
    it("uses provided path in command", async () => {
      const mockOutput = JSON.stringify({ findings: [] });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      await tool.handler({ tool: "aderyn", path: "/path/to/contracts" });

      const calls = vi.mocked(execSync).mock.calls;
      const analysisCall = calls.find(
        (c) => c[0].includes("aderyn") && c[0].includes("/path/to/contracts"),
      );
      expect(analysisCall).toBeDefined();
    });

    it("defaults to current directory when path not provided", async () => {
      const mockOutput = JSON.stringify({ findings: [] });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      await tool.handler({ tool: "aderyn" });

      const calls = vi.mocked(execSync).mock.calls;
      const analysisCall = calls.find((c) => c[0].includes("aderyn") && c[0].includes("."));
      expect(analysisCall).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    it("handles execution errors gracefully", async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        throw new Error("Analysis failed");
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn" });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error running Aderyn");
    });

    it("handles malformed json output", async () => {
      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return "invalid json {";
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "json" });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.summary.total).toBe(0);
      expect(parsed.findings.length).toBe(0);
    });
  });

  describe("Finding Structure", () => {
    it("preserves all finding fields", async () => {
      const mockOutput = JSON.stringify({
        findings: [
          {
            detector: "TestDetector",
            severity: "High",
            title: "Test Title",
            description: "Test Description",
            location: {
              file: "test.sol",
              line: 123,
            },
          },
        ],
      });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "json" });

      const parsed = JSON.parse(result.content[0].text);
      const finding = parsed.findings[0];

      expect(finding.detector).toBe("TestDetector");
      expect(finding.severity).toBe("High");
      expect(finding.title).toBe("Test Title");
      expect(finding.description).toBe("Test Description");
      expect(finding.location.file).toBe("test.sol");
      expect(finding.location.line).toBe(123);
    });

    it("handles missing fields with defaults", async () => {
      const mockOutput = JSON.stringify({
        findings: [
          {
            location: { file: "test.sol" },
          },
        ],
      });

      vi.mocked(execSync).mockImplementation((cmd: string) => {
        if (cmd.includes("--version")) return "aderyn 0.1.0";
        return mockOutput;
      });

      registerSecurityScanTools(mockServer);
      const tool = registeredTools.get("run_security_scan");
      const result = await tool.handler({ tool: "aderyn", outputFormat: "json" });

      const parsed = JSON.parse(result.content[0].text);
      const finding = parsed.findings[0];

      expect(finding.detector).toBe("Unknown");
      expect(finding.severity).toBe("Medium");
      expect(finding.title).toBe("Untitled Finding");
      expect(finding.description).toBe("");
      expect(finding.location.line).toBe(0);
    });
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { execSync } from "child_process";
import type { SolhintViolation } from "../../mcp/tools/solhint.js";

vi.mock("child_process");

describe("Solhint Tool", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("parseSolhintOutput", () => {
    it("parses valid solhint JSON output with violations", async () => {
      const mockOutput = JSON.stringify([
        {
          file: "contracts/Token.sol",
          reports: [
            {
              ruleId: "no-unused-vars",
              severity: "warning",
              message: "Variable is declared but never used",
              line: 10,
              column: 5,
            },
            {
              ruleId: "max-line-length",
              severity: "warning",
              message: "Line exceeds maximum length",
              line: 25,
              column: 120,
            },
          ],
        },
      ]);

      vi.mocked(execSync).mockReturnValue(mockOutput);

      const { parseSolhintOutput } = await import("../../mcp/tools/solhint.js");
      const violations = parseSolhintOutput(mockOutput);

      expect(violations).toHaveLength(2);
      expect(violations[0]).toEqual({
        ruleId: "no-unused-vars",
        severity: "warning",
        message: "Variable is declared but never used",
        line: 10,
        column: 5,
        file: "contracts/Token.sol",
        fix: undefined,
      });
      expect(violations[1]).toEqual({
        ruleId: "max-line-length",
        severity: "warning",
        message: "Line exceeds maximum length",
        line: 25,
        column: 120,
        file: "contracts/Token.sol",
        fix: undefined,
      });
    });

    it("handles empty violations array", async () => {
      const mockOutput = JSON.stringify([
        {
          file: "contracts/Safe.sol",
          reports: [],
        },
      ]);

      const { parseSolhintOutput } = await import("../../mcp/tools/solhint.js");
      const violations = parseSolhintOutput(mockOutput);

      expect(violations).toHaveLength(0);
    });

    it("sorts violations by file, line, and column", async () => {
      const mockOutput = JSON.stringify([
        {
          file: "contracts/B.sol",
          reports: [
            {
              ruleId: "rule1",
              severity: "error",
              message: "Error 1",
              line: 5,
              column: 1,
            },
          ],
        },
        {
          file: "contracts/A.sol",
          reports: [
            {
              ruleId: "rule2",
              severity: "warning",
              message: "Warning 1",
              line: 10,
              column: 5,
            },
          ],
        },
      ]);

      const { parseSolhintOutput } = await import("../../mcp/tools/solhint.js");
      const violations = parseSolhintOutput(mockOutput);

      expect(violations[0].file).toBe("contracts/A.sol");
      expect(violations[1].file).toBe("contracts/B.sol");
    });

    it("handles violations with fix suggestions", async () => {
      const mockOutput = JSON.stringify([
        {
          file: "contracts/Token.sol",
          reports: [
            {
              ruleId: "quotes",
              severity: "warning",
              message: "Use double quotes",
              line: 5,
              column: 10,
              fix: "double-quotes",
            },
          ],
        },
      ]);

      const { parseSolhintOutput } = await import("../../mcp/tools/solhint.js");
      const violations = parseSolhintOutput(mockOutput);

      expect(violations[0].fix).toBe("double-quotes");
    });

    it("throws error on invalid JSON", async () => {
      const { parseSolhintOutput } = await import("../../mcp/tools/solhint.js");

      expect(() => parseSolhintOutput("invalid json")).toThrow("Failed to parse solhint output");
    });

    it("handles missing optional fields with defaults", async () => {
      const mockOutput = JSON.stringify([
        {
          file: "contracts/Test.sol",
          reports: [
            {
              message: "Some error",
            },
          ],
        },
      ]);

      const { parseSolhintOutput } = await import("../../mcp/tools/solhint.js");
      const violations = parseSolhintOutput(mockOutput);

      expect(violations[0]).toEqual({
        ruleId: "unknown",
        severity: "warning",
        message: "Some error",
        line: 0,
        column: 0,
        file: "contracts/Test.sol",
        fix: undefined,
      });
    });
  });

  describe("checkSolhintInstalled", () => {
    it("returns true when solhint is installed", async () => {
      vi.mocked(execSync).mockReturnValue("solhint 3.4.0");

      const { checkSolhintInstalled } = await import("../../mcp/tools/solhint.js");
      const installed = checkSolhintInstalled();

      expect(installed).toBe(true);
      expect(execSync).toHaveBeenCalledWith("solhint --version", {
        stdio: "ignore",
      });
    });

    it("returns false when solhint is not installed", async () => {
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error("Command not found");
      });

      const { checkSolhintInstalled } = await import("../../mcp/tools/solhint.js");
      const installed = checkSolhintInstalled();

      expect(installed).toBe(false);
    });
  });

  describe("SOLHINT_RULES", () => {
    it("includes at least 20 common rules", async () => {
      const { SOLHINT_RULES } = await import("../../mcp/tools/solhint.js");

      expect(SOLHINT_RULES.length).toBeGreaterThanOrEqual(20);
    });

    it("all rules have required fields", async () => {
      const { SOLHINT_RULES } = await import("../../mcp/tools/solhint.js");

      for (const rule of SOLHINT_RULES) {
        expect(rule.name).toBeDefined();
        expect(rule.name.length).toBeGreaterThan(0);
        expect(rule.description).toBeDefined();
        expect(rule.description.length).toBeGreaterThan(0);
      }
    });

    it("includes critical security rules", async () => {
      const { SOLHINT_RULES } = await import("../../mcp/tools/solhint.js");

      const ruleNames = SOLHINT_RULES.map((r) => r.name);
      expect(ruleNames).toContain("no-tx-origin");
      expect(ruleNames).toContain("no-inline-assembly");
      expect(ruleNames).toContain("no-console");
    });

    it("includes style and naming convention rules", async () => {
      const { SOLHINT_RULES } = await import("../../mcp/tools/solhint.js");

      const ruleNames = SOLHINT_RULES.map((r) => r.name);
      expect(ruleNames).toContain("var-name-mixedcase");
      expect(ruleNames).toContain("func-name-mixedcase");
      expect(ruleNames).toContain("contract-name-camelcase");
      expect(ruleNames).toContain("const-name-snakecase");
    });

    it("rules are categorized", async () => {
      const { SOLHINT_RULES } = await import("../../mcp/tools/solhint.js");

      const categories = new Set(SOLHINT_RULES.map((r) => r.category));
      expect(categories.size).toBeGreaterThan(0);
      expect(categories).toContain("Security");
      expect(categories).toContain("Style");
      expect(categories).toContain("Best Practices");
    });
  });

  describe("formatViolations", () => {
    it("formats empty violations list", async () => {
      const { formatViolations } = await import("../../mcp/tools/solhint.js");

      const formatted = formatViolations([]);
      expect(formatted).toBe("No linting violations found.");
    });

    it("formats violations grouped by file", async () => {
      const { formatViolations } = await import("../../mcp/tools/solhint.js");

      const violations: SolhintViolation[] = [
        {
          ruleId: "no-unused-vars",
          severity: "warning",
          message: "Variable unused",
          line: 10,
          column: 5,
          file: "contracts/Token.sol",
        },
        {
          ruleId: "max-line-length",
          severity: "warning",
          message: "Line too long",
          line: 25,
          column: 120,
          file: "contracts/Token.sol",
        },
      ];

      const formatted = formatViolations(violations);

      expect(formatted).toContain("Found 2 linting violation(s)");
      expect(formatted).toContain("contracts/Token.sol");
      expect(formatted).toContain("no-unused-vars");
      expect(formatted).toContain("max-line-length");
      expect(formatted).toContain("Line 10:5");
      expect(formatted).toContain("Line 25:120");
    });

    it("includes severity in formatted output", async () => {
      const { formatViolations } = await import("../../mcp/tools/solhint.js");

      const violations: SolhintViolation[] = [
        {
          ruleId: "critical-rule",
          severity: "error",
          message: "Critical issue",
          line: 5,
          column: 1,
          file: "contracts/Test.sol",
        },
      ];

      const formatted = formatViolations(violations);

      expect(formatted).toContain("[ERROR]");
      expect(formatted).toContain("critical-rule");
    });
  });
});

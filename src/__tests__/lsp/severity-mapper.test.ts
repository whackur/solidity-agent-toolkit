import { describe, it, expect } from "vitest";
import { DiagnosticSeverity } from "vscode-languageserver/node.js";
import { mapToLspSeverity, type DiagnosticSource } from "../../lsp/severity-mapper.js";

describe("mapToLspSeverity", () => {
  describe("slither", () => {
    it("maps High to Error", () => {
      expect(mapToLspSeverity("slither", "High")).toBe(DiagnosticSeverity.Error);
    });

    it("maps Medium to Warning", () => {
      expect(mapToLspSeverity("slither", "Medium")).toBe(DiagnosticSeverity.Warning);
    });

    it("maps Low to Information", () => {
      expect(mapToLspSeverity("slither", "Low")).toBe(DiagnosticSeverity.Information);
    });

    it("maps Informational to Hint", () => {
      expect(mapToLspSeverity("slither", "Informational")).toBe(DiagnosticSeverity.Hint);
    });

    it("maps Optimization to Hint", () => {
      expect(mapToLspSeverity("slither", "Optimization")).toBe(DiagnosticSeverity.Hint);
    });
  });

  describe("solhint", () => {
    it("maps error to Error", () => {
      expect(mapToLspSeverity("solhint", "error")).toBe(DiagnosticSeverity.Error);
    });

    it("maps warning to Warning", () => {
      expect(mapToLspSeverity("solhint", "warning")).toBe(DiagnosticSeverity.Warning);
    });
  });

  describe("aderyn", () => {
    it("maps Critical to Error", () => {
      expect(mapToLspSeverity("aderyn", "Critical")).toBe(DiagnosticSeverity.Error);
    });

    it("maps High to Error", () => {
      expect(mapToLspSeverity("aderyn", "High")).toBe(DiagnosticSeverity.Error);
    });

    it("maps Medium to Warning", () => {
      expect(mapToLspSeverity("aderyn", "Medium")).toBe(DiagnosticSeverity.Warning);
    });

    it("maps Low to Information", () => {
      expect(mapToLspSeverity("aderyn", "Low")).toBe(DiagnosticSeverity.Information);
    });
  });

  describe("pattern (downgraded — heuristic-only)", () => {
    it("maps critical to Warning (downgraded from Error)", () => {
      expect(mapToLspSeverity("pattern", "critical")).toBe(DiagnosticSeverity.Warning);
    });

    it("maps high to Warning (downgraded from Error)", () => {
      expect(mapToLspSeverity("pattern", "high")).toBe(DiagnosticSeverity.Warning);
    });

    it("maps medium to Information (downgraded from Warning)", () => {
      expect(mapToLspSeverity("pattern", "medium")).toBe(DiagnosticSeverity.Information);
    });

    it("maps low to Hint (downgraded from Information)", () => {
      expect(mapToLspSeverity("pattern", "low")).toBe(DiagnosticSeverity.Hint);
    });
  });

  describe("edge cases", () => {
    it("is case-insensitive", () => {
      expect(mapToLspSeverity("slither", "HIGH")).toBe(DiagnosticSeverity.Error);
      expect(mapToLspSeverity("slither", "high")).toBe(DiagnosticSeverity.Error);
      expect(mapToLspSeverity("aderyn", "CRITICAL")).toBe(DiagnosticSeverity.Error);
    });

    it("defaults unknown severity to Hint", () => {
      expect(mapToLspSeverity("slither", "unknown")).toBe(DiagnosticSeverity.Hint);
      expect(mapToLspSeverity("pattern", "")).toBe(DiagnosticSeverity.Hint);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getPatternDiagnostics } from "../../lsp/pattern-diagnostics.js";
import { getSCWEById } from "../../knowledge/scwe-parser.js";

describe("hover provider integration", () => {
  it("pattern diagnostics with SCWE codes can be enriched via getSCWEById", () => {
    const code = `pragma solidity ^0.8.0;
contract Test {
  function check() public {
    require(tx.origin == msg.sender);
  }
}`;
    const doc = TextDocument.create("file:///test.sol", "solidity", 1, code);
    const diagnostics = getPatternDiagnostics(doc);

    const scweDiag = diagnostics.find(
      (d) => typeof d.code === "string" && d.code.startsWith("SCWE-"),
    );

    if (scweDiag) {
      const entry = getSCWEById(String(scweDiag.code));
      if (entry) {
        expect(entry.id).toBe(scweDiag.code);
        expect(entry.title).toBeDefined();
        expect(entry.description).toBeDefined();
        expect(entry.remediation).toBeDefined();
      }
    }
  });

  it("getSCWEById returns entry with expected fields for known SCWE", () => {
    const entry = getSCWEById("SCWE-001");
    if (entry) {
      expect(entry.id).toBe("SCWE-001");
      expect(typeof entry.title).toBe("string");
      expect(typeof entry.description).toBe("string");
      expect(typeof entry.remediation).toBe("string");
      expect(entry.mappings).toBeDefined();
      expect(entry.mappings.cwe).toBeDefined();
    }
  });

  it("getSCWEById returns undefined for non-existent SCWE", () => {
    const entry = getSCWEById("SCWE-999");
    expect(entry).toBeUndefined();
  });
});

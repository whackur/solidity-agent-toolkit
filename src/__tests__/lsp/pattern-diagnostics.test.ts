import { describe, it, expect } from "vitest";
import { DiagnosticSeverity } from "vscode-languageserver/node";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getPatternDiagnostics } from "../../lsp/pattern-diagnostics.js";

function createDocument(content: string): TextDocument {
  return TextDocument.create("file:///test.sol", "solidity", 1, content);
}

describe("getPatternDiagnostics", () => {
  it("returns empty array for empty document", () => {
    const doc = createDocument("");
    expect(getPatternDiagnostics(doc)).toEqual([]);
  });

  it("returns empty array for whitespace-only document", () => {
    const doc = createDocument("   \n\n  ");
    expect(getPatternDiagnostics(doc)).toEqual([]);
  });

  it("detects tx.origin usage", () => {
    const code = `pragma solidity ^0.8.0;
contract Test {
  function check() public {
    require(tx.origin == msg.sender);
  }
}`;
    const doc = createDocument(code);
    const diagnostics = getPatternDiagnostics(doc);

    const txOriginDiag = diagnostics.find((d) => String(d.code).startsWith("SCWE-"));
    expect(txOriginDiag).toBeDefined();
    if (txOriginDiag) {
      expect(txOriginDiag.source).toBe("solidity-patterns");
      expect(txOriginDiag.range.start.line).toBeGreaterThanOrEqual(0);
      expect(typeof txOriginDiag.code).toBe("string");
    }
  });

  it("diagnostics have correct structure", () => {
    const code = `pragma solidity ^0.8.0;
contract Test {
  function withdraw() public {
    msg.sender.call{value: address(this).balance}("");
  }
}`;
    const doc = createDocument(code);
    const diagnostics = getPatternDiagnostics(doc);

    for (const diag of diagnostics) {
      expect(diag.range).toBeDefined();
      expect(diag.range.start.line).toBeGreaterThanOrEqual(0);
      expect(diag.range.start.character).toBe(0);
      expect(diag.source).toBe("solidity-patterns");
      expect(diag.message).toBeDefined();
      expect(diag.severity).toBeDefined();
      expect([
        DiagnosticSeverity.Error,
        DiagnosticSeverity.Warning,
        DiagnosticSeverity.Information,
        DiagnosticSeverity.Hint,
      ]).toContain(diag.severity);
    }
  });

  it("vulnerable code produces more diagnostics than benign code", () => {
    const vulnerable = `pragma solidity ^0.8.0;
contract Vulnerable {
  function check() public {
    require(tx.origin == msg.sender);
    msg.sender.call{value: address(this).balance}("");
  }
}`;
    const benign = `pragma solidity ^0.8.0;
contract Benign {
  uint256 public value;
}`;
    const vulnDiags = getPatternDiagnostics(createDocument(vulnerable));
    const benignDiags = getPatternDiagnostics(createDocument(benign));
    expect(vulnDiags.length).toBeGreaterThan(benignDiags.length);
  });
});

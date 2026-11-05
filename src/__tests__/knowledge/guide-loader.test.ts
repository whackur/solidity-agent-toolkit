import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { GUIDES } from "../../knowledge/guide-catalog.js";
import { formatGuideList, loadGuide } from "../../knowledge/guide-loader.js";
import { findPackageRoot } from "../../knowledge/package-root.js";

describe("guide catalog", () => {
  it("has unique ids", () => {
    const ids = GUIDES.map((g) => g.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("maps every catalog entry to an existing file", () => {
    const root = findPackageRoot();
    for (const g of GUIDES) {
      expect(fs.existsSync(path.join(root, g.file)), g.file).toBe(true);
    }
  });

  it("catalogs every markdown file under guides/", () => {
    const root = findPackageRoot();
    const onDisk = fs
      .readdirSync(path.join(root, "guides"), { recursive: true })
      .map(String)
      .filter((f) => f.endsWith(".md"))
      .map((f) => `guides/${f.split(path.sep).join("/")}`)
      .sort();
    expect(onDisk).toEqual(GUIDES.map((g) => g.file).sort());
  });
});

describe("loadGuide", () => {
  it("loads guide markdown without frontmatter", () => {
    const result = loadGuide("code-review");
    expect(result.success).toBe(true);
    expect(result.content).toMatch(/^# Solidity Code Review/);
    expect(result.content).not.toMatch(/^---/);
  });

  it("returns an error result for unknown ids", () => {
    const result = loadGuide("nope");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown guide");
  });

  it("does not reference removed tool names", () => {
    const removed = [
      "run_slither",
      "run_aderyn",
      "run_solhint",
      "match_vulnerability_patterns",
      "dry_run_deploy",
      "get_remediation",
      "check_vulnerability",
      "validate_natspec",
      "format_code",
      "`check_style`",
      "scan_vulnerability_patterns",
      "search_vulnerabilities",
      "get_guide",
      "check_natspec",
      "check_code_style",
      "compile_contract",
      "run_tests",
      "analyze_gas",
      "manage_deployment",
    ];
    for (const g of GUIDES) {
      const content = loadGuide(g.id).content ?? "";
      for (const name of removed) {
        expect(content, `${g.id} mentions ${name}`).not.toContain(name);
      }
    }
  });
});

describe("formatGuideList", () => {
  it("lists guides and references", () => {
    const list = formatGuideList();
    expect(list).toContain("## Guides");
    expect(list).toContain("## References");
    for (const g of GUIDES) expect(list).toContain(g.id);
  });
});

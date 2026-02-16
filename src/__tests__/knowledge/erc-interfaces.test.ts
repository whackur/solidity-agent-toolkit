import { describe, it, expect } from "vitest";
import {
  ERC_STANDARDS,
  getERCStandard,
  getSupportedERCStandards,
} from "../../knowledge/erc-interfaces.js";

describe("ERC_STANDARDS", () => {
  it("contains all 4 standards", () => {
    expect(Object.keys(ERC_STANDARDS)).toEqual(["ERC20", "ERC721", "ERC1155", "ERC4626"]);
  });

  it("ERC20 has 6 functions and 2 events", () => {
    const spec = ERC_STANDARDS.ERC20;
    expect(spec.functions).toHaveLength(6);
    expect(spec.events).toHaveLength(2);
  });

  it("ERC721 has 9 functions and 3 events", () => {
    const spec = ERC_STANDARDS.ERC721;
    expect(spec.functions).toHaveLength(9);
    expect(spec.events).toHaveLength(3);
  });

  it("ERC1155 has 6 functions and 4 events", () => {
    const spec = ERC_STANDARDS.ERC1155;
    expect(spec.functions).toHaveLength(6);
    expect(spec.events).toHaveLength(4);
  });

  it("ERC4626 has 16 functions and 2 events", () => {
    const spec = ERC_STANDARDS.ERC4626;
    expect(spec.functions).toHaveLength(16);
    expect(spec.events).toHaveLength(2);
  });

  it("every function has valid mutability", () => {
    const validMutabilities = ["view", "pure", "nonpayable", "payable"];
    for (const [, spec] of Object.entries(ERC_STANDARDS)) {
      for (const fn of spec.functions) {
        expect(validMutabilities).toContain(fn.mutability);
      }
    }
  });

  it("every event has at least one input", () => {
    for (const [, spec] of Object.entries(ERC_STANDARDS)) {
      for (const evt of spec.events) {
        expect(evt.inputs.length).toBeGreaterThan(0);
      }
    }
  });

  it("ERC20 Transfer event has two indexed and one non-indexed input", () => {
    const transfer = ERC_STANDARDS.ERC20.events.find((e) => e.name === "Transfer")!;
    expect(transfer.inputs.filter((i) => i.indexed)).toHaveLength(2);
    expect(transfer.inputs.filter((i) => !i.indexed)).toHaveLength(1);
  });

  it("ERC721 has two safeTransferFrom overloads", () => {
    const overloads = ERC_STANDARDS.ERC721.functions.filter((f) => f.name === "safeTransferFrom");
    expect(overloads).toHaveLength(2);
    expect(overloads[0].inputs).toHaveLength(4);
    expect(overloads[1].inputs).toHaveLength(3);
  });
});

describe("getERCStandard", () => {
  it("returns markdown with interface block", () => {
    const content = getERCStandard("ERC20");
    expect(content).toContain("ERC-20 Token Standard");
    expect(content).toContain("```solidity");
    expect(content).toContain("interface IERC20");
  });

  it("is case-insensitive", () => {
    expect(getERCStandard("erc20")).toContain("ERC-20");
    expect(getERCStandard("Erc721")).toContain("ERC-721");
  });

  it("throws for unsupported standard", () => {
    expect(() => getERCStandard("ERC999")).toThrow("Unsupported ERC standard: ERC999");
  });
});

describe("getSupportedERCStandards", () => {
  it("returns all 4 standards with id, title, description", () => {
    const standards = getSupportedERCStandards();
    expect(standards).toHaveLength(4);
    for (const std of standards) {
      expect(std.id).toBeTruthy();
      expect(std.title).toBeTruthy();
      expect(std.description).toBeTruthy();
    }
  });

  it("includes ERC20 and ERC4626", () => {
    const ids = getSupportedERCStandards().map((s) => s.id);
    expect(ids).toContain("ERC20");
    expect(ids).toContain("ERC4626");
  });
});

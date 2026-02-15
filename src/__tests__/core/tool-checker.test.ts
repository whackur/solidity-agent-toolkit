import { describe, it, expect, vi, beforeEach } from "vitest";
import { execSync } from "child_process";
import { isCliAvailable } from "../../core/tool-checker.js";

vi.mock("child_process");

describe("isCliAvailable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true when command --version succeeds", () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from("forge 0.2.0"));

    const result = isCliAvailable("forge");

    expect(result).toBe(true);
    expect(execSync).toHaveBeenCalledWith("forge --version", { stdio: "ignore" });
  });

  it("returns false when command --version throws", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("Command not found");
    });

    const result = isCliAvailable("nonexistent");

    expect(result).toBe(false);
    expect(execSync).toHaveBeenCalledWith("nonexistent --version", { stdio: "ignore" });
  });

  it("returns true for slither when available", () => {
    vi.mocked(execSync).mockReturnValue(Buffer.from("0.10.0"));

    const result = isCliAvailable("slither");

    expect(result).toBe(true);
    expect(execSync).toHaveBeenCalledWith("slither --version", { stdio: "ignore" });
  });

  it("returns false for aderyn when not available", () => {
    vi.mocked(execSync).mockImplementation(() => {
      throw new Error("aderyn: command not found");
    });

    const result = isCliAvailable("aderyn");

    expect(result).toBe(false);
    expect(execSync).toHaveBeenCalledWith("aderyn --version", { stdio: "ignore" });
  });
});

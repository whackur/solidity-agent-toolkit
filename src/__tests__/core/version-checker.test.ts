import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isNewerVersion,
  formatUpdateMessage,
  checkForUpdates,
  notifyIfUpdateAvailable,
  getCurrentVersion,
  type VersionCheckResult,
} from "../../core/version-checker.js";

describe("isNewerVersion", () => {
  it("detects major version bump", () => {
    expect(isNewerVersion("0.2.0", "1.0.0")).toBe(true);
  });

  it("detects minor version bump", () => {
    expect(isNewerVersion("0.2.0", "0.3.0")).toBe(true);
  });

  it("detects patch version bump", () => {
    expect(isNewerVersion("0.2.0", "0.2.1")).toBe(true);
  });

  it("returns false when versions are equal", () => {
    expect(isNewerVersion("1.0.0", "1.0.0")).toBe(false);
  });

  it("returns false when current is newer", () => {
    expect(isNewerVersion("2.0.0", "1.9.9")).toBe(false);
  });

  it("handles missing patch segment", () => {
    expect(isNewerVersion("1.0", "1.0.1")).toBe(true);
  });
});

describe("formatUpdateMessage", () => {
  it("includes current and latest version", () => {
    const result: VersionCheckResult = {
      currentVersion: "0.1.0",
      latestVersion: "0.2.0",
      updateAvailable: true,
    };

    const msg = formatUpdateMessage(result);
    const plain = msg.replace(/\x1b\[[0-9;]*m/g, "");

    expect(plain).toContain("0.1.0");
    expect(plain).toContain("0.2.0");
    expect(plain).toContain("Update available");
    expect(plain).toContain("npm i -g solidity-agent-toolkit");
  });

  it("renders box borders", () => {
    const result: VersionCheckResult = {
      currentVersion: "0.1.0",
      latestVersion: "0.2.0",
      updateAvailable: true,
    };

    const msg = formatUpdateMessage(result);
    const plain = msg.replace(/\x1b\[[0-9;]*m/g, "");

    expect(plain).toContain("╭");
    expect(plain).toContain("╰");
    expect(plain).toContain("│");
  });
});

describe("getCurrentVersion", () => {
  it("returns a semver string from package.json", () => {
    const version = getCurrentVersion();
    expect(version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("checkForUpdates", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns updateAvailable true when registry has newer version", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ version: "99.0.0" }),
    } as Response);

    const result = await checkForUpdates();

    expect(result).not.toBeNull();
    expect(result!.updateAvailable).toBe(true);
    expect(result!.latestVersion).toBe("99.0.0");
  });

  it("returns updateAvailable false when already on latest", async () => {
    const current = getCurrentVersion();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ version: current }),
    } as Response);

    const result = await checkForUpdates();

    expect(result).not.toBeNull();
    expect(result!.updateAvailable).toBe(false);
  });

  it("throws on non-ok response", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response);

    await expect(checkForUpdates()).rejects.toThrow("npm registry returned 404");
  });
});

describe("notifyIfUpdateAvailable", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    stderrSpy.mockRestore();
  });

  it("writes to stderr when update is available", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ version: "99.0.0" }),
    } as Response);

    notifyIfUpdateAvailable();
    await vi.waitFor(() => expect(stderrSpy).toHaveBeenCalled());

    const output = stderrSpy.mock.calls[0][0] as string;
    const plain = output.replace(/\x1b\[[0-9;]*m/g, "");
    expect(plain).toContain("99.0.0");
  });

  it("does not write to stderr when already up to date", async () => {
    const current = getCurrentVersion();
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ version: current }),
    } as Response);

    notifyIfUpdateAvailable();
    await new Promise((r) => setTimeout(r, 50));

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("silently ignores network errors", async () => {
    vi.mocked(fetch).mockRejectedValue(new Error("network down"));

    notifyIfUpdateAvailable();
    await new Promise((r) => setTimeout(r, 50));

    expect(stderrSpy).not.toHaveBeenCalled();
  });
});

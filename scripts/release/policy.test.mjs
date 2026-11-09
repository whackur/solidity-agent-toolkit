import { describe, expect, it } from "vitest";
import { getPublishedIntegrity, waitForIntegrity } from "./registry.mjs";
import {
  assertNotBehindLatest,
  compareVersions,
  getPublishTag,
  shouldPublish,
  validateTag,
} from "./policy.mjs";

const response = (status, body = {}) => ({
  status,
  ok: status >= 200 && status < 300,
  json: async () => body,
});

describe("release policy", () => {
  it("requires an exact version tag on the event commit", () => {
    expect(() =>
      validateTag({
        tag: "v1.2.3",
        version: "1.2.3",
        eventSha: "abc",
        tagSha: "abc",
        checkoutSha: "abc",
      }),
    ).not.toThrow();
    expect(() =>
      validateTag({
        tag: "v1.2.4",
        version: "1.2.3",
        eventSha: "abc",
        tagSha: "abc",
        checkoutSha: "abc",
      }),
    ).toThrow(/Expected release tag/);
    expect(() =>
      validateTag({
        tag: "v1.2.3",
        version: "1.2.3",
        eventSha: "abc",
        tagSha: "def",
        checkoutSha: "abc",
      }),
    ).toThrow(/event commit/);
    expect(() =>
      validateTag({
        tag: "v1.2.3",
        version: "1.2.3",
        eventSha: "abc",
        tagSha: "abc",
        checkoutSha: "def",
      }),
    ).toThrow(/Checkout commit/);
  });

  it("routes prereleases to npm's next dist-tag", () => {
    expect(getPublishTag("1.2.3")).toBe("latest");
    expect(getPublishTag("1.2.3-rc.1")).toBe("next");
  });

  it("orders semantic versions including prereleases", () => {
    expect(compareVersions("1.0.0", "1.0.0-rc.1")).toBe(1);
    expect(compareVersions("1.0.0-rc.2", "1.0.0-rc.10")).toBe(-1);
    expect(compareVersions("1.2.0", "1.1.99")).toBe(1);
    expect(() => assertNotBehindLatest("1.2.3", "1.2.4")).toThrow(/Refusing to publish/);
    expect(() => assertNotBehindLatest("1.2.5", "1.2.4")).not.toThrow();
  });

  it("publishes only when no version exists and rejects different existing bytes", () => {
    expect(shouldPublish(null, "sha512-candidate")).toBe(true);
    expect(shouldPublish("sha512-candidate", "sha512-candidate")).toBe(false);
    expect(() => shouldPublish("sha512-existing", "sha512-candidate")).toThrow(/different bytes/);
  });

  it("treats only a missing version as unpublished", async () => {
    await expect(
      getPublishedIntegrity("pkg", "1.0.0", async () => response(404)),
    ).resolves.toBeNull();
    await expect(getPublishedIntegrity("pkg", "1.0.0", async () => response(503))).rejects.toThrow(
      /503/,
    );
    await expect(
      getPublishedIntegrity("pkg", "1.0.0", async () =>
        response(200, { dist: { integrity: "sha512-good" } }),
      ),
    ).resolves.toBe("sha512-good");
  });

  it("waits through transient 404s until the exact integrity appears", async () => {
    let time = 0;
    let calls = 0;
    await waitForIntegrity({
      packageName: "pkg",
      version: "1.0.0",
      integrity: "sha512-good",
      timeoutMs: 40,
      pollIntervalMs: 15,
      now: () => time,
      sleep: async (duration) => {
        time += duration;
      },
      fetchImpl: async () =>
        ++calls < 3 ? response(404) : response(200, { dist: { integrity: "sha512-good" } }),
    });
    expect(calls).toBe(3);
  });

  it("fails on integrity mismatch, registry errors, and visibility timeout", async () => {
    const options = {
      packageName: "pkg",
      version: "1.0.0",
      integrity: "sha512-good",
      timeoutMs: 1000,
    };
    await expect(
      waitForIntegrity({
        ...options,
        fetchImpl: async () => response(200, { dist: { integrity: "sha512-other" } }),
      }),
    ).rejects.toThrow(/integrity mismatch/);
    await expect(
      waitForIntegrity({ ...options, fetchImpl: async () => response(500) }),
    ).rejects.toThrow(/500/);
    await expect(
      waitForIntegrity({ ...options, timeoutMs: 0, fetchImpl: async () => response(404) }),
    ).rejects.toThrow(/Timed out/);
  });
});

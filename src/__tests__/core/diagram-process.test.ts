import process from "node:process";
import { describe, expect, it } from "vitest";
import { runDiagramProcess } from "../../core/diagram-process.js";

describe("runDiagramProcess", () => {
  it("launches Node with separate arguments and enforces the time limit", async () => {
    await expect(
      runDiagramProcess(process.execPath, ["-e", "setTimeout(() => {}, 10000)"], {
        timeoutMs: 30,
      }),
    ).rejects.toThrow("exceeded the 0.03-second time limit");
  });

  it("caps captured process output", async () => {
    await expect(
      runDiagramProcess(process.execPath, ["-e", "process.stdout.write('x'.repeat(1048577))"]),
    ).rejects.toThrow("output exceeded the 1 MiB process limit");
  });
});

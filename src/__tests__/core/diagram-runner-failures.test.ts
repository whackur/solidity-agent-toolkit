import { mkdtemp, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { runDiagramProcessMock } = vi.hoisted(() => ({ runDiagramProcessMock: vi.fn() }));

vi.mock("../../core/diagram-process.js", () => ({ runDiagramProcess: runDiagramProcessMock }));

import { generateDiagram } from "../../core/diagram-runner.js";

describe("generateDiagram process and artifact failures", () => {
  let testDirectory: string;
  let temporaryRoot: string;
  let sourceFile: string;
  let previousTmpdir: string | undefined;

  beforeAll(async () => {
    testDirectory = await mkdtemp(path.join(os.tmpdir(), "diagram-failure-test-"));
    temporaryRoot = path.join(testDirectory, "runtime-temp");
    await mkdir(temporaryRoot);
    previousTmpdir = process.env.TMPDIR;
    process.env.TMPDIR = temporaryRoot;
    sourceFile = path.join(testDirectory, "Fixture.sol");
    await writeFile(sourceFile, "contract Fixture {}\n");
  });

  afterAll(async () => {
    if (previousTmpdir === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = previousTmpdir;
    await rm(testDirectory, { recursive: true, force: true });
  });

  beforeEach(() => {
    runDiagramProcessMock.mockReset();
  });

  it("returns CLI failures as result errors and removes its temporary output directory", async () => {
    runDiagramProcessMock.mockRejectedValue(new Error("test CLI failure"));

    const result = await generateDiagram({ path: sourceFile });

    expect(result).toEqual({ success: false, error: "test CLI failure" });
    expect(await readdir(temporaryRoot)).toEqual([]);
  });

  it("returns an error when the CLI exits without an artifact and removes temporary output", async () => {
    runDiagramProcessMock.mockResolvedValue(undefined);

    const result = await generateDiagram({ path: sourceFile });

    expect(result).toEqual({
      success: false,
      error: "sol2uml-light completed without creating a diagram file",
    });
    expect(await readdir(temporaryRoot)).toEqual([]);
  });

  it("rejects artifacts larger than 5 MiB and cleans the temporary directory", async () => {
    runDiagramProcessMock.mockImplementation(async (_executable: string, args: string[]) => {
      const outputPath = args[args.indexOf("-o") + 1];
      await writeFile(outputPath, Buffer.alloc(5 * 1024 * 1024 + 1, 0x61));
    });

    const result = await generateDiagram({ path: sourceFile });

    expect(result).toEqual({ success: false, error: "Diagram artifact exceeds the 5 MiB limit" });
    expect(await readdir(temporaryRoot)).toEqual([]);
  });
});

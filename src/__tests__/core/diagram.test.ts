import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  readlink,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { generateDiagram } from "../../core/diagram-runner.js";

describe("generateDiagram", () => {
  let testDirectory: string;
  let sourceDirectory: string;
  let sourceFile: string;
  let temporaryRoot: string;
  let previousTmpdir: string | undefined;

  beforeAll(async () => {
    testDirectory = await mkdtemp(path.join(os.tmpdir(), "diagram-runner-test-"));
    temporaryRoot = path.join(testDirectory, "runtime-temp");
    await mkdir(temporaryRoot);
    previousTmpdir = process.env.TMPDIR;
    process.env.TMPDIR = temporaryRoot;
    sourceDirectory = path.join(testDirectory, "contracts $(touch injected);!");
    await mkdir(sourceDirectory);
    sourceFile = path.join(sourceDirectory, "Fixture 'quoted' $&.sol");
    await writeFile(
      sourceFile,
      [
        "// SPDX-License-Identifier: MIT",
        "pragma solidity ^0.8.20;",
        "contract DiagramFixture {",
        "    uint256 public totalSupply;",
        "    address public owner;",
        "    mapping(address => uint256) public balances;",
        "    uint256[4] public fixedValues;",
        "    uint256[] public history;",
        "    function mint(address account, uint256 amount) external {",
        "        totalSupply += amount;",
        "        balances[account] += amount;",
        "        history.push(amount);",
        "    }",
        "}",
        "",
      ].join("\n"),
    );
  });

  afterAll(async () => {
    if (previousTmpdir === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = previousTmpdir;
    await rm(testDirectory, { recursive: true, force: true });
  });

  it("returns the default overview as SVG and passes shell characters literally", async () => {
    const result = await generateDiagram({ path: sourceDirectory });

    expect(result.success).toBe(true);
    if (!result.success || result.format !== "svg") throw new Error("Expected an SVG diagram");
    expect(result.view).toBe("overview");
    expect(result.inputPath).toBe(sourceDirectory);
    expect(result.artifact).toMatch(/<svg[\s>]/i);
    expect(result.artifact).not.toContain("totalSupply");
    expect(result.artifact).not.toContain("mint");
    await expect(access(path.join(testDirectory, "injected"))).rejects.toThrow();
    expect(await readdir(temporaryRoot)).toEqual([]);
  });

  it("shows members in detailed class diagrams", async () => {
    const result = await generateDiagram({ path: sourceFile, view: "detailed" });

    expect(result.success).toBe(true);
    if (!result.success || result.format !== "svg") throw new Error("Expected an SVG diagram");
    expect(result.view).toBe("detailed");
    expect(result.artifact).toContain("totalSupply");
    expect(result.artifact).toContain("mint");
    expect(await readdir(temporaryRoot)).toEqual([]);
  });

  it("renders storage layout locally even when NODE_URL is set", async () => {
    const previousNodeUrl = process.env.NODE_URL;
    process.env.NODE_URL = "invalid://offline-proof";
    try {
      const result = await generateDiagram({
        path: sourceFile,
        view: "storage",
        contractName: "DiagramFixture",
      });

      expect(result.success).toBe(true);
      if (!result.success || result.format !== "svg") throw new Error("Expected an SVG diagram");
      expect(result.view).toBe("storage");
      expect(result.contractName).toBe("DiagramFixture");
      expect(result.artifact).toContain("balances");
      expect(result.artifact).toContain("totalSupply");
      expect(await readdir(temporaryRoot)).toEqual([]);
    } finally {
      if (previousNodeUrl === undefined) delete process.env.NODE_URL;
      else process.env.NODE_URL = previousNodeUrl;
    }
  });

  it("renders and saves PNG after creating the requested parent directory", async () => {
    const outputPath = path.join(testDirectory, "nested", "result.png");
    const result = await generateDiagram({ path: sourceFile, format: "png", outputPath });

    expect(result.success).toBe(true);
    if (!result.success || result.format !== "png") throw new Error("Expected a PNG diagram");
    expect(result.view).toBe("overview");
    expect(result.savedPath).toBe(outputPath);
    expect(result.artifact.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(await readFile(outputPath)).toEqual(result.artifact);
    expect(await readdir(temporaryRoot)).toEqual([]);
  });

  it("refuses to overwrite an existing file or symlink target", async () => {
    const existingPath = path.join(testDirectory, "keep.svg");
    await writeFile(existingPath, "keep this file");
    const overwrite = await generateDiagram({ path: sourceFile, outputPath: existingPath });
    expect(overwrite.success).toBe(false);
    expect(await readFile(existingPath, "utf8")).toBe("keep this file");

    const symlinkTarget = path.join(testDirectory, "symlink-target.svg");
    const symlinkPath = path.join(testDirectory, "symlink-output.svg");
    await writeFile(symlinkTarget, "keep symlink target");
    await symlink(symlinkTarget, symlinkPath);
    const symlinkResult = await generateDiagram({ path: sourceFile, outputPath: symlinkPath });
    expect(symlinkResult.success).toBe(false);
    expect(await readFile(symlinkTarget, "utf8")).toBe("keep symlink target");
    expect(await readlink(symlinkPath)).toBe(symlinkTarget);
    expect(await readdir(temporaryRoot)).toEqual([]);
  });

  it("rejects missing sources, unsupported source files, comma paths, and invalid mode arguments", async () => {
    const missing = await generateDiagram({ path: path.join(testDirectory, "missing.sol") });
    const unsupported = await generateDiagram({ path: path.join(testDirectory, "notes.txt") });
    const commaFile = path.join(testDirectory, "bad,name.sol");
    await writeFile(commaFile, "contract Invalid {}\n");
    const comma = await generateDiagram({ path: commaFile });
    const noContract = await generateDiagram({ path: sourceFile, view: "storage" });
    const extraContract = await generateDiagram({
      path: sourceFile,
      contractName: "DiagramFixture",
    });
    const invalidName = await generateDiagram({
      path: sourceFile,
      view: "storage",
      contractName: "--data",
    });
    const wrongExtension = await generateDiagram({
      path: sourceFile,
      outputPath: path.join(testDirectory, "wrong.png"),
    });

    expect(missing.success).toBe(false);
    expect(unsupported.success).toBe(false);
    expect(comma.success).toBe(false);
    expect(noContract.success).toBe(false);
    expect(extraContract.success).toBe(false);
    expect(invalidName.success).toBe(false);
    expect(wrongExtension.success).toBe(false);
    expect(await readdir(temporaryRoot)).toEqual([]);
  });

  it("supports concurrent renders with independent temporary outputs", async () => {
    const [first, second] = await Promise.all([
      generateDiagram({ path: sourceFile, view: "detailed" }),
      generateDiagram({ path: sourceFile, view: "overview" }),
    ]);

    expect(first.success).toBe(true);
    expect(second.success).toBe(true);
    expect(await readdir(temporaryRoot)).toEqual([]);
  });
});

import { constants } from "node:fs";
import { copyFile, lstat, mkdir, mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { runDiagramProcess } from "./diagram-process.js";
import type { DiagramFormat, DiagramRequest, DiagramResult, DiagramView } from "./diagram-types.js";

const require = createRequire(import.meta.url);
const SOL2UML_CLI = require.resolve("sol2uml-light/lib/sol2uml.js");
const TEMP_PREFIX = "solidity-agent-diagram-";
const ARTIFACT_LIMIT = 5 * 1024 * 1024;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export async function generateDiagram(request: DiagramRequest): Promise<DiagramResult> {
  let temporaryDirectory: string | undefined;

  try {
    const view = request.view ?? "overview";
    const format = request.format ?? "svg";
    const validationError = validateRequest(request, view, format);
    if (validationError) return { success: false, error: validationError };

    const inputPath = path.resolve(request.path);
    const inputError = await validateInputPath(inputPath);
    if (inputError) return { success: false, error: inputError };

    const outputPath = request.outputPath ? path.resolve(request.outputPath) : undefined;
    temporaryDirectory = await mkdtemp(path.join(os.tmpdir(), TEMP_PREFIX));
    const temporaryOutput = path.join(temporaryDirectory, `diagram.${format}`);
    const args = buildArguments(request, inputPath, view, format, temporaryOutput);
    const env = { ...process.env };
    delete env.NODE_URL;

    await runDiagramProcess(process.execPath, [SOL2UML_CLI, ...args], { env });
    const artifact = await readArtifact(temporaryOutput, format);

    if (outputPath) {
      await mkdir(path.dirname(outputPath), { recursive: true });
      await copyFile(temporaryOutput, outputPath, constants.COPYFILE_EXCL);
    }

    const metadata = {
      inputPath,
      view,
      ...(view === "storage" ? { contractName: request.contractName } : {}),
      ...(outputPath ? { savedPath: outputPath } : {}),
      byteLength: artifact.byteLength,
    };
    return format === "svg"
      ? { success: true, ...metadata, format, artifact: artifact.toString("utf8") }
      : { success: true, ...metadata, format, artifact };
  } catch (error) {
    return { success: false, error: describeError(error) };
  } finally {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}

function validateRequest(
  request: DiagramRequest,
  view: DiagramView,
  format: DiagramFormat,
): string | undefined {
  if (typeof request.path !== "string" || request.path.trim().length === 0) {
    return "path must be a non-empty local Solidity file or directory path";
  }
  if (request.path.includes("\0")) return "path must not contain a NUL character";
  if (!["overview", "detailed", "storage"].includes(view))
    return `Unsupported diagram view: ${view}`;
  if (!["svg", "png"].includes(format)) return `Unsupported diagram format: ${format}`;

  if (view === "storage") {
    if (
      typeof request.contractName !== "string" ||
      !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(request.contractName)
    ) {
      return "contractName is required for storage diagrams and must be a Solidity identifier";
    }
  } else if (request.contractName !== undefined) {
    return "contractName is only supported when view is storage";
  }

  if (request.outputPath !== undefined) {
    if (typeof request.outputPath !== "string" || request.outputPath.trim().length === 0) {
      return "outputPath must be a non-empty local file path";
    }
    if (request.outputPath.includes("\0")) return "outputPath must not contain a NUL character";
    const extension = path.extname(request.outputPath).toLowerCase();
    if (extension !== `.${format}`) return `outputPath must use the .${format} extension`;
  }

  return undefined;
}

async function validateInputPath(inputPath: string): Promise<string | undefined> {
  let inputStat;
  try {
    inputStat = await stat(inputPath);
  } catch {
    return `Local source path does not exist or cannot be read: ${inputPath}`;
  }

  if (inputPath.includes(",")) return "path must not contain a comma; pass one file or directory";
  if (inputStat.isDirectory()) return undefined;
  if (inputStat.isFile() && path.extname(inputPath).toLowerCase() === ".sol") return undefined;
  return "path must point to a directory or a single .sol file";
}

function buildArguments(
  request: DiagramRequest,
  inputPath: string,
  view: DiagramView,
  format: DiagramFormat,
  outputPath: string,
): string[] {
  const outputOptions = ["-f", format, "-o", outputPath];
  if (view === "storage") {
    return ["storage", "--contract", request.contractName!, ...outputOptions, inputPath];
  }
  if (view === "detailed") return ["class", ...outputOptions, inputPath];
  return [
    "class",
    "--hideVariables",
    "--hideFunctions",
    "--hideConstants",
    "--hideDepFunctions",
    "--clusterFolders",
    ...outputOptions,
    inputPath,
  ];
}

async function readArtifact(outputPath: string, format: DiagramFormat): Promise<Buffer> {
  let outputStat;
  try {
    outputStat = await lstat(outputPath);
  } catch {
    throw new Error("sol2uml-light completed without creating a diagram file");
  }
  if (!outputStat.isFile()) throw new Error("sol2uml-light output is not a regular file");
  if (outputStat.size === 0) throw new Error("sol2uml-light created an empty diagram file");
  if (outputStat.size > ARTIFACT_LIMIT) throw new Error("Diagram artifact exceeds the 5 MiB limit");

  const artifact = await readFile(outputPath);
  if (format === "svg") {
    if (!/<svg[\s>]/i.test(artifact.toString("utf8"))) {
      throw new Error("sol2uml-light output is not a valid SVG diagram");
    }
  } else if (!artifact.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("sol2uml-light output is not a valid PNG diagram");
  }
  return artifact;
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createDiagramArtifactUri(format: DiagramFormat): string {
  return `urn:solidity-agent-toolkit:diagram:${randomUUID()}.${format}`;
}

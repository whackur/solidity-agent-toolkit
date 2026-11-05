import {
  checkForgeInstalled,
  isFoundryProject,
  FORGE_INSTALL_INSTRUCTIONS,
  NOT_FOUNDRY_PROJECT_MESSAGE,
  runCompile,
  formatCompilationResult,
} from "../../core/compile.js";
import { runForgeInspect, formatInspectResult } from "../../core/contract-inspect.js";
import { runGasSnapshot, formatGasSnapshot } from "../../core/gas-snapshot.js";
import { runGasReport, formatGasEstimates } from "../../core/gas-report.js";
import { describeError, errorResult, type ToolResult } from "./tool-result.js";

function checkForgeProject(): ToolResult | null {
  if (!checkForgeInstalled()) return errorResult(FORGE_INSTALL_INSTRUCTIONS);
  if (!isFoundryProject()) return errorResult(NOT_FOUNDRY_PROJECT_MESSAGE);
  return null;
}

export function handleBuild(path?: string, contractName?: string): ToolResult {
  try {
    const prereq = checkForgeProject();
    if (prereq) return prereq;
    const result = runCompile(path, contractName);
    return { content: [{ type: "text" as const, text: formatCompilationResult(result) }] };
  } catch (error) {
    return errorResult(`Error during compilation: ${describeError(error)}`);
  }
}

export function handleInspect(
  contractName: string | undefined,
  inspect: "abi" | "bytecode" | "storage" | undefined,
): ToolResult {
  try {
    const prereq = checkForgeProject();
    if (prereq) return prereq;
    if (!contractName) {
      return errorResult(
        "❌ **Missing Parameter**\n\n`contractName` is required when using inspect mode.",
      );
    }
    if (!inspect) {
      return errorResult(
        "❌ **Missing Parameter**\n\n`inspect` (abi | bytecode | storage) is required for the inspect action.",
      );
    }
    const inspectResult = runForgeInspect(contractName, inspect);
    return {
      content: [{ type: "text" as const, text: formatInspectResult(inspectResult) }],
      ...(inspectResult.success ? {} : { isError: true }),
    };
  } catch (error) {
    return errorResult(`Error during compilation: ${describeError(error)}`);
  }
}

export function handleGasSnapshot(compare?: boolean): ToolResult {
  try {
    const prereq = checkForgeProject();
    if (prereq) return prereq;
    const result = runGasSnapshot(compare);
    if (!result.success) return errorResult(`❌ **Gas Snapshot Error**\n\n${result.error}`);
    return {
      content: [
        { type: "text" as const, text: formatGasSnapshot(result.snapshots, result.compare) },
      ],
    };
  } catch (error) {
    return errorResult(`Error analyzing gas: ${describeError(error)}`);
  }
}

export function handleGasReport(contractName?: string, functionName?: string): ToolResult {
  try {
    const prereq = checkForgeProject();
    if (prereq) return prereq;
    const result = runGasReport(contractName, functionName);
    if (!result.success) return errorResult(`❌ **Gas Report Error**\n\n${result.error}`);
    return { content: [{ type: "text" as const, text: formatGasEstimates(result.estimates) }] };
  } catch (error) {
    return errorResult(`Error analyzing gas: ${describeError(error)}`);
  }
}

import { execSync } from "child_process";
import { parseStorageLayout, formatStorageLayout } from "./storage-layout.js";

export interface InspectResult {
  success: boolean;
  mode: "abi" | "bytecode" | "storage";
  contractName: string;
  data?: string;
  error?: string;
}

export function runForgeInspect(
  contractName: string,
  mode: "abi" | "bytecode" | "storage",
): InspectResult {
  try {
    const output = execSync(`forge inspect ${contractName} ${mode}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });

    if (mode === "abi") {
      return parseAbiOutput(output, contractName);
    }

    if (mode === "bytecode") {
      return parseBytecodeOutput(output, contractName);
    }

    return parseStorageOutput(output, contractName);
  } catch (error: unknown) {
    const execErr = error as Error & { stderr?: string };
    const errorMessage = execErr.stderr || execErr.message || String(error);
    return {
      success: false,
      mode,
      contractName,
      error: errorMessage,
    };
  }
}

function parseAbiOutput(output: string, contractName: string): InspectResult {
  try {
    const abi = JSON.parse(output);
    return {
      success: true,
      mode: "abi",
      contractName,
      data: JSON.stringify(abi, null, 2),
    };
  } catch {
    return {
      success: false,
      mode: "abi",
      contractName,
      error: `Received non-JSON output from forge inspect:\n\n${output}`,
    };
  }
}

function parseBytecodeOutput(output: string, contractName: string): InspectResult {
  const bytecode = output.trim();
  if (!bytecode.startsWith("0x")) {
    return {
      success: false,
      mode: "bytecode",
      contractName,
      error: `Received unexpected output:\n\n${bytecode}`,
    };
  }
  return {
    success: true,
    mode: "bytecode",
    contractName,
    data: bytecode,
  };
}

function parseStorageOutput(output: string, contractName: string): InspectResult {
  const slots = parseStorageLayout(output);
  const formatted = formatStorageLayout(slots, contractName);
  return {
    success: true,
    mode: "storage",
    contractName,
    data: formatted,
  };
}

export function formatInspectResult(result: InspectResult): string {
  if (!result.success) {
    return (
      `❌ **Error Inspecting ${result.contractName}**\n\n${result.error}\n\n` +
      "Make sure the contract is compiled first:\n```bash\nforge build\n```"
    );
  }

  if (result.mode === "abi") {
    return `**ABI for ${result.contractName}:**\n\n\`\`\`json\n${result.data}\n\`\`\``;
  }

  if (result.mode === "bytecode") {
    const bytecodeSize = (result.data!.length - 2) / 2;
    return `**Bytecode for ${result.contractName}:**\n\n\`\`\`\n${result.data}\n\`\`\`\n\n**Size:** ${bytecodeSize} bytes`;
  }

  // storage — already formatted by formatStorageLayout
  return result.data!;
}

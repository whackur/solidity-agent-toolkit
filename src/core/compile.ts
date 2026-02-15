import { existsSync } from "fs";
import { isCliAvailable } from "./tool-checker.js";

export interface CompilationError {
  severity: string;
  message: string;
  formattedMessage?: string;
  sourceLocation?: {
    file: string;
    start: number;
    end: number;
  };
}

export interface CompilationResult {
  success: boolean;
  errors?: CompilationError[];
  warnings?: CompilationError[];
  contracts?: string[];
}

export function checkForgeInstalled(): boolean {
  return isCliAvailable("forge");
}

export function isFoundryProject(): boolean {
  return existsSync("foundry.toml");
}

export const FORGE_INSTALL_INSTRUCTIONS = `Forge is not installed. Please install Foundry:

**Installation:**
\`\`\`bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
\`\`\`

**Verify installation:**
\`\`\`bash
forge --version
\`\`\`

For more information, visit: https://book.getfoundry.sh/getting-started/installation`;

export function parseCompilationOutput(output: string | Buffer): CompilationResult {
  try {
    const outputStr = typeof output === "string" ? output : output.toString("utf-8");
    const lines = outputStr.trim().split("\n");
    const errors: CompilationError[] = [];
    const warnings: CompilationError[] = [];
    const contracts: Set<string> = new Set();

    for (const line of lines) {
      if (!line.trim()) continue;

      try {
        const json = JSON.parse(line);

        if (json.type === "diagnostic") {
          const diagnostic = json.data;
          const error: CompilationError = {
            severity: diagnostic.severity || "error",
            message: diagnostic.message || "",
            formattedMessage: diagnostic.formattedMessage,
          };

          if (diagnostic.sourceLocation) {
            error.sourceLocation = {
              file: diagnostic.sourceLocation.file || "",
              start: diagnostic.sourceLocation.start || 0,
              end: diagnostic.sourceLocation.end || 0,
            };
          }

          if (error.severity === "error") {
            errors.push(error);
          } else if (error.severity === "warning") {
            warnings.push(error);
          }
        }

        if (json.type === "contract") {
          const contractName = json.data?.name || json.contract;
          if (contractName) {
            contracts.add(contractName);
          }
        }
      } catch {
        // Non-JSON line in forge output — skip and continue parsing
        continue;
      }
    }

    return {
      success: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      contracts: contracts.size > 0 ? Array.from(contracts) : undefined,
    };
  } catch (error) {
    return {
      success: false,
      errors: [
        {
          severity: "error",
          message: `Failed to parse compilation output: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

export function formatCompilationResult(result: CompilationResult): string {
  let output = "";

  if (result.success) {
    output += "✅ **Compilation Successful**\n\n";

    if (result.contracts && result.contracts.length > 0) {
      output += `**Compiled Contracts:**\n`;
      for (const contract of result.contracts) {
        output += `- ${contract}\n`;
      }
      output += "\n";
    }

    if (result.warnings && result.warnings.length > 0) {
      output += `**Warnings (${result.warnings.length}):**\n`;
      for (const warning of result.warnings) {
        output += `\n⚠️  ${warning.message}\n`;
        if (warning.sourceLocation) {
          output += `   Location: ${warning.sourceLocation.file}\n`;
        }
      }
    }
  } else {
    output += "❌ **Compilation Failed**\n\n";

    if (result.errors && result.errors.length > 0) {
      output += `**Errors (${result.errors.length}):**\n`;
      for (const error of result.errors) {
        output += `\n🔴 ${error.message}\n`;
        if (error.sourceLocation) {
          output += `   Location: ${error.sourceLocation.file}\n`;
        }
        if (error.formattedMessage) {
          output += `\n${error.formattedMessage}\n`;
        }
      }
    }
  }

  return output;
}

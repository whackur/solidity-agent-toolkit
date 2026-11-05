import { execSync } from "child_process";
import { checkForgeInstalled } from "../../core/compile.js";
import { validateNatSpec, generateNatSpec, formatValidationResults } from "../../core/natspec.js";
import { checkAllRules, formatStyleViolations } from "../../knowledge/style-rules.js";
import { describeError, errorResult, type ToolResult } from "./tool-result.js";

function formatWithForge(code: string): ToolResult {
  if (!checkForgeInstalled()) {
    return errorResult(
      "forge fmt is not available. Install Foundry to use code formatting:\n\n" +
        "```bash\ncurl -L https://foundry.paradigm.xyz | bash\nfoundryup\n```",
    );
  }
  try {
    const formatted = execSync("forge fmt --raw -", {
      input: code,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return { content: [{ type: "text" as const, text: formatted }], isError: false };
  } catch (error: unknown) {
    const execErr = error as Error & { stderr?: string };
    const stderr = execErr.stderr || "";
    return errorResult(`forge fmt error: ${stderr || execErr.message || String(error)}`);
  }
}

export function handleStyleCheck(code: string, fix?: boolean): ToolResult {
  if (fix) return formatWithForge(code);
  try {
    const violations = checkAllRules(code);
    return {
      content: [{ type: "text" as const, text: formatStyleViolations(violations) }],
      isError: false,
    };
  } catch (error) {
    return errorResult(`Style check error: ${describeError(error)}`);
  }
}

export function handleNatSpecCheck(code: string, generate?: boolean): ToolResult {
  if (generate) {
    const result = generateNatSpec(code);
    return {
      content: [
        {
          type: "text" as const,
          text: "Generated NatSpec templates:\n\n```solidity\n" + result + "\n```",
        },
      ],
      isError: false,
      _meta: { readOnlyHint: true },
    };
  }
  const issues = validateNatSpec(code);
  return {
    content: [{ type: "text" as const, text: formatValidationResults(issues) }],
    isError: false,
    _meta: { readOnlyHint: true },
  };
}

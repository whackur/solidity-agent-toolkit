import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

const GAS_OPTIMIZATION_CHECKLIST = `
### Gas Optimization Checklist:

1. **Storage Packing**:
   - Use \`uint8\`, \`uint16\`, etc., only when multiple variables can fit into a single 32-byte slot.
   - Order struct members and state variables so they are packed into the same slot (e.g., group smaller types together).
   - Be aware that using types smaller than 32 bytes can sometimes cost *more* gas if they are not packed, due to the EVM operating on 32-byte words.

2. **Calldata vs Memory**:
   - Use \`calldata\` instead of \`memory\` for read-only function parameters in external functions.
   - \`calldata\` is cheaper as it avoids copying data to memory.

3. **Unchecked Arithmetic**:
   - In Solidity 0.8+, use \`unchecked { ... }\` for arithmetic operations where you are certain no overflow/underflow can occur (e.g., loop counters).
   - This saves gas by skipping the default overflow checks.

4. **Short-circuiting**:
   - Order logical conditions in \`if\` and \`require\` statements so that the cheapest or most likely to fail/succeed condition is evaluated first.
   - Use \`||\` and \`&&\` to avoid unnecessary computations.

5. **Events vs Storage**:
   - Use events to store data that is only needed off-chain.
   - Storing data in logs (events) is significantly cheaper than state variables.

6. **Immutable and Constant**:
   - Use \`constant\` for values known at compile time.
   - Use \`immutable\` for values set in the constructor that do not change thereafter.
   - Both avoid storage reads and are much cheaper.

7. **Loop Optimization**:
   - Cache array length in a local variable instead of reading it from storage/memory in every iteration.
   - Avoid state variable reads/writes inside loops; use local variables for intermediate calculations.
   - Consider using \`++i\` instead of \`i++\` (minor saving).

8. **Custom Errors vs Require Strings**:
   - Use \`error CustomError()\` and \`revert CustomError()\` instead of \`require(condition, "Long error string")\`.
   - Custom errors are much cheaper than string-based reverts, especially for long strings.

9. **Mapping vs Array**:
   - Use mappings for random access and to avoid expensive array shifts/deletions.
   - Use arrays only when iteration is strictly necessary.

10. **Batch Operations**:
    - Provide functions that perform multiple operations in a single transaction to reduce the per-transaction overhead (21,000 gas).
`;

function buildGasOptimizationPrompt(code: string, storageLayout?: string): string {
  let prompt = `You are a Solidity gas optimization expert. Analyze the following smart contract code and provide specific recommendations for reducing gas consumption.

### Contract Code:
\`\`\`solidity
${code}
\`\`\`

${GAS_OPTIMIZATION_CHECKLIST}
`;

  if (storageLayout) {
    prompt += `
### Storage Layout Analysis:
The following storage layout has been provided. Analyze it for potential packing improvements:
\`\`\`json
${storageLayout}
\`\`\`
- Check for wasted space in slots.
- Suggest reordering variables to maximize packing.
- Identify variables that could use smaller types if they fit in the same slot.
`;
  }

  prompt += `
### Instructions:
1. Review the code against each item in the checklist.
2. Provide specific, actionable recommendations for this contract.
3. If storage layout is provided, give a detailed analysis of slot usage.
4. Explain the estimated impact of each optimization.
`;

  return prompt;
}

export function registerGasOptimizationPrompts(server: McpServer) {
  server.prompt(
    "optimize_gas",
    "Analyze Solidity code for gas optimizations",
    {
      code: z.string().describe("The Solidity contract code to analyze"),
      storageLayout: z
        .string()
        .optional()
        .describe("Optional JSON storage layout for packing analysis"),
    },
    async ({ code, storageLayout }) => {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: buildGasOptimizationPrompt(code, storageLayout),
            },
          },
        ],
      };
    },
  );
}

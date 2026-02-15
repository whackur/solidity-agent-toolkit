export interface StorageSlot {
  slot: number;
  offset: number;
  type: string;
  variable: string;
  bytes: number;
}

export function parseStorageLayout(output: string): StorageSlot[] {
  try {
    const data = JSON.parse(output);
    const slots: StorageSlot[] = [];

    if (!data.storage || !Array.isArray(data.storage)) {
      return slots;
    }

    for (const item of data.storage) {
      slots.push({
        slot: parseInt(item.slot, 10),
        offset: item.offset || 0,
        type: item.type || "unknown",
        variable: item.label || item.name || "unknown",
        bytes: item.numberOfBytes ? parseInt(item.numberOfBytes, 10) : 0,
      });
    }

    return slots;
  } catch (error) {
    throw new Error(
      `Failed to parse storage layout: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

export function formatStorageLayout(slots: StorageSlot[], contractName: string): string {
  if (slots.length === 0) {
    return `⚠️  **No storage variables found in ${contractName}**\n\nThe contract may not have any state variables.`;
  }

  let output = `🗄️  **Storage Layout for ${contractName}**\n\n`;

  const bySlot = new Map<number, StorageSlot[]>();
  for (const slot of slots) {
    if (!bySlot.has(slot.slot)) {
      bySlot.set(slot.slot, []);
    }
    bySlot.get(slot.slot)!.push(slot);
  }

  output += "| Slot | Offset | Bytes | Type | Variable |\n";
  output += "|------|--------|-------|------|----------|\n";

  for (const [, variables] of Array.from(bySlot.entries()).sort((a, b) => a[0] - b[0])) {
    for (const variable of variables) {
      output += `| ${variable.slot} | ${variable.offset} | ${variable.bytes} | \`${variable.type}\` | \`${variable.variable}\` |\n`;
    }
  }

  output += "\n**Storage Packing Analysis:**\n\n";

  const packedSlots = Array.from(bySlot.entries()).filter(([, vars]) => vars.length > 1);
  const unpackedSlots = Array.from(bySlot.entries()).filter(([, vars]) => vars.length === 1);

  if (packedSlots.length > 0) {
    output += `✅ **Well-packed slots (${packedSlots.length}):**\n`;
    for (const [slotNum, variables] of packedSlots) {
      const totalBytes = variables.reduce((sum, v) => sum + v.bytes, 0);
      const varNames = variables.map((v) => v.variable).join(", ");
      output += `- Slot ${slotNum}: ${variables.length} variables (${totalBytes}/32 bytes) - ${varNames}\n`;
    }
    output += "\n";
  }

  const optimizationHints: string[] = [];

  for (const [slotNum, variables] of unpackedSlots) {
    if (variables.length === 1 && variables[0].bytes < 32) {
      const variable = variables[0];
      optimizationHints.push(
        `Slot ${slotNum}: \`${variable.variable}\` (${variable.bytes} bytes) could be packed with other small variables`,
      );
    }
  }

  const smallTypes = slots.filter((s) => s.bytes <= 8);
  if (smallTypes.length >= 2) {
    const unpackedSmall = smallTypes.filter((s) => {
      const slotVars = bySlot.get(s.slot) || [];
      return slotVars.length === 1;
    });

    if (unpackedSmall.length >= 2) {
      optimizationHints.push(
        `Consider grouping small variables (${unpackedSmall.map((s) => s.variable).join(", ")}) together to save storage slots`,
      );
    }
  }

  if (optimizationHints.length > 0) {
    output += "💡 **Optimization Hints:**\n";
    for (const hint of optimizationHints) {
      output += `- ${hint}\n`;
    }
    output += "\n";
  } else {
    output += "✅ **Storage layout is well-optimized!**\n\n";
  }

  output += "**Summary:**\n";
  output += `- Total storage slots used: ${bySlot.size}\n`;
  output += `- Total variables: ${slots.length}\n`;
  output += `- Packed slots: ${packedSlots.length}\n`;
  output += `- Storage cost: ~${bySlot.size * 20000} gas for initialization\n`;

  return output;
}

import type { DependencyGraph } from "./dependency-graph.js";

function mermaidNodeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_");
}

function buildMermaidDiagram(graph: DependencyGraph): string[] {
  const lines: string[] = ["```mermaid", "graph TD"];
  const definedNodes = new Set<string>();

  const nodeShapes: Record<string, (id: string, name: string) => string> = {
    contract: (id, name) => `  ${id}[${name}]`,
    interface: (id, name) => `  ${id}([${name}])`,
    library: (id, name) => `  ${id}{{${name}}}`,
    abstract: (id, name) => `  ${id}[/${name}/]`,
  };

  for (const c of graph.contracts) {
    const id = mermaidNodeId(c.name);
    const shapeFn = nodeShapes[c.kind] ?? nodeShapes.contract;
    lines.push(shapeFn(id, c.name));
    definedNodes.add(id);
  }

  for (const dep of graph.inheritance) {
    const childId = mermaidNodeId(dep.child);
    const parentId = mermaidNodeId(dep.parent);
    if (!definedNodes.has(parentId)) {
      lines.push(`  ${parentId}[${dep.parent}]`);
      definedNodes.add(parentId);
    }
    lines.push(`  ${childId} -->|inherits| ${parentId}`);
  }

  for (const lib of graph.libraries) {
    const libId = mermaidNodeId(lib.library);
    if (!definedNodes.has(libId)) {
      lines.push(`  ${libId}{{${lib.library}}}`);
      definedNodes.add(libId);
    }
    if (lib.inContract) {
      lines.push(`  ${mermaidNodeId(lib.inContract)} -.->|uses| ${libId}`);
    } else {
      for (const c of graph.contracts) {
        if (c.kind !== "library") {
          lines.push(`  ${mermaidNodeId(c.name)} -.->|uses| ${libId}`);
        }
      }
    }
  }

  for (const assoc of graph.associations) {
    const fromId = mermaidNodeId(assoc.from);
    const toId = mermaidNodeId(assoc.to);
    const label = assoc.associationType === "composition" ? "creates" : "references";
    lines.push(`  ${fromId} ==>|${label}| ${toId}`);
  }

  lines.push("```\n");
  return lines;
}

export function formatDependencyGraph(graph: DependencyGraph): string {
  const lines: string[] = ["# Contract Dependency Graph\n"];

  if (graph.parseError) {
    lines.push(`> **Parse Error**: ${graph.parseError}\n`);
  }

  lines.push(...buildMermaidDiagram(graph));

  lines.push("## Summary\n");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Contracts | ${graph.summary.totalContracts} |`);
  lines.push(`| Imports | ${graph.summary.totalImports} |`);
  lines.push(`| Inheritance | ${graph.summary.totalInheritance} |`);
  lines.push(`| Libraries | ${graph.summary.totalLibraries} |`);
  lines.push(`| Associations | ${graph.summary.totalAssociations} |`);
  lines.push(`| Max Inheritance Depth | ${graph.summary.maxInheritanceDepth} |`);
  lines.push(`| External Dependencies | ${graph.externalDependencies.length} |\n`);

  if (graph.contracts.length > 0) {
    lines.push("## Contracts\n");
    for (const c of graph.contracts) {
      lines.push(`- \`${c.name}\` (${c.kind}, line ${c.line})`);
    }
    lines.push("");
  }

  if (Object.keys(graph.linearization).length > 0) {
    lines.push("## C3 Linearization\n");
    for (const [contract, chain] of Object.entries(graph.linearization)) {
      if (chain.length > 1) {
        lines.push(`- \`${contract}\`: ${chain.join(" → ")}`);
      }
    }
    lines.push("");
  }

  if (graph.imports.length > 0) {
    lines.push("## Imports\n");
    for (const imp of graph.imports) {
      lines.push(`- Line ${imp.line}: \`${imp.source}\` (${imp.symbols.join(", ")})`);
    }
    lines.push("");
  }

  if (graph.inheritance.length > 0) {
    lines.push("## Inheritance\n");
    for (const dep of graph.inheritance) {
      lines.push(`- Line ${dep.line}: \`${dep.child}\` inherits \`${dep.parent}\``);
    }
    lines.push("");
  }

  if (graph.libraries.length > 0) {
    lines.push("## Library Usage\n");
    for (const lib of graph.libraries) {
      const scope = lib.inContract ? ` in \`${lib.inContract}\`` : " (file-level)";
      lines.push(`- Line ${lib.line}: \`${lib.library}\` for \`${lib.forType}\`${scope}`);
    }
    lines.push("");
  }

  if (graph.associations.length > 0) {
    lines.push("## Associations\n");
    for (const assoc of graph.associations) {
      const kind = assoc.associationType === "composition" ? "creates" : "references";
      lines.push(`- Line ${assoc.line}: \`${assoc.from}\` ${kind} \`${assoc.to}\``);
    }
    lines.push("");
  }

  if (graph.externalDependencies.length > 0) {
    lines.push("## External Dependencies\n");
    for (const dep of graph.externalDependencies) {
      lines.push(`- \`${dep}\``);
    }
    lines.push("");
  }

  return lines.join("\n");
}

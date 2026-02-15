export interface ImportDependency {
  type: "import";
  source: string;
  symbols: string[];
  line: number;
}

export interface InheritanceDependency {
  type: "inheritance";
  parent: string;
  child: string;
  line: number;
}

export interface LibraryUsage {
  type: "library";
  library: string;
  forType: string;
  line: number;
}

export type Dependency = ImportDependency | InheritanceDependency | LibraryUsage;

export interface DependencyGraph {
  imports: ImportDependency[];
  inheritance: InheritanceDependency[];
  libraries: LibraryUsage[];
  externalDependencies: string[];
  summary: {
    totalImports: number;
    totalInheritance: number;
    totalLibraries: number;
    maxInheritanceDepth: number;
  };
}

export function extractDependencies(code: string): DependencyGraph {
  const imports: ImportDependency[] = [];
  const inheritance: InheritanceDependency[] = [];
  const libraries: LibraryUsage[] = [];
  const externalDependencies: string[] = [];

  const lines = code.split("\n");

  // Extract imports
  const namedImportRegex = /import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["']\s*;/g;
  const aliasedImportRegex = /import\s+(\w+)\s+from\s*["']([^"']+)["']\s*;/g;
  const directImportRegex = /import\s+["']([^"']+)["']\s*;/g;

  lines.forEach((line, index) => {
    const lineNumber = index + 1;

    // Named imports: import {A, B} from "..."
    const namedMatches = [...line.matchAll(namedImportRegex)];
    namedMatches.forEach((m) => {
      const symbols = m[1].split(",").map((s) => s.trim());
      const source = m[2];
      imports.push({ type: "import", source, symbols, line: lineNumber });
      if (source.startsWith("@")) {
        externalDependencies.push(source);
      }
    });

    // Aliased imports: import Foo from "..."
    const aliasedMatches = [...line.matchAll(aliasedImportRegex)];
    aliasedMatches.forEach((m) => {
      const symbols = [m[1]];
      const source = m[2];
      imports.push({ type: "import", source, symbols, line: lineNumber });
      if (source.startsWith("@")) {
        externalDependencies.push(source);
      }
    });

    // Direct imports: import "..."
    const directMatches = [...line.matchAll(directImportRegex)];
    directMatches.forEach((m) => {
      const source = m[1];
      // Skip if already matched by named or aliased
      const alreadyMatched =
        namedMatches.some((nm) => nm[2] === source) ||
        aliasedMatches.some((am) => am[2] === source);
      if (!alreadyMatched) {
        imports.push({ type: "import", source, symbols: ["*"], line: lineNumber });
        if (source.startsWith("@")) {
          externalDependencies.push(source);
        }
      }
    });

    // Library usage: using Lib for Type;
    const libraryRegex = /using\s+(\w+)\s+for\s+([^;]+);/g;
    const libraryMatches = [...line.matchAll(libraryRegex)];
    libraryMatches.forEach((m) => {
      libraries.push({ type: "library", library: m[1], forType: m[2].trim(), line: lineNumber });
    });
  });

  // Extract inheritance (multi-line aware)
  const inheritanceRegex = /(?:contract|interface|abstract\s+contract)\s+(\w+)\s+is\s+([^{]+)\{/gs;
  let match;
  while ((match = inheritanceRegex.exec(code)) !== null) {
    const child = match[1];
    const parentsStr = match[2];
    const parents = parentsStr.split(",").map((p) => p.trim());

    // Find line number
    const beforeMatch = code.substring(0, match.index);
    const lineNumber = beforeMatch.split("\n").length;

    parents.forEach((parent) => {
      inheritance.push({ type: "inheritance", parent, child, line: lineNumber });
    });
  }

  // Calculate max inheritance depth
  const inheritanceDepths = new Map<string, number>();
  inheritance.forEach((dep) => {
    const current = inheritanceDepths.get(dep.child) || 0;
    inheritanceDepths.set(dep.child, current + 1);
  });
  const maxInheritanceDepth =
    inheritanceDepths.size > 0 ? Math.max(...inheritanceDepths.values()) : 0;

  return {
    imports,
    inheritance,
    libraries,
    externalDependencies: [...new Set(externalDependencies)],
    summary: {
      totalImports: imports.length,
      totalInheritance: inheritance.length,
      totalLibraries: libraries.length,
      maxInheritanceDepth,
    },
  };
}

export function formatDependencyGraph(graph: DependencyGraph): string {
  const lines: string[] = [];

  lines.push("# Contract Dependency Graph\n");

  // Mermaid diagram
  lines.push("```mermaid");
  lines.push("graph TD");

  // Add inheritance edges
  graph.inheritance.forEach((dep) => {
    lines.push(`  ${dep.child} -->|inherits| ${dep.parent}`);
  });

  // Add import edges (deduplicated by source)
  const importSources = new Set<string>();
  graph.imports.forEach((imp) => {
    if (!importSources.has(imp.source)) {
      importSources.add(imp.source);
      // Extract contract name from source if possible
      const sourceName = imp.source.split("/").pop()?.replace(".sol", "") || imp.source;
      lines.push(`  Contract -.->|imports| "${sourceName}"`);
    }
  });

  // Add library usage edges
  graph.libraries.forEach((lib) => {
    lines.push(`  Contract -.->|uses| ${lib.library}`);
  });

  lines.push("```\n");

  // Summary table
  lines.push("## Summary\n");
  lines.push("| Metric | Count |");
  lines.push("|--------|-------|");
  lines.push(`| Total Imports | ${graph.summary.totalImports} |`);
  lines.push(`| Total Inheritance | ${graph.summary.totalInheritance} |`);
  lines.push(`| Total Libraries | ${graph.summary.totalLibraries} |`);
  lines.push(`| Max Inheritance Depth | ${graph.summary.maxInheritanceDepth} |`);
  lines.push(`| External Dependencies | ${graph.externalDependencies.length} |\n`);

  // Details
  if (graph.imports.length > 0) {
    lines.push("## Imports\n");
    graph.imports.forEach((imp) => {
      const symbolsStr = imp.symbols.join(", ");
      lines.push(`- Line ${imp.line}: \`${imp.source}\` (${symbolsStr})`);
    });
    lines.push("");
  }

  if (graph.inheritance.length > 0) {
    lines.push("## Inheritance\n");
    graph.inheritance.forEach((dep) => {
      lines.push(`- Line ${dep.line}: \`${dep.child}\` inherits \`${dep.parent}\``);
    });
    lines.push("");
  }

  if (graph.libraries.length > 0) {
    lines.push("## Library Usage\n");
    graph.libraries.forEach((lib) => {
      lines.push(`- Line ${lib.line}: \`${lib.library}\` for \`${lib.forType}\``);
    });
    lines.push("");
  }

  if (graph.externalDependencies.length > 0) {
    lines.push("## External Dependencies\n");
    graph.externalDependencies.forEach((dep) => {
      lines.push(`- \`${dep}\``);
    });
    lines.push("");
  }

  return lines.join("\n");
}

import { parseSolidityDependencies } from "./dependency-parser.js";
import type { ContractInfo, AssociationDependency } from "./dependency-parser.js";
import { computeC3Linearization, computeMaxInheritanceDepth } from "./dependency-linearization.js";

export type { ContractInfo, AssociationDependency } from "./dependency-parser.js";
export { formatDependencyGraph } from "./dependency-format.js";

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
  inContract?: string;
  line: number;
}

export type Dependency = ImportDependency | InheritanceDependency | LibraryUsage;

export interface DependencyGraph {
  imports: ImportDependency[];
  inheritance: InheritanceDependency[];
  libraries: LibraryUsage[];
  contracts: ContractInfo[];
  associations: AssociationDependency[];
  linearization: Record<string, string[]>;
  externalDependencies: string[];
  parseError?: string;
  summary: {
    totalImports: number;
    totalInheritance: number;
    totalLibraries: number;
    totalContracts: number;
    totalAssociations: number;
    maxInheritanceDepth: number;
  };
}

export function extractDependencies(code: string): DependencyGraph {
  const parsed = parseSolidityDependencies(code);

  const externalDependencies = [
    ...new Set(parsed.imports.filter((i) => i.source.startsWith("@")).map((i) => i.source)),
  ];

  const inheritanceMap: Record<string, string[]> = {};
  for (const contract of parsed.contracts) {
    inheritanceMap[contract.name] = [];
  }
  for (const dep of parsed.inheritance) {
    if (!inheritanceMap[dep.child]) {
      inheritanceMap[dep.child] = [];
    }
    inheritanceMap[dep.child].push(dep.parent);
  }

  const linearization = computeC3Linearization(inheritanceMap);
  const maxInheritanceDepth = computeMaxInheritanceDepth(inheritanceMap);

  return {
    imports: parsed.imports,
    inheritance: parsed.inheritance,
    libraries: parsed.libraries,
    contracts: parsed.contracts,
    associations: parsed.associations,
    linearization,
    externalDependencies,
    parseError: parsed.parseError,
    summary: {
      totalImports: parsed.imports.length,
      totalInheritance: parsed.inheritance.length,
      totalLibraries: parsed.libraries.length,
      totalContracts: parsed.contracts.length,
      totalAssociations: parsed.associations.length,
      maxInheritanceDepth,
    },
  };
}

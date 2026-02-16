import { parse, visit } from "@solidity-parser/parser";
import type { ImportDependency, InheritanceDependency, LibraryUsage } from "./dependency-graph.js";

export interface ContractInfo {
  name: string;
  kind: "contract" | "interface" | "library" | "abstract";
  line: number;
}

export interface AssociationDependency {
  type: "association";
  from: string;
  to: string;
  associationType: "composition" | "state_variable";
  line: number;
}

export interface ParsedDependencyData {
  imports: ImportDependency[];
  inheritance: InheritanceDependency[];
  libraries: LibraryUsage[];
  contracts: ContractInfo[];
  associations: AssociationDependency[];
  parseError?: string;
}

function getLine(node: { loc?: { start: { line: number } } }): number {
  return node.loc?.start.line ?? 0;
}

export function parseSolidityDependencies(code: string): ParsedDependencyData {
  const imports: ImportDependency[] = [];
  const inheritance: InheritanceDependency[] = [];
  const libraries: LibraryUsage[] = [];
  const contracts: ContractInfo[] = [];
  const associations: AssociationDependency[] = [];

  let ast;
  try {
    ast = parse(code, { tolerant: true, loc: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { imports, inheritance, libraries, contracts, associations, parseError: message };
  }

  // Collect all contract/interface/library names for association cross-referencing
  const contractNames = new Set<string>();
  visit(ast, {
    ContractDefinition: (node) => {
      contractNames.add(node.name);
    },
  });

  let currentContract: string | null = null;

  visit(ast, {
    ImportDirective: (node) => {
      let symbols: string[];
      if (node.symbolAliases && node.symbolAliases.length > 0) {
        symbols = node.symbolAliases.map(([name]) => name);
      } else if (node.unitAlias) {
        symbols = [node.unitAlias];
      } else {
        symbols = ["*"];
      }
      imports.push({ type: "import", source: node.path, symbols, line: getLine(node) });
    },

    ContractDefinition: (node) => {
      currentContract = node.name;
      contracts.push({
        name: node.name,
        kind: node.kind as ContractInfo["kind"],
        line: getLine(node),
      });

      for (const spec of node.baseContracts) {
        inheritance.push({
          type: "inheritance",
          parent: spec.baseName.namePath,
          child: node.name,
          line: getLine(spec),
        });
      }
    },

    "ContractDefinition:exit": () => {
      currentContract = null;
    },

    UsingForDeclaration: (node) => {
      if (!node.libraryName) return;
      let forType = "*";
      if (node.typeName) {
        if (node.typeName.type === "UserDefinedTypeName") {
          forType = node.typeName.namePath;
        } else if (node.typeName.type === "ElementaryTypeName") {
          forType = node.typeName.name;
        }
      }
      libraries.push({
        type: "library",
        library: node.libraryName,
        forType,
        inContract: currentContract ?? undefined,
        line: getLine(node),
      });
    },

    StateVariableDeclaration: (node) => {
      if (!currentContract) return;
      for (const variable of node.variables) {
        if (
          variable.typeName &&
          variable.typeName.type === "UserDefinedTypeName" &&
          contractNames.has(variable.typeName.namePath)
        ) {
          associations.push({
            type: "association",
            from: currentContract,
            to: variable.typeName.namePath,
            associationType: "state_variable",
            line: getLine(node),
          });
        }
      }
    },

    NewExpression: (node) => {
      if (!currentContract) return;
      if (node.typeName.type === "UserDefinedTypeName") {
        associations.push({
          type: "association",
          from: currentContract,
          to: node.typeName.namePath,
          associationType: "composition",
          line: getLine(node),
        });
      }
    },
  });

  return { imports, inheritance, libraries, contracts, associations };
}

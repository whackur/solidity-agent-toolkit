# Solidity Style Guide Reference

🔧 Items marked with a rule ID (e.g., `style-indentation`) are auto-checked by the `check_style` MCP tool.

## Code Layout

- **Indentation**: Use 4 spaces per indentation level. Do not use tabs. (`style-indentation`)
- **Max Line Length**: Keep lines under 120 characters. (`style-max-line-length`)
- **Blank Lines**: Use 2 blank lines between top-level declarations (contracts, libraries) and 1 blank line between functions. (`style-blank-lines`)
- **Source File Encoding**: Use UTF-8 encoding.
- **Import Order**: Place imports at the top of the file, immediately following the pragma statements. (`style-import-order`)

## Order of Layout

Elements should be ordered as follows:

1. Pragma statements
2. Import statements
3. Events
4. Errors
5. Interfaces
6. Libraries
7. Contracts

## Function Ordering

Order functions within a contract based on their visibility:

1. constructor
2. receive function (if exists)
3. fallback function (if exists)
4. external
5. public
6. internal
7. private
   (`style-function-order`)

## Function Declaration

Modifiers should follow a specific order:

1. Visibility (external, public, internal, private)
2. Mutability (pure, view, payable)
3. Virtual
4. Override
5. Custom modifiers
   (`style-modifier-order`)

## Naming Conventions

- **Contracts, Structs, Events, Enums**: Use PascalCase. (`style-naming-contract`)
- **Functions, Modifiers**: Use camelCase. (`style-naming-function`)
- **Constants**: Use UPPER_CASE with underscores. (`style-naming-constant`)
- **Variables**: Use camelCase. (`style-naming-variable`)
- **Private and Internal**: Use an underscore prefix for private and internal variables and functions.

## Whitespace

Avoid extra spaces inside parentheses, brackets, or braces. (`style-whitespace`)

## NatSpec Documentation

Use NatSpec tags (@notice, @dev, @param, @return) for all public and external functions to provide clear documentation for users and developers. (`style-natspec`)

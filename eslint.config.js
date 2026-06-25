import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";
import globals from "globals";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  eslintConfigPrettier,
  {
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "max-lines": ["error", { max: 300, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Data-definition files: bulk is static data, not logic — exempt from max-lines.
    files: [
      "src/knowledge/style-rules.ts",
      "src/knowledge/adversarial-scenarios.ts",
      "src/knowledge/erc-interfaces.ts",
      "src/knowledge/vulnerability-patterns.ts",
    ],
    rules: {
      "max-lines": "off",
    },
  },
  {
    files: ["src/__tests__/**/*.ts"],
    rules: {
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-control-regex": "off",
      "max-lines": "off",
    },
  },
  {
    ignores: ["dist/", "coverage/", "data/", "*.config.*"],
  },
);

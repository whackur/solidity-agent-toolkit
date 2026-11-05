import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    exclude: [...configDefaults.exclude, "packages/sol2uml-light/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: ["node_modules/", "dist/", "data/", "packages/sol2uml-light/"],
      thresholds: {
        lines: 80,
        statements: 80,
        functions: 80,
        branches: 65,
      },
    },
  },
});

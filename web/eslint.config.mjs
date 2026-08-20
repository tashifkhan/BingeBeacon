import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: [".next/**", ".output/**", "dist/**", "node_modules/**", "public/sw.js", "src/routeTree.gen.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
  {
    // Vendored beUI registry components. These are generated files that get
    // replaced wholesale by `shadcn add`, so they're linted loosely rather
    // than hand-patched — edits here would be lost on the next update.
    files: ["components/motion/**/*.{ts,tsx}"],
    rules: {
      "react-hooks/refs": "off",
    },
  },
);

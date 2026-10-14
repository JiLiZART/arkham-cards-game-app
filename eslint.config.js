import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "inspired"] },
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },
  {
    // engine must stay renderer-agnostic (design §1)
    files: ["src/engine/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["react", "react-dom", "three", "@react-three/*", "zustand"], message: "engine must not depend on UI/rendering" },
            { group: ["**/ui/**", "../ui/*", "../../ui/*"], message: "engine must not import UI" },
          ],
        },
      ],
    },
  },
);

import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import tailwind from "eslint-plugin-tailwindcss";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  ...tailwind.configs["flat/recommended"],
  {
    settings: {
      tailwindcss: {
        callees: ["cn", "cva"],
        config: {
          theme: {
            extend: {},
          },
          plugins: [],
        },
      },
    },
    rules: {
      "tailwindcss/no-custom-classname": "off",
      "tailwindcss/classnames-order": "warn",
      "tailwindcss/enforces-shorthand": "warn",
      "tailwindcss/no-unnecessary-arbitrary-value": "warn",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/duckdb/**",
  ]),
]);

export default eslintConfig;

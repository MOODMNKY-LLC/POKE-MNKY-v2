import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Pre-existing annotations across the app (Supabase rows, JSON payloads,
      // third-party clients). Replacing them with guessed types would fight the
      // typecheck that now runs in `next build`. Keep the rule visible as a warning.
      "@typescript-eslint/no-explicit-any": "warn",
      // React Compiler rules from eslint-plugin-react-hooks v7. They flag existing
      // data-loading effects; rewriting those changes render behavior and is outside
      // this security/typecheck upgrade. Classic rules-of-hooks stays an error.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/error-boundaries": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/static-components": "warn",
      "react-hooks/preserve-manual-memoization": "warn",
    },
  },
  // Next.js 16 removed `next lint` and the `eslint` key in next.config.
  // `scripts/` is operational tooling and `supabase/functions` is Deno; both are
  // outside the Next.js program (see tsconfig exclude) and are not linted here.
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "node_modules/**",
    "scripts/**",
    "supabase/functions/**",
    "docs/**",
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
    "temp/**",
  ]),
])

export default eslintConfig

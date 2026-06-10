import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

/**
 * ESLint flat config (eslint 9 + eslint-config-next 16).
 * `next lint` dejó de existir en Next 16 — el script ahora corre eslint directo.
 */
const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      "next-env.d.ts",
      // Service worker plano (no módulo): usa self/caches, no aplica el preset
      "public/sw.js",
    ],
  },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // Reglas nuevas de react-hooks v6 (era React Compiler). El codebase
      // tiene ~25 usos de setState síncrono en effects que funcionan bien
      // hoy — se bajan a warn como camino de adopción; endurecer cuando se
      // refactoricen (decisión de David, ver docs/decisiones).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
    },
  },
];

export default eslintConfig;

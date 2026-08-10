import js from "@eslint/js";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      react,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules, // React 19: no hace falta `import React` para JSX
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      // El proyecto no usa la librería `prop-types` (JS puro, sin TS ni
      // validación de props en runtime) — activar esta regla solo generaría
      // ruido, no bugs reales.
      "react/prop-types": "off",
      // eslint-plugin-react-hooks v7 añadió reglas de "preparación para el
      // React Compiler" (refs/set-state-in-effect) como error por defecto.
      // El proyecto no usa (ni planea usar) el Compiler, y el simulador es
      // deliberadamente imperativo fuera del ciclo de render de React (ver
      // "Game loop fuera de React" en el README) — SoundEngine se
      // inicializa con el patrón de ref perezosa que la propia documentación
      // de React recomienda (react.dev/reference/react/useRef), y el efecto
      // de construcción de la escena sincroniza estado derivado de un
      // sistema externo (Three.js), el caso de uso que React documenta como
      // válido para llamar a setState desde un efecto. Se dejan en "warn"
      // para no forzar reescrituras arriesgadas de código de simulación ya
      // probado, sin dejar de señalarlas como deuda técnica a revisar si
      // algún día se adopta el Compiler.
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["**/*.test.{js,jsx}", "src/test/**"],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ["scripts/**", "vite.config.js", "eslint.config.js"],
    languageOptions: { globals: globals.node },
  },
  prettier, // desactiva reglas de estilo que Prettier ya resuelve — sin conflictos
];

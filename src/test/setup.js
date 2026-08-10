import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { i18nReady } from "../i18n/index.js";

// Los idiomas se cargan bajo demanda (backend con import() dinámico); los
// tests hacen `i18n.t(...)` de forma síncrona, así que hay que esperar a
// que el idioma inicial (en) esté cargado antes de correr cualquier test.
await i18nReady;

// Sin `test.globals: true` en vite.config.js, @testing-library/react no
// detecta automáticamente el framework y no desmonta entre tests — sin
// esto, el DOM de un test se acumula sobre el del siguiente dentro del
// mismo archivo (colisiones tipo "multiple elements found").
afterEach(() => {
  cleanup();
});

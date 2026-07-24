import "@testing-library/jest-dom/vitest";
import { i18nReady } from "../i18n/index.js";

// Los idiomas se cargan bajo demanda (backend con import() dinámico); los
// tests hacen `i18n.t(...)` de forma síncrona, así que hay que esperar a
// que el idioma inicial (en) esté cargado antes de correr cualquier test.
await i18nReady;

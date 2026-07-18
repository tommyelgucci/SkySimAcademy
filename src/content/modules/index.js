/**
 * Registro central de módulos de teoría.
 *
 * Para añadir un módulo nuevo:
 *  1. Crear `<module-id>.json` en esta carpeta (ver ../schema.js).
 *  2. Añadir sus textos en `src/i18n/locales/<lang>/theory.json` (5 idiomas).
 *  3. Importarlo y añadirlo al array de abajo. Nada más.
 */
import { validateModule } from "../schema.js";
import principlesOfFlight from "./principles-of-flight.json";
import cockpitInstruments from "./cockpit-instruments.json";

export const MODULES = [principlesOfFlight, cockpitInstruments]
  .map(validateModule)
  .sort((a, b) => a.order - b.order);

/** @param {string} id */
export function getModule(id) {
  return MODULES.find((m) => m.id === id) ?? null;
}

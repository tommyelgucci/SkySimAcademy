/**
 * Registro central de módulos de teoría.
 *
 * Para añadir un módulo nuevo:
 *  1. Crear `<module-id>.json` en esta carpeta (ver ../schema.js).
 *  2. Añadir sus textos en `src/i18n/locales/<lang>/theory.json` (5 idiomas).
 *  3. Importarlo y añadirlo al array de abajo. Nada más.
 */
import { deriveModuleQuiz, validateModule } from "../schema.js";
import principlesOfFlight from "./principles-of-flight.json";
import advancedAerodynamics from "./advanced-aerodynamics.json";
import cockpitInstruments from "./cockpit-instruments.json";
import weatherBasics from "./weather-basics.json";
import radioAlphabet from "./radio-alphabet.json";
import navigationBasics from "./navigation-basics.json";
import emergencyProcedures from "./emergency-procedures.json";
import weightAndBalance from "./weight-and-balance.json";
import regulations from "./regulations.json";
import humanFactors from "./human-factors.json";

export const MODULES = [
  principlesOfFlight,
  advancedAerodynamics,
  cockpitInstruments,
  weatherBasics,
  radioAlphabet,
  navigationBasics,
  emergencyProcedures,
  weightAndBalance,
  regulations,
  humanFactors,
]
  .map(deriveModuleQuiz)
  .map(validateModule)
  .sort((a, b) => a.order - b.order);

/** @param {string} id */
export function getModule(id) {
  return MODULES.find((m) => m.id === id) ?? null;
}

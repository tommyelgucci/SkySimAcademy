/**
 * Configuración de i18next.
 *
 * Los 5 idiomas soportados se cargan de forma estática (bundled) porque el
 * volumen de texto del MVP es pequeño. Cuando el contenido crezca, basta con
 * cambiar a `i18next-http-backend` y mover los JSON a /public/locales sin
 * tocar ningún componente.
 *
 * Namespaces:
 *  - common:    interfaz general (navegación, botones, home)
 *  - theory:    todo el contenido educativo (lecciones + quizzes)
 *  - simulator: HUD, controles y mensajes del simulador
 *  - exam:      modo examen y repaso de fallos
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enTheory from "./locales/en/theory.json";
import enSimulator from "./locales/en/simulator.json";
import enExam from "./locales/en/exam.json";
import deCommon from "./locales/de/common.json";
import deTheory from "./locales/de/theory.json";
import deSimulator from "./locales/de/simulator.json";
import deExam from "./locales/de/exam.json";
import esCommon from "./locales/es/common.json";
import esTheory from "./locales/es/theory.json";
import esSimulator from "./locales/es/simulator.json";
import esExam from "./locales/es/exam.json";
import ptCommon from "./locales/pt/common.json";
import ptTheory from "./locales/pt/theory.json";
import ptSimulator from "./locales/pt/simulator.json";
import ptExam from "./locales/pt/exam.json";
import arCommon from "./locales/ar/common.json";
import arTheory from "./locales/ar/theory.json";
import arSimulator from "./locales/ar/simulator.json";
import arExam from "./locales/ar/exam.json";

/** Idiomas disponibles, con su dirección de escritura y nombre nativo. */
export const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

const resources = {
  en: { common: enCommon, theory: enTheory, simulator: enSimulator, exam: enExam },
  de: { common: deCommon, theory: deTheory, simulator: deSimulator, exam: deExam },
  es: { common: esCommon, theory: esTheory, simulator: esSimulator, exam: esExam },
  pt: { common: ptCommon, theory: ptTheory, simulator: ptSimulator, exam: ptExam },
  ar: { common: arCommon, theory: arTheory, simulator: arSimulator, exam: arExam },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true, // "pt-BR" → "pt", "ar-EG" → "ar", etc.
    ns: ["common", "theory", "simulator", "exam"],
    defaultNS: "common",
    returnObjects: true, // permite t() sobre arrays (opciones de quiz)
    interpolation: { escapeValue: false }, // React ya escapa
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "aerolearn.lang",
    },
  });

/**
 * Sincroniza <html lang dir> con el idioma activo.
 * Imprescindible para que el árabe se renderice RTL en toda la app.
 */
function applyDocumentDirection(lng) {
  const language = LANGUAGES.find((l) => lng?.startsWith(l.code));
  document.documentElement.lang = language?.code ?? "en";
  document.documentElement.dir = language?.dir ?? "ltr";
}

i18n.on("languageChanged", applyDocumentDirection);
applyDocumentDirection(i18n.resolvedLanguage);

export default i18n;

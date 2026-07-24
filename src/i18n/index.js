/**
 * Configuración de i18next.
 *
 * Los 5 idiomas se cargan bajo demanda: un backend a medida resuelve cada
 * `(idioma, namespace)` con un `import()` dinámico, que Vite parte en un
 * chunk propio por archivo. Antes los 5 idiomas se importaban de forma
 * estática y viajaban todos en el bundle principal (~1.5 MB de JSON,
 * siempre, aunque el usuario solo usara uno); ahora solo se descarga el
 * idioma activo (+ `en` como fallback si el usuario no está en inglés).
 * `LanguageSwitcher` no cambia: `i18n.changeLanguage()` dispara la carga
 * del idioma nuevo automáticamente si aún no está en caché.
 *
 * `react: { useSuspense: true }` es la otra mitad: los componentes que usan
 * `useTranslation()` suspenden mientras su namespace carga, así que el
 * árbol se envuelve en `<Suspense>` una sola vez en `main.jsx`.
 *
 * Namespaces:
 *  - common:    interfaz general (navegación, botones, home)
 *  - theory:    todo el contenido educativo (lecciones + quizzes)
 *  - simulator: HUD, controles y mensajes del simulador
 *  - exam:      modo examen y repaso de fallos
 *  - flashcards: modo de repaso de instrumentos y alertas de audio (fuera
 *    del curso, sin storage.js)
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

/** Idiomas disponibles, con su dirección de escritura y nombre nativo. */
export const LANGUAGES = [
  { code: "en", label: "English", dir: "ltr" },
  { code: "de", label: "Deutsch", dir: "ltr" },
  { code: "es", label: "Español", dir: "ltr" },
  { code: "pt", label: "Português", dir: "ltr" },
  { code: "ar", label: "العربية", dir: "rtl" },
];

const NAMESPACES = ["common", "theory", "simulator", "exam", "flashcards"];

/** Backend a medida: cada (idioma, namespace) es un `import()` dinámico. */
const dynamicImportBackend = {
  type: "backend",
  read(language, namespace, callback) {
    import(`./locales/${language}/${namespace}.json`)
      .then((mod) => callback(null, mod.default))
      .catch((error) => callback(error, null));
  },
};

export const i18nReady = i18n
  .use(dynamicImportBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "en",
    supportedLngs: LANGUAGES.map((l) => l.code),
    nonExplicitSupportedLngs: true, // "pt-BR" → "pt", "ar-EG" → "ar", etc.
    ns: NAMESPACES,
    defaultNS: "common",
    returnObjects: true, // permite t() sobre arrays (opciones de quiz)
    interpolation: { escapeValue: false }, // React ya escapa
    react: { useSuspense: true },
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

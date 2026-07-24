/**
 * Analítica opcional, sin cookies y sin PII (Plausible Analytics).
 *
 * Desactivada por defecto: solo se activa si `VITE_PLAUSIBLE_DOMAIN` está
 * configurado en el build (ver `.env.example`). Sin esa variable este
 * módulo no carga ningún script ni hace ninguna petición de red — coherente
 * con la filosofía "sin backend" del proyecto: Plausible es un servicio
 * externo opt-in, no una dependencia del MVP.
 *
 * Eventos propios (no pageviews automáticos, la app es una sola página):
 * módulo aprobado, misión completada y crash atrapado por ErrorBoundary.
 * Ningún evento incluye texto libre ni identificadores de usuario.
 */
const DOMAIN = import.meta.env.VITE_PLAUSIBLE_DOMAIN;

let scriptRequested = false;

function ensureScript() {
  if (!DOMAIN || scriptRequested || typeof document === "undefined") return;
  scriptRequested = true;
  const script = document.createElement("script");
  script.defer = true;
  script.dataset.domain = DOMAIN;
  script.src = "https://plausible.io/js/script.js";
  document.head.appendChild(script);
}

/**
 * Dispara un evento nombrado con props opcionales (solo valores primitivos,
 * ej. `{ moduleId: "principles-of-flight" }`). No-op si no hay dominio
 * configurado.
 */
export function trackEvent(name, props) {
  if (!DOMAIN || typeof window === "undefined") return;
  ensureScript();
  window.plausible =
    window.plausible ||
    function plausible() {
      (window.plausible.q = window.plausible.q ?? []).push(arguments);
    };
  window.plausible(name, props ? { props } : undefined);
}

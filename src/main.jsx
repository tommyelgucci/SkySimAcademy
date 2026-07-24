import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./i18n"; // inicializa i18next ANTES de montar la app
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

// El idioma activo se carga bajo demanda (ver src/i18n/index.js); mientras
// llega, useTranslation() suspende y este fallback cubre ese instante.
const loadingFallback = <div className="app-loading" aria-hidden="true" />;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <Suspense fallback={loadingFallback}>
        <App />
      </Suspense>
    </ErrorBoundary>
  </StrictMode>
);

// PWA: registrar el service worker relativo a esta app (alcance
// /teoria-vuelo/ en producción). Se omite al abrir como archivo local.
if ("serviceWorker" in navigator && window.location.protocol !== "file:") {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(new URL("sw.js", window.location.href).pathname)
      .catch(() => {});
  });
}

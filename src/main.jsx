import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n"; // inicializa i18next ANTES de montar la app
import "./index.css";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
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

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./i18n"; // inicializa i18next ANTES de montar la app
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

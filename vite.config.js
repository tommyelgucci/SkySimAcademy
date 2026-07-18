import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" permite servir la app desde cualquier subruta (GitHub Pages, etc.)
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    // three.js es la dependencia pesada; separarla mejora el caché del navegador
    rollupOptions: {
      output: {
        manualChunks: {
          three: ["three"],
          vendor: ["react", "react-dom", "i18next", "react-i18next"],
        },
      },
    },
  },
});

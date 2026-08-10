/**
 * Cambiar de idioma es lo único que hace este componente, y tiene un efecto
 * que le importa a toda la app: sincroniza <html lang dir> (ver
 * src/i18n/index.js) — es lo que voltea la interfaz a RTL para árabe.
 */
import { Suspense } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n/index.js";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

describe("LanguageSwitcher", () => {
  afterEach(async () => {
    // Deja el idioma como estaba para no filtrar estado entre tests.
    await i18n.changeLanguage("en");
  });

  it("muestra las 5 opciones de idioma con el idioma activo seleccionado", () => {
    render(
      <Suspense fallback={null}>
        <LanguageSwitcher />
      </Suspense>,
    );
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("en");
    expect(screen.getAllByRole("option")).toHaveLength(5);
  });

  it("elegir árabe cambia el idioma y voltea el documento a RTL", async () => {
    const user = userEvent.setup();
    render(
      <Suspense fallback={null}>
        <LanguageSwitcher />
      </Suspense>,
    );

    await user.selectOptions(screen.getByRole("combobox"), "ar");

    await waitFor(() => {
      expect(document.documentElement.dir).toBe("rtl");
      expect(document.documentElement.lang).toBe("ar");
    });
  });
});

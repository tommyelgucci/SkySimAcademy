/**
 * ErrorBoundary es la última red de seguridad de la app (datos corruptos en
 * localStorage, o cualquier otro error de render). Este test cubre el
 * contrato que le importa a quien la use: no interferir cuando todo va
 * bien, mostrar una salida cuando algo falla, dejar rastro del crash para
 * poder inspeccionarlo después, y que "reset" borre los datos y recargue.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../i18n/index.js";
import { getCrashLog } from "../storage.js";
import ErrorBoundary from "./ErrorBoundary.jsx";

function Bomb() {
  throw new Error("boom");
}

describe("ErrorBoundary", () => {
  beforeEach(() => {
    localStorage.clear();
    // React (y el propio componente) escriben en consola al atrapar el
    // error — es ruido esperado en este test, no una señal de fallo.
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza los hijos sin tocar nada cuando no hay error", () => {
    render(
      <ErrorBoundary>
        <p>todo bien</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText("todo bien")).toBeInTheDocument();
  });

  it("muestra la pantalla de error y registra el crash cuando un hijo lanza", () => {
    expect(getCrashLog()).toHaveLength(0);

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    expect(screen.getByText(i18n.t("errorBoundary.title", { ns: "common" }))).toBeInTheDocument();
    expect(screen.queryByText("todo bien")).not.toBeInTheDocument();

    const crashes = getCrashLog();
    expect(crashes).toHaveLength(1);
    expect(crashes[0].message).toContain("boom");
  });

  it("«Restablecer datos» borra localStorage y recarga si el usuario confirma", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadSpy });
    localStorage.setItem("aerolearn.progress.v1", "{}");

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    await user.click(
      screen.getByRole("button", { name: i18n.t("errorBoundary.reset", { ns: "common" }) }),
    );

    expect(localStorage.getItem("aerolearn.progress.v1")).toBeNull();
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("«Restablecer datos» no borra nada si el usuario cancela la confirmación", async () => {
    const user = userEvent.setup();
    vi.spyOn(window, "confirm").mockReturnValue(false);
    const reloadSpy = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload: reloadSpy });

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    // El propio catch ya registró el crash en localStorage (ver test
    // anterior) — lo que "cancelar" tiene que garantizar es que ese dato
    // sigue ahí, no que la clave tenga un valor exacto.
    await user.click(
      screen.getByRole("button", { name: i18n.t("errorBoundary.reset", { ns: "common" }) }),
    );

    expect(getCrashLog()).toHaveLength(1);
    expect(reloadSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

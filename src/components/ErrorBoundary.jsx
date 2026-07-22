import { Component } from "react";
import { TriangleAlert } from "lucide-react";
import i18n from "../i18n";

/**
 * Red de seguridad: si un dato corrupto en localStorage (o cualquier otro
 * error de render) tira la app, esto evita una pantalla en blanco total y
 * ofrece una salida — recargar o borrar los datos de este dispositivo.
 *
 * Es una clase porque los error boundaries de React no tienen equivalente
 * en hooks; por eso usa la instancia de i18next directamente en vez de
 * useTranslation().
 */
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught:", error, info);
  }

  handleReset = () => {
    const t = (key) => i18n.t(`errorBoundary.${key}`, { ns: "common" });
    if (window.confirm(t("resetConfirm"))) {
      try {
        localStorage.clear();
      } catch {
        // sin almacenamiento accesible: no hay nada que borrar
      }
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const t = (key) => i18n.t(`errorBoundary.${key}`, { ns: "common" });

    return (
      <div className="error-boundary">
        <TriangleAlert size={48} aria-hidden="true" />
        <h1>{t("title")}</h1>
        <p>{t("body")}</p>
        <div className="error-boundary__actions">
          <button className="button button--primary" onClick={() => window.location.reload()}>
            {t("reload")}
          </button>
          <button className="button button--secondary" onClick={this.handleReset}>
            {t("reset")}
          </button>
        </div>
      </div>
    );
  }
}

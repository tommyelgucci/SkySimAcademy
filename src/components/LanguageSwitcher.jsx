/**
 * Selector de idioma. Cambiar el idioma actualiza también <html lang dir>
 * (ver src/i18n/index.js), por lo que el árabe voltea la interfaz a RTL.
 */
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "../i18n";

export default function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current =
    LANGUAGES.find((l) => i18n.resolvedLanguage?.startsWith(l.code))?.code ?? "en";

  return (
    <label className="lang-switcher">
      <span className="visually-hidden">{t("language")}</span>
      <select
        value={current}
        onChange={(event) => i18n.changeLanguage(event.target.value)}
      >
        {LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}

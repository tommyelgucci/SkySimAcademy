/**
 * Hud — instrumentos en pantalla durante el vuelo.
 * Los números se formatean con Intl según el idioma activo (p. ej. numerales
 * árabes orientales cuando la interfaz está en árabe).
 */
import { useTranslation } from "react-i18next";
import { TriangleAlert } from "lucide-react";

export default function Hud({ hud }) {
  const { t, i18n } = useTranslation("simulator");
  const format = (value) => value.toLocaleString(i18n.resolvedLanguage);
  const minutes = Math.floor(hud.timeLeft / 60);
  const seconds = String(hud.timeLeft % 60).padStart(2, "0");

  return (
    <>
      <div className="hud">
        <HudItem label={t("hud.speed")} value={`${format(hud.speed)} ${t("hud.unitSpeed")}`} />
        <HudItem
          label={t("hud.altitude")}
          value={`${format(hud.altitude)} ${t("hud.unitAltitude")}`}
        />
        <HudItem label={t("hud.heading")} value={`${format(hud.heading)}°`} />
        <HudItem label={t("hud.throttle")} value={`${format(hud.throttle)}%`} />
        <HudItem
          label={t("hud.timeLeft")}
          value={`${minutes}:${seconds}`}
          warning={hud.timeLeft <= 30}
        />
      </div>
      {hud.stalled && (
        <div className="hud__stall">
          <TriangleAlert size={22} aria-hidden="true" /> {t("stallWarning")}
        </div>
      )}
    </>
  );
}

function HudItem({ label, value, warning = false }) {
  return (
    <div className={`hud__item ${warning ? "hud__item--warning" : ""}`}>
      <span className="hud__label">{label}</span>
      <span className="hud__value">{value}</span>
    </div>
  );
}

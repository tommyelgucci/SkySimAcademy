/**
 * InstrumentPanel — cuadro de instrumentos con agujas de verdad.
 *
 * Cinco relojes SVG paramétricos (ver ../instruments/Gauges.jsx, compartido
 * con las flashcards visuales de reconocimiento de instrumentos). Los
 * valores llegan por props (muestreados a ~10 Hz por el HUD) y las agujas
 * se suavizan con una transición CSS corta — sin re-renders a 60 fps.
 */
import { useTranslation } from "react-i18next";
import {
  AirspeedIndicator,
  AttitudeIndicator,
  Altimeter,
  Variometer,
  CompassGauge,
} from "../instruments/Gauges.jsx";

export default function InstrumentPanel({ hud }) {
  const { t, i18n } = useTranslation("simulator");
  const locale = i18n.resolvedLanguage;
  return (
    <div className="instrument-panel">
      <AirspeedIndicator value={hud.speed} label={t("hud.speed")} />
      <AttitudeIndicator pitch={hud.pitchDeg} bank={hud.bankDeg} label={t("instruments.horizon")} />
      <Altimeter value={hud.altitude} label={t("hud.altitude")} locale={locale} />
      <Variometer value={hud.verticalSpeed} label={t("instruments.vsi")} />
      <CompassGauge
        heading={hud.heading}
        label={t("hud.heading")}
        cardinals={{
          n: t("instruments.cardinals.n"),
          e: t("instruments.cardinals.e"),
          s: t("instruments.cardinals.s"),
          w: t("instruments.cardinals.w"),
        }}
      />
    </div>
  );
}

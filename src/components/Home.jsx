import { useTranslation } from "react-i18next";
import { BookOpen, Gauge, Joystick, Languages, Plane } from "lucide-react";
import { MODULES } from "../content/modules";
import { MISSIONS } from "../content/missions";
import { INSTRUMENT_FLASHCARDS, AUDIO_FLASHCARDS } from "../content/flashcards/index.js";
import { LANGUAGES } from "../i18n/index.js";

/**
 * Cifras de la portada. Se derivan del contenido real en vez de escribirse a
 * mano: si mañana se añade un módulo o una misión, el reclamo se actualiza
 * solo y nunca puede mentir.
 */
const LESSON_COUNT = MODULES.reduce((total, m) => total + (m.lessons?.length ?? 0), 0);
const FLASHCARD_COUNT = INSTRUMENT_FLASHCARDS.length + AUDIO_FLASHCARDS.length;

export default function Home({ onNavigate }) {
  const { t } = useTranslation();

  const highlights = [
    {
      icon: <BookOpen size={20} aria-hidden="true" />,
      value: t("home.highlights.theory.value", {
        modules: MODULES.length,
        lessons: LESSON_COUNT,
      }),
      label: t("home.highlights.theory.label"),
    },
    {
      icon: <Joystick size={20} aria-hidden="true" />,
      value: t("home.highlights.simulator.value", { missions: MISSIONS.length }),
      label: t("home.highlights.simulator.label"),
    },
    {
      icon: <Gauge size={20} aria-hidden="true" />,
      value: t("home.highlights.flashcards.value", { cards: FLASHCARD_COUNT }),
      label: t("home.highlights.flashcards.label"),
    },
    {
      icon: <Languages size={20} aria-hidden="true" />,
      value: t("home.highlights.languages.value", { count: LANGUAGES.length }),
      label: t("home.highlights.languages.label"),
    },
  ];

  return (
    <section className="home">
      <p className="home__badge">
        <Plane size={16} aria-hidden="true" /> {t("tagline")}
      </p>
      <h1 className="home__title">{t("home.welcome")}</h1>
      <p className="home__intro">{t("home.intro")}</p>
      <div className="home__actions">
        <button className="button button--primary" onClick={() => onNavigate("theory")}>
          <BookOpen size={18} aria-hidden="true" /> {t("home.startTheory")}
        </button>
        <button className="button button--secondary" onClick={() => onNavigate("simulator")}>
          <Joystick size={18} aria-hidden="true" /> {t("home.openSimulator")}
        </button>
      </div>

      <ul className="home__highlights">
        {highlights.map((item) => (
          <li key={item.label} className="highlight-card">
            <span className="highlight-card__icon">{item.icon}</span>
            <span className="highlight-card__value">{item.value}</span>
            <span className="highlight-card__label">{item.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

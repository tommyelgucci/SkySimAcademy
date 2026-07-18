import { useTranslation } from "react-i18next";
import { BookOpen, Joystick, Plane } from "lucide-react";

export default function Home({ onNavigate }) {
  const { t } = useTranslation();

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
        <button
          className="button button--secondary"
          onClick={() => onNavigate("simulator")}
        >
          <Joystick size={18} aria-hidden="true" /> {t("home.openSimulator")}
        </button>
      </div>
    </section>
  );
}

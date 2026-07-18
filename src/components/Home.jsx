import { useTranslation } from "react-i18next";

export default function Home({ onNavigate }) {
  const { t } = useTranslation();

  return (
    <section className="home">
      <p className="home__badge">✈️ {t("tagline")}</p>
      <h1 className="home__title">{t("home.welcome")}</h1>
      <p className="home__intro">{t("home.intro")}</p>
      <div className="home__actions">
        <button className="button button--primary" onClick={() => onNavigate("theory")}>
          📚 {t("home.startTheory")}
        </button>
        <button
          className="button button--secondary"
          onClick={() => onNavigate("simulator")}
        >
          🕹️ {t("home.openSimulator")}
        </button>
      </div>
    </section>
  );
}

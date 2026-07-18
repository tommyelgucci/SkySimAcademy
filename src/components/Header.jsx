import { useTranslation } from "react-i18next";
import { Plane } from "lucide-react";
import LanguageSwitcher from "./LanguageSwitcher.jsx";

const NAV_SCREENS = ["home", "theory", "simulator"];

export default function Header({ activeScreen, onNavigate }) {
  const { t } = useTranslation();
  // "module", "exam" y "review" son subpantallas de "theory" en la navegación
  const active = ["module", "exam", "review"].includes(activeScreen)
    ? "theory"
    : activeScreen;

  return (
    <header className="header">
      <button className="header__brand" onClick={() => onNavigate("home")}>
        <Plane size={20} aria-hidden="true" /> {t("appName")}
      </button>
      <nav className="header__nav">
        {NAV_SCREENS.map((screen) => (
          <button
            key={screen}
            className={`header__link ${active === screen ? "header__link--active" : ""}`}
            onClick={() => onNavigate(screen)}
          >
            {t(`nav.${screen}`)}
          </button>
        ))}
      </nav>
      <LanguageSwitcher />
    </header>
  );
}

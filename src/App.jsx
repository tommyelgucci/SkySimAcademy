/**
 * App — raíz y navegación.
 *
 * El MVP usa un mini-router por estado (`screen`) para no añadir dependencias.
 * Si la app crece (URLs compartibles, deep-links a módulos), el paso natural
 * es react-router: cada `screen` de aquí se convierte en una ruta.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./components/Header.jsx";
import Home from "./components/Home.jsx";
import ModuleList from "./components/theory/ModuleList.jsx";
import ModuleView from "./components/theory/ModuleView.jsx";
import ExamView from "./components/theory/ExamView.jsx";
import ReviewView from "./components/theory/ReviewView.jsx";
import StatsView from "./components/theory/StatsView.jsx";
import SimulatorView from "./components/simulator/SimulatorView.jsx";

export default function App() {
  const { t } = useTranslation();
  /** @type {[{name: string, moduleId?: string}, Function]} */
  const [screen, setScreen] = useState({ name: "home" });

  const goto = (name, extra = {}) => setScreen({ name, ...extra });
  const isSimulator = screen.name === "simulator";

  return (
    <div className={`app ${isSimulator ? "app--fullscreen" : ""}`}>
      <Header activeScreen={screen.name} onNavigate={goto} />

      <main className="app__main">
        {screen.name === "home" && <Home onNavigate={goto} />}
        {screen.name === "theory" && (
          <ModuleList
            onOpenModule={(moduleId) => goto("module", { moduleId })}
            onOpenExam={() => goto("exam")}
            onOpenReview={() => goto("review")}
            onOpenStats={() => goto("stats")}
          />
        )}
        {screen.name === "module" && (
          <ModuleView moduleId={screen.moduleId} onBack={() => goto("theory")} />
        )}
        {screen.name === "exam" && <ExamView onBack={() => goto("theory")} />}
        {screen.name === "review" && <ReviewView onBack={() => goto("theory")} />}
        {screen.name === "stats" && <StatsView onBack={() => goto("theory")} />}
        {isSimulator && <SimulatorView onExit={() => goto("home")} />}
      </main>

      {!isSimulator && (
        <footer className="app__footer">
          <p>{t("footer")}</p>
          <p>
            <a href="./privacy.html" target="_blank" rel="noreferrer">
              {t("privacyPolicy")}
            </a>
          </p>
        </footer>
      )}
    </div>
  );
}

/**
 * StatsView — racha de estudio, progreso por módulo y estado del repaso
 * espaciado. Todo derivado de storage.js, sin estado propio más allá de
 * lectura (los valores se recalculan al montar).
 */
import { useTranslation } from "react-i18next";
import {
  BarChart3,
  CircleCheck,
  CircleX,
  Flame,
  RotateCcw,
} from "lucide-react";
import { MODULES } from "../../content/modules";
import {
  getExamHistory,
  getQuizResult,
  getSrsSummary,
  getStreak,
} from "../../storage.js";

export default function StatsView({ onBack }) {
  const { t, i18n } = useTranslation(["exam", "theory"]);
  const streak = getStreak();
  const srs = getSrsSummary();
  const history = getExamHistory().slice(-5).reverse();
  const format = (value) => value.toLocaleString(i18n.resolvedLanguage);

  return (
    <section className="stats">
      <button className="button button--ghost" onClick={onBack}>
        {t("exam:exam.back")}
      </button>

      <div className="exam__hero">
        <BarChart3 size={40} aria-hidden="true" />
        <h1>{t("exam:stats.title")}</h1>
      </div>

      <div className="stats__grid">
        <div className="stats__card">
          <Flame
            size={22}
            className={streak > 0 ? "stats__flame stats__flame--on" : "stats__flame"}
            aria-hidden="true"
          />
          <div>
            <p className="stats__card-title">{t("exam:stats.streakTitle")}</p>
            <p className="stats__card-value">
              {streak > 0
                ? t("exam:stats.streakDays", { count: format(streak) })
                : t("exam:stats.streakEmpty")}
            </p>
          </div>
        </div>

        <div className="stats__card">
          <RotateCcw size={22} aria-hidden="true" />
          <div>
            <p className="stats__card-title">{t("exam:stats.srsTitle")}</p>
            {srs.total > 0 ? (
              <p className="stats__card-value">
                {t("exam:stats.srsDueNow", { count: format(srs.dueNow) })} ·{" "}
                {t("exam:stats.srsMastered", { count: format(srs.mastered) })}
              </p>
            ) : (
              <p className="stats__card-value">{t("exam:stats.srsEmpty")}</p>
            )}
          </div>
        </div>
      </div>

      <div className="stats__section">
        <h2>{t("exam:stats.modulesTitle")}</h2>
        <ul className="stats__modules">
          {MODULES.filter((m) => m.status === "available").map((module) => {
            const result = getQuizResult(module.id);
            return (
              <li key={module.id} className="stats__module-row">
                <span className="stats__module-name">
                  {t(`theory:modules.${module.id}.title`)}
                </span>
                {result ? (
                  <span className={result.passed ? "is-correct" : "is-wrong"}>
                    {result.passed ? (
                      <CircleCheck size={16} aria-hidden="true" />
                    ) : (
                      <CircleX size={16} aria-hidden="true" />
                    )}{" "}
                    {format(result.bestScore)}/{format(result.total)}
                  </span>
                ) : (
                  <span className="stats__module-empty">
                    {t("exam:stats.notAttempted")}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {history.length > 0 && (
        <div className="exam__history stats__section">
          <h2>{t("exam:exam.history")}</h2>
          <ul>
            {history.map((attempt, i) => (
              <li key={i} className={attempt.passed ? "is-correct" : "is-wrong"}>
                {attempt.passed ? (
                  <CircleCheck size={16} aria-hidden="true" />
                ) : (
                  <CircleX size={16} aria-hidden="true" />
                )}{" "}
                {format(attempt.score)}/{format(attempt.total)} ·{" "}
                {new Date(attempt.at).toLocaleDateString(i18n.resolvedLanguage)}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

import { useTranslation } from "react-i18next";
import { BarChart3, Check, GraduationCap, RotateCcw } from "lucide-react";
import { MODULES } from "../../content/modules";
import { getFailedQuestions, isModulePassed } from "../../storage.js";
import { ContentIcon } from "../icons.jsx";

export default function ModuleList({ onOpenModule, onOpenExam, onOpenReview, onOpenStats }) {
  const { t } = useTranslation(["theory", "exam"]);
  const failedCount = getFailedQuestions().length;

  return (
    <section className="theory">
      <h1>{t("title")}</h1>
      <p className="theory__subtitle">{t("subtitle")}</p>

      {/* Herramientas de estudio PPL: examen y repaso de fallos */}
      <div className="study-tools">
        <button className="study-tool" onClick={onOpenExam}>
          <GraduationCap size={22} aria-hidden="true" />
          <span className="study-tool__text">
            <span className="study-tool__title">{t("exam:exam.entry")}</span>
            <span className="study-tool__description">
              {t("exam:exam.entryDescription")}
            </span>
          </span>
        </button>
        <button
          className="study-tool"
          disabled={failedCount === 0}
          onClick={onOpenReview}
        >
          <RotateCcw size={22} aria-hidden="true" />
          <span className="study-tool__text">
            <span className="study-tool__title">{t("exam:review.entry")}</span>
            <span className="study-tool__description">
              {failedCount === 0
                ? t("exam:review.empty").split("—")[0].trim()
                : t("exam:review.toReview", { count: failedCount })}
            </span>
          </span>
        </button>
        <button className="study-tool" onClick={onOpenStats}>
          <BarChart3 size={22} aria-hidden="true" />
          <span className="study-tool__text">
            <span className="study-tool__title">{t("exam:stats.entry")}</span>
            <span className="study-tool__description">
              {t("exam:stats.entryDescription")}
            </span>
          </span>
        </button>
      </div>

      <div className="module-grid">
        {MODULES.map((module) => {
          const available = module.status === "available";
          const passed = available && isModulePassed(module.id);
          return (
            <button
              key={module.id}
              className={`module-card ${available ? "" : "module-card--disabled"}`}
              disabled={!available}
              onClick={() => onOpenModule(module.id)}
            >
              <span className="module-card__icon">
                <ContentIcon name={module.icon} size={30} />
              </span>
              <span className="module-card__title">
                {t(`modules.${module.id}.title`)}
              </span>
              <span className="module-card__description">
                {t(`modules.${module.id}.description`)}
              </span>
              {!available && (
                <span className="module-card__badge">{t("comingSoon")}</span>
              )}
              {passed && (
                <span className="module-card__badge module-card__badge--passed">
                  <Check size={12} aria-hidden="true" /> {t("passedTag")}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { MODULES } from "../../content/modules";
import { isModulePassed } from "../../storage.js";
import { ContentIcon } from "../icons.jsx";

export default function ModuleList({ onOpenModule }) {
  const { t } = useTranslation("theory");

  return (
    <section className="theory">
      <h1>{t("title")}</h1>
      <p className="theory__subtitle">{t("subtitle")}</p>

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

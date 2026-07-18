/**
 * ModuleView — recorre las lecciones de un módulo y termina en el quiz.
 * El contenido (títulos, cuerpos) se resuelve por convención de claves i18n,
 * ver src/content/schema.js.
 */
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { getModule } from "../../content/modules";
import { ContentIcon } from "../icons.jsx";
import Quiz from "./Quiz.jsx";

export default function ModuleView({ moduleId, onBack }) {
  const { t } = useTranslation(["theory", "common"]);
  const [lessonIndex, setLessonIndex] = useState(0);
  const [inQuiz, setInQuiz] = useState(false);

  const module = getModule(moduleId);
  if (!module || module.status !== "available") return null;

  const lessons = module.lessons;
  const keyBase = `modules.${module.id}`;

  if (inQuiz) {
    return (
      <Quiz
        module={module}
        onBackToLessons={() => {
          setInQuiz(false);
          setLessonIndex(0);
        }}
        onExit={onBack}
      />
    );
  }

  const lesson = lessons[lessonIndex];
  const isLast = lessonIndex === lessons.length - 1;

  return (
    <section className="module">
      <button className="button button--ghost" onClick={onBack}>
        <ArrowLeft size={18} className="rtl-flip" aria-hidden="true" />{" "}
        {t("common:actions.back")}
      </button>

      <p className="module__eyebrow">
        <ContentIcon name={module.icon} size={18} /> {t(`${keyBase}.title`)}
      </p>
      <p className="module__progress">
        {t("lessonProgress", { current: lessonIndex + 1, total: lessons.length })}
      </p>

      <article className="lesson">
        <h1>{t(`${keyBase}.lessons.${lesson.id}.title`)}</h1>
        <p>{t(`${keyBase}.lessons.${lesson.id}.body`)}</p>
      </article>

      <div className="module__nav">
        <button
          className="button button--secondary"
          disabled={lessonIndex === 0}
          onClick={() => setLessonIndex((i) => i - 1)}
        >
          {t("common:actions.previous")}
        </button>
        {isLast ? (
          <button className="button button--primary" onClick={() => setInQuiz(true)}>
            {t("goToQuiz")}{" "}
            <ArrowRight size={18} className="rtl-flip" aria-hidden="true" />
          </button>
        ) : (
          <button
            className="button button--primary"
            onClick={() => setLessonIndex((i) => i + 1)}
          >
            {t("common:actions.next")}
          </button>
        )}
      </div>
    </section>
  );
}

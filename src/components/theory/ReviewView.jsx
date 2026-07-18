/**
 * ReviewView — repaso de fallos (patrón de teoria-suiza).
 *
 * Cola con las preguntas falladas en quizzes y exámenes: acertarla la
 * elimina de la lista; fallarla la manda al final de la cola. La sesión
 * termina cuando la cola queda vacía.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CircleCheck, RotateCcw } from "lucide-react";
import { getModule } from "../../content/modules";
import { clearFailedQuestion, getFailedQuestions } from "../../storage.js";

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ReviewView({ onBack }) {
  const { t } = useTranslation(["exam", "theory", "common"]);

  // Cola inicial: fallos guardados que siguen existiendo en el contenido
  const [queue, setQueue] = useState(() =>
    getFailedQuestions()
      .map(({ moduleId, questionId }) => {
        const question = getModule(moduleId)?.quiz?.questions.find(
          (q) => q.id === questionId
        );
        return question ? { moduleId, ...question } : null;
      })
      .filter(Boolean)
  );
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [sessionDone, setSessionDone] = useState(false);

  const current = queue[0] ?? null;

  // Orden de opciones de la pregunta actual (re-sortea al cambiar)
  const optionOrder = useMemo(() => {
    if (!current) return [];
    const count = t(
      `theory:modules.${current.moduleId}.quiz.${current.id}.options`
    ).length;
    return shuffled([...Array(count).keys()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.moduleId, current?.id, queue.length]);

  if (!current) {
    return (
      <section className="review review--empty">
        <RotateCcw size={40} aria-hidden="true" />
        <h1>{t("review.title")}</h1>
        <p>{sessionDone ? t("review.done") : t("review.empty")}</p>
        <button className="button button--primary" onClick={onBack}>
          {t("common:actions.back")}
        </button>
      </section>
    );
  }

  const base = `theory:modules.${current.moduleId}.quiz.${current.id}`;
  const options = t(`${base}.options`);
  const isCorrect = selected === current.correct;

  const check = () => {
    setChecked(true);
    if (selected === current.correct) clearFailedQuestion(current.moduleId, current.id);
  };

  const next = () => {
    const rest = queue.slice(1);
    const updated = isCorrect ? rest : [...rest, current]; // fallo → al final
    if (updated.length === 0) setSessionDone(true);
    setQueue(updated);
    setSelected(null);
    setChecked(false);
  };

  return (
    <section className="review">
      <button className="button button--ghost" onClick={onBack}>
        <ArrowLeft size={18} className="rtl-flip" aria-hidden="true" />{" "}
        {t("common:actions.back")}
      </button>
      <p className="module__eyebrow">
        <RotateCcw size={18} aria-hidden="true" /> {t("review.title")}
      </p>
      <p className="quiz__progress">{t("review.remaining", { count: queue.length })}</p>

      <h1 className="quiz__question">{t(`${base}.question`)}</h1>
      <div className="quiz__options">
        {optionOrder.map((optionIndex) => {
          let modifier = "";
          if (checked) {
            if (optionIndex === current.correct) modifier = "quiz__option--correct";
            else if (optionIndex === selected) modifier = "quiz__option--wrong";
          } else if (optionIndex === selected) {
            modifier = "quiz__option--selected";
          }
          return (
            <button
              key={optionIndex}
              className={`quiz__option ${modifier}`}
              disabled={checked}
              onClick={() => setSelected(optionIndex)}
            >
              {options[optionIndex]}
            </button>
          );
        })}
      </div>

      {checked && (
        <p className={`quiz__feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
          {isCorrect ? (
            <>
              <CircleCheck size={16} aria-hidden="true" /> {t("review.cleared")}
            </>
          ) : (
            t("review.keep")
          )}
        </p>
      )}

      {checked ? (
        <button className="button button--primary" onClick={next}>
          {t("common:actions.next")}
        </button>
      ) : (
        <button
          className="button button--primary"
          disabled={selected === null}
          onClick={check}
        >
          {t("theory:quiz.check")}
        </button>
      )}
    </section>
  );
}

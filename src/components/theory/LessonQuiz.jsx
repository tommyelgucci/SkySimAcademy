/**
 * LessonQuiz — mini-quiz de 3 preguntas al final de cada lección.
 *
 * Feedback inmediato con explicación (a diferencia del quiz final del
 * módulo, que no la muestra hasta el resumen). Las respuestas alimentan el
 * mismo sistema de repetición espaciada que el quiz y el examen: fallar una
 * pregunta aquí también la manda al repaso.
 */
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CircleCheck, CircleX } from "lucide-react";
import { clearFailedQuestion, recordFailedQuestion } from "../../storage.js";

function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function LessonQuiz({ moduleId, lessonId, questions }) {
  const { t } = useTranslation("theory");
  const keyBase = `modules.${moduleId}.quiz`;

  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);

  // La lección cambió (navegación previous/next): reinicia el mini-quiz.
  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setChecked(false);
  }, [lessonId]);

  const optionOrder = useMemo(() => {
    const question = questions[index];
    if (!question) return [];
    const count = t(`${keyBase}.${question.id}.options`).length;
    return shuffled([...Array(count).keys()]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions, index]);

  const question = questions[index];
  if (!question) return null;

  const base = `${keyBase}.${question.id}`;
  const options = t(`${base}.options`);
  const isCorrect = selected === question.correct;
  const isLast = index === questions.length - 1;

  const check = () => {
    setChecked(true);
    if (isCorrect) clearFailedQuestion(moduleId, question.id);
    else recordFailedQuestion(moduleId, question.id);
  };

  const next = () => {
    setIndex((i) => i + 1);
    setSelected(null);
    setChecked(false);
  };

  return (
    <div className="lesson-quiz">
      <p className="lesson-quiz__heading">{t("lessonQuiz.heading")}</p>
      <p className="quiz__progress">
        {t("quiz.questionProgress", { current: index + 1, total: questions.length })}
      </p>
      <p className="lesson-quiz__question">{t(`${base}.question`)}</p>
      <div className="quiz__options">
        {optionOrder.map((optionIndex) => {
          let modifier = "";
          if (checked) {
            if (optionIndex === question.correct) modifier = "quiz__option--correct";
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
        <div className={`lesson-quiz__feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
          <p className="quiz__feedback">
            {isCorrect ? (
              <>
                <CircleCheck size={16} aria-hidden="true" /> {t("quiz.correct")}
              </>
            ) : (
              <>
                <CircleX size={16} aria-hidden="true" /> {t("quiz.wrong")}
              </>
            )}
          </p>
          <p className="lesson-quiz__explanation">{t(`${base}.explanation`)}</p>
        </div>
      )}

      <div className="lesson-quiz__actions">
        {checked ? (
          !isLast && (
            <button className="button button--secondary" onClick={next}>
              {t("quiz.next")}
            </button>
          )
        ) : (
          <button
            className="button button--secondary"
            disabled={selected === null}
            onClick={check}
          >
            <Check size={16} aria-hidden="true" /> {t("quiz.check")}
          </button>
        )}
      </div>

      {checked && isLast && <p className="lesson-quiz__done">{t("lessonQuiz.done")}</p>}
    </div>
  );
}

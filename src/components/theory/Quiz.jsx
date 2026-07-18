/**
 * Quiz — cuestionario interactivo de un módulo.
 *
 * Las preguntas vienen del JSON de estructura (ids + índice correcto) y los
 * textos de i18next. El orden de las opciones se baraja una vez por sesión
 * de quiz para que la correcta no esté siempre en la misma posición.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { BookOpen, Check, Trophy } from "lucide-react";
import {
  clearFailedQuestion,
  recordFailedQuestion,
  recordQuizResult,
} from "../../storage.js";

/** Baraja de Fisher-Yates sin mutar el original. */
function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function Quiz({ module, onBackToLessons, onExit }) {
  const { t } = useTranslation("theory");
  const keyBase = `modules.${module.id}.quiz`;

  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState(null); // índice de opción elegido
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0); // fuerza resortear al repetir

  // Muestreo del banco: cada ronda sortea `sampleSize` preguntas distintas
  // (si el módulo no lo define, usa el banco completo). Así repetir el quiz
  // no es memorizar posiciones sino repasar de verdad.
  const questions = useMemo(() => {
    const bank = module.quiz.questions;
    const size = Math.min(module.quiz.sampleSize ?? bank.length, bank.length);
    return shuffled(bank).slice(0, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module.id, round]);

  // Orden de opciones por pregunta, estable durante toda la ronda
  const optionOrders = useMemo(
    () =>
      questions.map((question) => {
        const count = t(`${keyBase}.${question.id}.options`).length;
        return shuffled([...Array(count).keys()]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions]
  );

  const restart = () => {
    setQuestionIndex(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
    setFinished(false);
    setRound((r) => r + 1);
  };

  if (finished) {
    const passed = score >= module.quiz.passScore;
    return (
      <section className="quiz quiz--results">
        <div className={`quiz__result-icon ${passed ? "is-correct" : ""}`}>
          {passed ? (
            <Trophy size={56} aria-hidden="true" />
          ) : (
            <BookOpen size={56} aria-hidden="true" />
          )}
        </div>
        <p className="quiz__score">
          {t("quiz.score", { score, total: questions.length })}
        </p>
        <p>{passed ? t("quiz.passed") : t("quiz.failed")}</p>
        <div className="quiz__actions">
          {!passed && (
            <button className="button button--secondary" onClick={onBackToLessons}>
              {t("quiz.backToLessons")}
            </button>
          )}
          <button className="button button--primary" onClick={restart}>
            {t("quiz.restart")}
          </button>
          {passed && (
            <button className="button button--secondary" onClick={onExit}>
              <Check size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    );
  }

  const question = questions[questionIndex];
  const options = t(`${keyBase}.${question.id}.options`);
  const order = optionOrders[questionIndex];
  const isLast = questionIndex === questions.length - 1;
  const isCorrect = selected === question.correct;

  const check = () => {
    setChecked(true);
    if (selected === question.correct) {
      setScore((s) => s + 1);
      clearFailedQuestion(module.id, question.id); // acierto: sale del repaso
    } else {
      recordFailedQuestion(module.id, question.id); // fallo: entra al repaso
    }
  };

  const next = () => {
    if (isLast) {
      // Persistir el intento: desbloquea misiones y marca el módulo aprobado
      recordQuizResult(module.id, {
        score,
        total: questions.length,
        passed: score >= module.quiz.passScore,
      });
      setFinished(true);
    } else {
      setQuestionIndex((i) => i + 1);
      setSelected(null);
      setChecked(false);
    }
  };

  return (
    <section className="quiz">
      <p className="quiz__progress">
        {t("quiz.questionProgress", {
          current: questionIndex + 1,
          total: questions.length,
        })}
      </p>
      <h1 className="quiz__question">{t(`${keyBase}.${question.id}.question`)}</h1>

      <div className="quiz__options">
        {order.map((optionIndex) => {
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
        <p className={`quiz__feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
          {isCorrect ? t("quiz.correct") : t("quiz.wrong")}
        </p>
      )}

      {checked ? (
        <button className="button button--primary" onClick={next}>
          {isLast ? t("quiz.seeResults") : t("quiz.next")}
        </button>
      ) : (
        <button
          className="button button--primary"
          disabled={selected === null}
          onClick={check}
        >
          {t("quiz.check")}
        </button>
      )}
    </section>
  );
}

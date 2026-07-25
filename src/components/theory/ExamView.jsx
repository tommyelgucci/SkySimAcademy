/**
 * ExamView — modo examen tipo PPL.
 *
 * A diferencia del quiz de módulo: preguntas de TODOS los módulos (reparto
 * uniforme), temporizador y SIN feedback hasta el final — como el examen
 * real. Al terminar: nota, repaso de errores con la respuesta correcta, y
 * los fallos se apuntan a la lista de repaso (storage.failed).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, CircleCheck, CircleX, GraduationCap, Timer } from "lucide-react";
import { MODULES } from "../../content/modules";
import {
  clearFailedQuestion,
  getExamHistory,
  recordExamResult,
  recordFailedQuestion,
} from "../../storage.js";

const QUESTIONS_PER_MODULE = 4; // × 5 módulos = 20 preguntas
const EXAM_SECONDS = 20 * 60;
const PASS_RATIO = 0.75;

/** Baraja de Fisher-Yates sin mutar el original. */
function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export default function ExamView({ onBack }) {
  const { t, i18n } = useTranslation(["exam", "theory"]);
  const [phase, setPhase] = useState("intro"); // intro | running | results
  const [round, setRound] = useState(0);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState([]); // índice elegido o null
  const [selected, setSelected] = useState(null);
  const [timeLeft, setTimeLeft] = useState(EXAM_SECONDS);
  const finishedRef = useRef(false);

  // Sorteo del examen: reparto uniforme entre módulos disponibles
  const questions = useMemo(() => {
    const pool = MODULES.filter((m) => m.status === "available").flatMap((m) =>
      shuffled(m.quiz.questions)
        .slice(0, QUESTIONS_PER_MODULE)
        .map((q) => ({ moduleId: m.id, ...q }))
    );
    return shuffled(pool);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  // Orden de opciones por pregunta, estable durante el examen
  const optionOrders = useMemo(
    () =>
      questions.map((q) => {
        const count = t(`theory:modules.${q.moduleId}.quiz.${q.id}.options`).length;
        return shuffled([...Array(count).keys()]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [questions]
  );

  const finish = (finalAnswers) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    let score = 0;
    questions.forEach((q, i) => {
      if (finalAnswers[i] === q.correct) {
        score++;
        clearFailedQuestion(q.moduleId, q.id);
      } else {
        recordFailedQuestion(q.moduleId, q.id);
      }
    });
    recordExamResult({
      score,
      total: questions.length,
      passed: score >= Math.ceil(questions.length * PASS_RATIO),
    });
    setAnswers(finalAnswers);
    setPhase("results");
  };

  // Temporizador: al agotarse, el examen se entrega solo
  const answersRef = useRef(answers);
  answersRef.current = answers;
  useEffect(() => {
    if (phase !== "running") return;
    const interval = setInterval(() => {
      setTimeLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          finish(answersRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, round]);

  const start = () => {
    finishedRef.current = false;
    setRound((r) => r + 1);
    setIndex(0);
    setAnswers([]);
    setSelected(null);
    setTimeLeft(EXAM_SECONDS);
    setPhase("running");
  };

  const next = () => {
    const updated = [...answers];
    updated[index] = selected;
    if (index === questions.length - 1) {
      finish(updated);
    } else {
      setAnswers(updated);
      setSelected(null);
      setIndex(index + 1);
    }
  };

  const format = (value) => value.toLocaleString(i18n.resolvedLanguage);
  const minutes = Math.floor(timeLeft / 60);
  const seconds = String(timeLeft % 60).padStart(2, "0");

  if (phase === "intro") {
    const history = getExamHistory().slice(-5).reverse();
    return (
      <section className="exam">
        <button className="button button--ghost" onClick={onBack}>
          {t("exam.back")}
        </button>
        <div className="exam__hero">
          <GraduationCap size={40} aria-hidden="true" />
          <h1>{t("exam.title")}</h1>
          <p>{t("exam.description")}</p>
          <button className="button button--primary" onClick={start}>
            {t("exam.start")}
          </button>
        </div>
        {history.length > 0 && (
          <div className="exam__history">
            <h2>{t("exam.history")}</h2>
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

  if (phase === "results") {
    const score = questions.filter((q, i) => answers[i] === q.correct).length;
    const passed = score >= Math.ceil(questions.length * PASS_RATIO);
    const wrong = questions
      .map((q, i) => ({ ...q, given: answers[i] }))
      .filter((q) => q.given !== q.correct);
    return (
      <section className="exam">
        <div className="exam__hero">
          {passed ? (
            <CircleCheck size={48} className="is-correct" aria-hidden="true" />
          ) : (
            <CircleX size={48} className="is-wrong" aria-hidden="true" />
          )}
          <p className="exam__score">
            {t("exam.score", { score: format(score), total: format(questions.length) })}
          </p>
          <p>{passed ? t("exam.passed") : t("exam.failed")}</p>
          <div className="exam__actions">
            <button className="button button--primary" onClick={start}>
              {t("exam.retake")}
            </button>
            <button className="button button--secondary" onClick={onBack}>
              {t("exam.back")}
            </button>
          </div>
        </div>
        {wrong.length > 0 && (
          <div className="exam__errors">
            <h2>{t("exam.errorsTitle")}</h2>
            {wrong.map((q) => {
              const base = `theory:modules.${q.moduleId}.quiz.${q.id}`;
              const options = t(`${base}.options`);
              return (
                <article key={`${q.moduleId}/${q.id}`} className="exam-error">
                  <p className="exam-error__question">{t(`${base}.question`)}</p>
                  <p className="exam-error__given">
                    {t("exam.yourAnswer")}:{" "}
                    {q.given == null ? t("exam.noAnswer") : options[q.given]}
                  </p>
                  <p className="exam-error__correct">
                    {t("exam.correctAnswer")}: {options[q.correct]}
                  </p>
                  <p className="exam-error__explanation">{t(`${base}.explanation`)}</p>
                </article>
              );
            })}
          </div>
        )}
      </section>
    );
  }

  // phase === "running"
  const question = questions[index];
  const base = `theory:modules.${question.moduleId}.quiz.${question.id}`;
  const options = t(`${base}.options`);
  const isLast = index === questions.length - 1;

  return (
    <section className="exam">
      <div className="exam__bar">
        <span className="quiz__progress">
          {t("exam.progress", { current: format(index + 1), total: format(questions.length) })}
        </span>
        <span className={`exam__timer ${timeLeft <= 60 ? "is-wrong" : ""}`}>
          <Timer size={16} aria-hidden="true" /> {minutes}:{seconds}
        </span>
      </div>
      <h1 className="quiz__question">{t(`${base}.question`)}</h1>
      <div className="quiz__options">
        {optionOrders[index].map((optionIndex) => (
          <button
            key={optionIndex}
            className={`quiz__option ${selected === optionIndex ? "quiz__option--selected" : ""}`}
            onClick={() => setSelected(optionIndex)}
          >
            {options[optionIndex]}
          </button>
        ))}
      </div>
      <button className="button button--primary" disabled={selected === null} onClick={next}>
        {isLast ? (
          <>
            <Check size={18} aria-hidden="true" /> {t("exam.finish")}
          </>
        ) : (
          t("exam.next")
        )}
      </button>
    </section>
  );
}

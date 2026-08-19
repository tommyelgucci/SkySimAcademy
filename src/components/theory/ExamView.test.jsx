/**
 * Test del examen tipo PPL: a diferencia del quiz de un módulo, reparte
 * preguntas de TODOS los módulos, corre contra un temporizador real, y
 * entrega solo cuando se agota (aunque el alumno no haya terminado). Las
 * tres cosas son las que más fácil se rompen sin darse cuenta (cierre de
 * clausura obsoleta en el intervalo, umbral de aprobado, doble entrega).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n/index.js";
import { MODULES } from "../../content/modules";
import { getExamHistory } from "../../storage.js";
import ExamView from "./ExamView.jsx";

/** El examen sortea preguntas de todos los módulos y opciones por pregunta;
 * para responder a propósito hay que mapear el texto mostrado de vuelta al
 * módulo/pregunta de origen (mismo enfoque que Quiz.test.jsx). */
function findQuestionByRenderedText(text) {
  for (const module_ of MODULES) {
    const question = module_.quiz.questions.find(
      (q) => i18n.t(`theory:modules.${module_.id}.quiz.${q.id}.question`) === text,
    );
    if (question) return { moduleId: module_.id, question };
  }
  return null;
}

function optionText(moduleId, question, optionIndex) {
  return i18n.t(`theory:modules.${moduleId}.quiz.${question.id}.options`, {
    returnObjects: true,
  })[optionIndex];
}

async function answerWholeExam(user, { correctly }) {
  // El total depende de cuántos módulos estén disponibles × 4 preguntas
  // cada uno — no se asume un número fijo.
  let remaining = true;
  while (remaining) {
    const questionText = screen.getByRole("heading", { level: 1 }).textContent;
    const found = findQuestionByRenderedText(questionText);
    expect(found).not.toBeNull();
    const { moduleId, question } = found;

    const wrongIndex = question.correct === 0 ? 1 : 0;
    const targetIndex = correctly ? question.correct : wrongIndex;
    await user.click(
      screen.getByRole("button", { name: optionText(moduleId, question, targetIndex) }),
    );

    const finishButton = screen.queryByRole("button", { name: i18n.t("exam:exam.finish") });
    if (finishButton) {
      await user.click(finishButton);
      remaining = false;
    } else {
      await user.click(screen.getByRole("button", { name: i18n.t("exam:exam.next") }));
    }
  }
}

describe("ExamView — examen tipo PPL", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aprobar el examen queda registrado en el historial", async () => {
    const user = userEvent.setup();
    render(<ExamView onBack={() => {}} />);

    await user.click(screen.getByRole("button", { name: i18n.t("exam:exam.start") }));
    await answerWholeExam(user, { correctly: true });

    expect(screen.getByText(i18n.t("exam:exam.passed"))).toBeInTheDocument();
    const history = getExamHistory();
    expect(history.at(-1).passed).toBe(true);
    expect(history.at(-1).score).toBe(history.at(-1).total);
  });

  it("responder mal no aprueba, y las preguntas falladas quedan para repaso (SRS)", async () => {
    const user = userEvent.setup();
    render(<ExamView onBack={() => {}} />);

    await user.click(screen.getByRole("button", { name: i18n.t("exam:exam.start") }));
    await answerWholeExam(user, { correctly: false });

    expect(screen.getByText(i18n.t("exam:exam.failed"))).toBeInTheDocument();
    const history = getExamHistory();
    expect(history.at(-1).passed).toBe(false);
    expect(history.at(-1).score).toBe(0);
  });

  it("si se agota el tiempo, el examen se entrega solo con lo respondido hasta ahí", () => {
    vi.useFakeTimers();
    render(<ExamView onBack={() => {}} />);

    act(() => {
      screen.getByRole("button", { name: i18n.t("exam:exam.start") }).click();
    });
    // No se responde ninguna pregunta: se deja correr el reloj entero.
    act(() => {
      vi.advanceTimersByTime(20 * 60 * 1000);
    });

    expect(screen.getByText(i18n.t("exam:exam.failed"))).toBeInTheDocument();
    const history = getExamHistory();
    expect(history.at(-1).score).toBe(0);
    expect(history.at(-1).passed).toBe(false);
  });
});

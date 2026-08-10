/**
 * Test de integración del flujo crítico: responder el quiz de un módulo
 * persiste el progreso (storage.js) y eso es exactamente lo que decide si
 * una misión con `requiresModule` queda desbloqueada (ver
 * SimulatorView.jsx, que llama a `isModulePassed` para esa comprobación).
 */
import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n/index.js";
import { getModule } from "../../content/modules/index.js";
import { getFailedQuestions, isModulePassed } from "../../storage.js";
import Quiz from "./Quiz.jsx";

const module_ = getModule("principles-of-flight");
const keyBase = `modules.${module_.id}.quiz`;

/** El quiz sortea preguntas y opciones; para responder a propósito hay que
 * mapear el texto mostrado de vuelta al id de pregunta del banco. */
function findQuestionByRenderedText(text) {
  return module_.quiz.questions.find((q) => i18n.t(`theory:${keyBase}.${q.id}.question`) === text);
}

function optionText(question, optionIndex) {
  return i18n.t(`theory:${keyBase}.${question.id}.options`, { returnObjects: true })[optionIndex];
}

async function answerAllQuestions(user, { correctly }) {
  for (let i = 0; i < module_.quiz.sampleSize; i++) {
    const questionText = screen.getByRole("heading", { level: 1 }).textContent;
    const question = findQuestionByRenderedText(questionText);
    expect(question).toBeDefined();

    const wrongIndex = question.correct === 0 ? 1 : 0;
    const targetIndex = correctly ? question.correct : wrongIndex;
    await user.click(screen.getByRole("button", { name: optionText(question, targetIndex) }));
    await user.click(screen.getByRole("button", { name: i18n.t("theory:quiz.check") }));

    const isLast = i === module_.quiz.sampleSize - 1;
    const nextLabel = isLast ? i18n.t("theory:quiz.seeResults") : i18n.t("theory:quiz.next");
    await user.click(screen.getByRole("button", { name: nextLabel }));
  }
}

describe("Quiz — flujo completo (responder → guardar progreso → desbloquear misión)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("aprobar el quiz marca el módulo como aprobado (lo que desbloquea sus misiones)", async () => {
    const user = userEvent.setup();
    render(<Quiz module={module_} onBackToLessons={() => {}} onExit={() => {}} />);

    expect(isModulePassed(module_.id)).toBe(false);

    await answerAllQuestions(user, { correctly: true });

    expect(screen.getByText(i18n.t("theory:quiz.passed"))).toBeInTheDocument();
    expect(isModulePassed(module_.id)).toBe(true);
  });

  it("fallar el quiz no aprueba el módulo y encola las preguntas falladas para repaso (SRS)", async () => {
    const user = userEvent.setup();
    render(<Quiz module={module_} onBackToLessons={() => {}} onExit={() => {}} />);

    await answerAllQuestions(user, { correctly: false });

    expect(screen.getByText(i18n.t("theory:quiz.failed"))).toBeInTheDocument();
    expect(isModulePassed(module_.id)).toBe(false);
    const failedForModule = getFailedQuestions().filter((q) => q.moduleId === module_.id);
    expect(failedForModule.length).toBeGreaterThan(0);
  });
});

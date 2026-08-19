/**
 * ModuleList — la pantalla principal de teoría. Lo que tiene lógica real (no
 * solo texto): la insignia de "aprobado" por módulo, y la herramienta de
 * repaso que se habilita/deshabilita según haya o no preguntas falladas
 * pendientes — las dos leen directamente de storage.js, así que un test que
 * solo mirara el markup sin tocar storage no probaría nada.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import i18n from "../../i18n/index.js";
import { MODULES } from "../../content/modules";
import { recordFailedQuestion, recordQuizResult } from "../../storage.js";
import ModuleList from "./ModuleList.jsx";

const module_ = MODULES[0];

describe("ModuleList", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("la herramienta de repaso arranca deshabilitada sin preguntas falladas", () => {
    render(
      <ModuleList
        onOpenModule={() => {}}
        onOpenExam={() => {}}
        onOpenReview={() => {}}
        onOpenStats={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: new RegExp(i18n.t("exam:review.entry")) }),
    ).toBeDisabled();
  });

  it("falla una pregunta y la herramienta de repaso se habilita con el conteo", () => {
    recordFailedQuestion(module_.id, module_.quiz.questions[0].id);

    render(
      <ModuleList
        onOpenModule={() => {}}
        onOpenExam={() => {}}
        onOpenReview={() => {}}
        onOpenStats={() => {}}
      />,
    );
    const reviewButton = screen.getByRole("button", {
      name: new RegExp(i18n.t("exam:review.entry")),
    });
    expect(reviewButton).toBeEnabled();
    expect(reviewButton).toHaveTextContent(i18n.t("exam:review.toReview", { count: 1 }));
  });

  it("un módulo aprobado muestra la insignia de aprobado", () => {
    recordQuizResult(module_.id, { score: 5, total: 5, passed: true });

    render(
      <ModuleList
        onOpenModule={() => {}}
        onOpenExam={() => {}}
        onOpenReview={() => {}}
        onOpenStats={() => {}}
      />,
    );
    const card = screen.getByRole("button", {
      name: new RegExp(i18n.t(`theory:modules.${module_.id}.title`)),
    });
    expect(card).toHaveTextContent(i18n.t("theory:passedTag"));
  });

  it("tocar un módulo dispara onOpenModule con su id", async () => {
    const user = userEvent.setup();
    const onOpenModule = vi.fn();
    render(
      <ModuleList
        onOpenModule={onOpenModule}
        onOpenExam={() => {}}
        onOpenReview={() => {}}
        onOpenStats={() => {}}
      />,
    );
    await user.click(
      screen.getByRole("button", {
        name: new RegExp(i18n.t(`theory:modules.${module_.id}.title`)),
      }),
    );
    expect(onOpenModule).toHaveBeenCalledWith(module_.id);
  });
});

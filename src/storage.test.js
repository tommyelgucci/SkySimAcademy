import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/** localStorage no existe en el entorno de test (node): un mock mínimo basta. */
function installLocalStorageMock() {
  let store = {};
  global.localStorage = {
    getItem: (key) => (key in store ? store[key] : null),
    setItem: (key, value) => {
      store[key] = String(value);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
}

installLocalStorageMock();

const {
  clearFailedQuestion,
  getFailedQuestions,
  getSrsSummary,
  getStreak,
  getStudyDays,
  recordFailedQuestion,
  touchStudyDay,
} = await import("./storage.js");

const DAY_MS = 24 * 60 * 60 * 1000;

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-01-15T12:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("repetición espaciada (SRS)", () => {
  it("una pregunta recién fallada queda pendiente de repaso de inmediato", () => {
    recordFailedQuestion("principles-of-flight", "q1");
    expect(getFailedQuestions()).toEqual([
      { moduleId: "principles-of-flight", questionId: "q1" },
    ]);
  });

  it("acertar una pregunta nunca fallada no hace nada (no hay nada que dominar)", () => {
    clearFailedQuestion("principles-of-flight", "q1");
    expect(getFailedQuestions()).toEqual([]);
    expect(getSrsSummary()).toEqual({ total: 0, dueNow: 0, mastered: 0 });
  });

  it("acertarla la saca del repaso hasta que vuelve a vencer", () => {
    recordFailedQuestion("principles-of-flight", "q1");
    clearFailedQuestion("principles-of-flight", "q1"); // nivel 0 → 1, vence en 1 día
    expect(getFailedQuestions()).toEqual([]);

    vi.setSystemTime(new Date(Date.now() + DAY_MS + 1000));
    expect(getFailedQuestions()).toEqual([
      { moduleId: "principles-of-flight", questionId: "q1" },
    ]);
  });

  it("subir de nivel repetidamente aumenta el intervalo hasta considerarla dominada", () => {
    recordFailedQuestion("principles-of-flight", "q1");
    // niveles: 0 (recién fallada) → 1 → 2 → 3 (dominada)
    clearFailedQuestion("principles-of-flight", "q1");
    vi.setSystemTime(new Date(Date.now() + 2 * DAY_MS));
    clearFailedQuestion("principles-of-flight", "q1");
    vi.setSystemTime(new Date(Date.now() + 4 * DAY_MS));
    clearFailedQuestion("principles-of-flight", "q1");

    expect(getSrsSummary()).toEqual({ total: 1, dueNow: 0, mastered: 1 });
  });

  it("fallarla de nuevo la reinicia a nivel 0, pendiente ya mismo", () => {
    recordFailedQuestion("principles-of-flight", "q1");
    clearFailedQuestion("principles-of-flight", "q1"); // nivel 1, vence en 1 día
    recordFailedQuestion("principles-of-flight", "q1"); // fallo de nuevo: vuelve a nivel 0
    expect(getFailedQuestions()).toEqual([
      { moduleId: "principles-of-flight", questionId: "q1" },
    ]);
  });
});

describe("racha de estudio", () => {
  it("sin actividad, la racha es 0", () => {
    expect(getStreak()).toBe(0);
  });

  it("estudiar hoy da una racha de 1, e insertar el mismo día dos veces no lo duplica", () => {
    touchStudyDay();
    touchStudyDay();
    expect(getStudyDays()).toEqual(["2026-01-15"]);
    expect(getStreak()).toBe(1);
  });

  it("días consecutivos suman a la racha", () => {
    touchStudyDay();
    vi.setSystemTime(new Date("2026-01-16T09:00:00Z"));
    touchStudyDay();
    vi.setSystemTime(new Date("2026-01-17T09:00:00Z"));
    touchStudyDay();
    expect(getStreak()).toBe(3);
  });

  it("un día sin estudiar hoy no rompe la racha si se estudió ayer", () => {
    touchStudyDay();
    vi.setSystemTime(new Date("2026-01-16T09:00:00Z"));
    // avanza a "hoy" sin tocar touchStudyDay: la racha de ayer sigue vigente
    expect(getStreak()).toBe(1);
  });

  it("un hueco de más de un día rompe la racha", () => {
    touchStudyDay();
    vi.setSystemTime(new Date("2026-01-18T09:00:00Z")); // dos días después, sin estudiar entremedio
    expect(getStreak()).toBe(0);
  });
});

/**
 * Persistencia de progreso en localStorage (mismo patrón que teoria-suiza:
 * sin backend, el progreso vive en el dispositivo del usuario).
 *
 * Esquema versionado en la clave — si en el futuro cambia la estructura,
 * se incrementa `.v1` y se migra/descarta lo antiguo sin romper nada.
 *
 * Estructura:
 * {
 *   quizzes:   { [moduleId]: { bestScore, total, passed, attempts, lastAt } },
 *   missions:  { [missionId]: { completedAt } },
 *   srs:       { ["moduleId/questionId"]: { level, due } },  // repetición espaciada
 *   exams:     [ { score, total, passed, at } ],             // últimos intentos
 *   studyDays: ["YYYY-MM-DD", ...]                           // para la racha
 * }
 */
const KEY = "aerolearn.progress.v1";

// Repetición espaciada: nivel 0 (recién fallada) → intervalos crecientes en
// días hasta el nivel 5. A partir del nivel 3 se considera "dominada".
const SRS_INTERVALS_DAYS = [0, 1, 3, 7, 14, 30];
const SRS_MASTERED_LEVEL = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {}; // JSON corrupto o localStorage inaccesible (modo privado)
  }
}

function save(data) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Sin almacenamiento disponible: la app funciona igual, sin persistir
  }
}

/** Registra un intento de quiz; conserva la mejor puntuación histórica. */
export function recordQuizResult(moduleId, { score, total, passed }) {
  const data = load();
  const previous = data.quizzes?.[moduleId];
  data.quizzes = {
    ...data.quizzes,
    [moduleId]: {
      bestScore: Math.max(previous?.bestScore ?? 0, score),
      total,
      passed: (previous?.passed ?? false) || passed,
      attempts: (previous?.attempts ?? 0) + 1,
      lastAt: Date.now(),
    },
  };
  save(data);
  touchStudyDay();
}

/** ¿El usuario ha aprobado el quiz de este módulo alguna vez? */
export function isModulePassed(moduleId) {
  return load().quizzes?.[moduleId]?.passed ?? false;
}

/** Resultado guardado de un módulo (o null si nunca se intentó). */
export function getQuizResult(moduleId) {
  return load().quizzes?.[moduleId] ?? null;
}

/** Marca una misión del simulador como completada (idempotente). */
export function recordMissionComplete(missionId) {
  const data = load();
  data.missions = {
    ...data.missions,
    [missionId]: {
      completedAt: data.missions?.[missionId]?.completedAt ?? Date.now(),
    },
  };
  save(data);
  touchStudyDay();
}

/** ¿Está completada esta misión? */
export function isMissionComplete(missionId) {
  return Boolean(load().missions?.[missionId]);
}

/** Apunta una pregunta fallada para el repaso: nivel 0, pendiente ya mismo. */
export function recordFailedQuestion(moduleId, questionId) {
  const data = load();
  data.srs = {
    ...data.srs,
    [`${moduleId}/${questionId}`]: { level: 0, due: Date.now() },
  };
  save(data);
}

/**
 * Sube de nivel una pregunta al acertarla (en quiz, examen o repaso), alejando
 * su próxima fecha de repaso. Si nunca se había fallado, no hace nada — no
 * hay nada que "dominar" en el repaso.
 */
export function clearFailedQuestion(moduleId, questionId) {
  const data = load();
  const key = `${moduleId}/${questionId}`;
  const entry = data.srs?.[key];
  if (!entry) return;
  const level = Math.min(entry.level + 1, SRS_INTERVALS_DAYS.length - 1);
  data.srs = {
    ...data.srs,
    [key]: { level, due: Date.now() + SRS_INTERVALS_DAYS[level] * DAY_MS },
  };
  save(data);
}

/** Preguntas pendientes de repaso AHORA MISMO (nivel SRS vencido), de más a menos atrasadas. */
export function getFailedQuestions() {
  const srs = load().srs ?? {};
  const now = Date.now();
  return Object.entries(srs)
    .filter(([, entry]) => entry.due <= now)
    .sort(([, a], [, b]) => a.due - b.due)
    .map(([key]) => {
      const [moduleId, questionId] = key.split("/");
      return { moduleId, questionId };
    });
}

/** Resumen del repaso espaciado: cuántas preguntas hay en curso vs. dominadas. */
export function getSrsSummary() {
  const srs = load().srs ?? {};
  const entries = Object.values(srs);
  const mastered = entries.filter((e) => e.level >= SRS_MASTERED_LEVEL).length;
  return {
    total: entries.length,
    dueNow: entries.filter((e) => e.due <= Date.now()).length,
    mastered,
  };
}

/**
 * ¿Se ha obtenido la licencia de este nivel? (todas sus misiones completadas
 * y todos sus módulos de teoría exigidos aprobados). Derivado del progreso
 * ya guardado — no persiste nada nuevo.
 * @param {{missionIds: string[], requiresModules?: string[]}} level
 */
export function isLevelComplete(level) {
  return (
    level.missionIds.every(isMissionComplete) &&
    (level.requiresModules ?? []).every(isModulePassed)
  );
}

/** Progreso de misiones de un nivel, para mostrar "2/3" en la UI. */
export function levelProgress(level) {
  const done = level.missionIds.filter(isMissionComplete).length;
  return { done, total: level.missionIds.length };
}

/** Guarda un intento de examen; conserva los últimos 20. */
export function recordExamResult({ score, total, passed }) {
  const data = load();
  data.exams = [...(data.exams ?? []), { score, total, passed, at: Date.now() }].slice(-20);
  save(data);
  touchStudyDay();
}

/** Historial de exámenes, del más antiguo al más reciente. */
export function getExamHistory() {
  return load().exams ?? [];
}

/** Marca el día de hoy como día de estudio (idempotente); conserva los últimos 90. */
export function touchStudyDay() {
  const data = load();
  const days = data.studyDays ?? [];
  const today = todayKey();
  if (!days.includes(today)) {
    data.studyDays = [...days, today].sort().slice(-90);
    save(data);
  }
}

/** Días de estudio registrados (YYYY-MM-DD), del más antiguo al más reciente. */
export function getStudyDays() {
  return load().studyDays ?? [];
}

/** Racha actual de días consecutivos de estudio (puede terminar hoy o ayer). */
export function getStreak() {
  const days = new Set(getStudyDays());
  let streak = 0;
  const cursor = new Date();
  if (!days.has(todayKey())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

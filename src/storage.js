/**
 * Persistencia de progreso en localStorage (mismo patrón que teoria-suiza:
 * sin backend, el progreso vive en el dispositivo del usuario).
 *
 * Esquema versionado en la clave — si en el futuro cambia la estructura,
 * se incrementa `.v1` y se migra/descarta lo antiguo sin romper nada.
 *
 * Estructura:
 * {
 *   quizzes:  { [moduleId]: { bestScore, total, passed, attempts, lastAt } },
 *   missions: { [missionId]: { completedAt } }
 * }
 */
const KEY = "aerolearn.progress.v1";

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
}

/** ¿Está completada esta misión? */
export function isMissionComplete(missionId) {
  return Boolean(load().missions?.[missionId]);
}

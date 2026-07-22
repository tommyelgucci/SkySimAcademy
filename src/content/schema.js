/**
 * Esquema de datos de los módulos de teoría.
 *
 * Principio clave: los archivos de módulo definen SOLO estructura (ids, orden,
 * respuestas correctas). Ningún texto visible vive aquí — todo el texto se
 * resuelve vía i18next en el namespace "theory" siguiendo la convención:
 *
 *   theory:modules.<moduleId>.title
 *   theory:modules.<moduleId>.description
 *   theory:modules.<moduleId>.lessons.<lessonId>.title
 *   theory:modules.<moduleId>.lessons.<lessonId>.body           (párrafos separados por "\n\n")
 *   theory:modules.<moduleId>.lessons.<lessonId>.keyTakeaway
 *   theory:modules.<moduleId>.lessons.<lessonId>.simTip
 *   theory:modules.<moduleId>.quiz.<questionId>.question
 *   theory:modules.<moduleId>.quiz.<questionId>.options          (array)
 *   theory:modules.<moduleId>.quiz.<questionId>.explanation
 *
 * Así, añadir un módulo nuevo = 1 archivo JSON de estructura + sus claves en
 * los 5 locales. Ningún componente cambia. Si a un idioma le falta una clave,
 * i18next hace fallback a inglés automáticamente.
 *
 * Cada lección trae su propio mini-quiz de 3 preguntas (repaso inmediato con
 * explicación al responder). El quiz del módulo (usado por Quiz.jsx para el
 * aprobado/insignia y por ExamView.jsx como banco del examen general) NO se
 * escribe a mano: `deriveModuleQuiz` lo arma juntando las preguntas de todas
 * las lecciones, para que no haya que mantener dos bancos sincronizados.
 * Los ids de pregunta deben ser únicos dentro del módulo (convención:
 * `<lessonId>-q<n>`) porque conviven en el mismo objeto plano de i18n.
 *
 * @typedef {Object} TheoryModule
 * @property {string}   id        Slug único (coincide con la clave i18n).
 * @property {string}   icon      Nombre de icono Lucide registrado en
 *                                src/components/icons.jsx (MODULE_ICONS).
 * @property {number}   order     Posición en la lista de módulos.
 * @property {"available"|"coming-soon"} status
 * @property {Lesson[]} [lessons] Lecciones en orden de lectura.
 * @property {ModuleQuizConfig} [quiz] Configuración del quiz final del módulo
 *                                (passScore/sampleSize; `questions` se deriva).
 *
 * @typedef {Object} Lesson
 * @property {string} id   Slug de la lección (coincide con la clave i18n).
 * @property {Quiz}   quiz Mini-quiz de la lección (3 preguntas recomendadas).
 *
 * @typedef {Object} ModuleQuizConfig
 * @property {number} passScore  Mínimo de aciertos para aprobar (sobre las
 *                                preguntas mostradas en la ronda).
 * @property {number} [sampleSize] Preguntas sorteadas del banco derivado por
 *                                intento; si falta, se usa el banco entero.
 *
 * @typedef {Object} Quiz
 * @property {Question[]} questions Banco de preguntas de esta lección.
 *
 * @typedef {Object} Question
 * @property {string} id      Slug de la pregunta, único en el módulo.
 * @property {number} correct Índice de la opción correcta en el array i18n.
 */

/**
 * Junta las preguntas de todas las lecciones en el banco del quiz del módulo.
 * Pura: no muta `module`, devuelve una copia con `quiz.questions` poblado.
 *
 * Retrocompatible: si ninguna lección declara su propio `quiz` (formato
 * antiguo, banco de preguntas a nivel de módulo), no toca nada — así los
 * módulos aún no migrados a lecciones con mini-quiz siguen funcionando con
 * su `quiz.questions` ya escrito a mano.
 * @param {TheoryModule} module
 * @returns {TheoryModule}
 */
export function deriveModuleQuiz(module) {
  const hasLessonQuizzes = module.lessons?.some((lesson) => lesson.quiz?.questions?.length);
  if (!hasLessonQuizzes) return module;
  const questions = module.lessons.flatMap((lesson) => lesson.quiz?.questions ?? []);
  return { ...module, quiz: { ...module.quiz, questions } };
}

/**
 * Validación ligera en desarrollo: detecta módulos malformados al arrancar
 * en lugar de fallar silenciosamente en producción.
 * @param {TheoryModule} module
 * @returns {TheoryModule} el mismo módulo (para encadenar en el registro)
 */
export function validateModule(module) {
  if (!import.meta.env.DEV) return module;
  const problems = [];
  if (!module.id) problems.push("falta `id`");
  if (!["available", "coming-soon"].includes(module.status))
    problems.push(`status inválido: ${module.status}`);
  if (module.status === "available") {
    if (!module.lessons?.length) problems.push("módulo disponible sin lecciones");

    const seenIds = new Set();
    module.lessons?.forEach((lesson) => {
      if (!lesson.quiz) return; // formato antiguo: el banco vive a nivel de módulo
      const questions = lesson.quiz.questions ?? [];
      if (questions.length !== 3)
        problems.push(`lección "${lesson.id}" no tiene exactamente 3 preguntas (tiene ${questions.length})`);
      questions.forEach((q) => {
        if (typeof q.correct !== "number")
          problems.push(`pregunta ${q.id} sin índice \`correct\``);
        if (seenIds.has(q.id)) problems.push(`id de pregunta repetido en el módulo: ${q.id}`);
        seenIds.add(q.id);
      });
    });

    if (!module.quiz?.questions?.length) problems.push("módulo disponible sin quiz derivado");
    const size = module.quiz?.sampleSize;
    if (size != null && module.quiz.passScore > size)
      problems.push(`passScore (${module.quiz.passScore}) > sampleSize (${size})`);
  }
  if (problems.length)
    console.warn(`[content] Módulo "${module.id}" malformado:`, problems);
  return module;
}

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
 *   theory:modules.<moduleId>.lessons.<lessonId>.body
 *   theory:modules.<moduleId>.quiz.<questionId>.question
 *   theory:modules.<moduleId>.quiz.<questionId>.options   (array)
 *
 * Así, añadir un módulo nuevo = 1 archivo JSON de estructura + sus claves en
 * los 5 locales. Ningún componente cambia. Si a un idioma le falta una clave,
 * i18next hace fallback a inglés automáticamente.
 *
 * @typedef {Object} TheoryModule
 * @property {string}   id        Slug único (coincide con la clave i18n).
 * @property {string}   icon      Nombre de icono Lucide registrado en
 *                                src/components/icons.jsx (MODULE_ICONS).
 * @property {number}   order     Posición en la lista de módulos.
 * @property {"available"|"coming-soon"} status
 * @property {Lesson[]} [lessons] Lecciones en orden de lectura.
 * @property {Quiz}     [quiz]    Cuestionario final del módulo.
 *
 * @typedef {Object} Lesson
 * @property {string} id Slug de la lección (coincide con la clave i18n).
 *
 * @typedef {Object} Quiz
 * @property {number}     passScore Mínimo de aciertos para aprobar.
 * @property {Question[]} questions
 *
 * @typedef {Object} Question
 * @property {string} id      Slug de la pregunta (coincide con la clave i18n).
 * @property {number} correct Índice de la opción correcta en el array i18n.
 */

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
    if (!module.quiz?.questions?.length) problems.push("módulo disponible sin quiz");
    module.quiz?.questions?.forEach((q) => {
      if (typeof q.correct !== "number")
        problems.push(`pregunta ${q.id} sin índice \`correct\``);
    });
  }
  if (problems.length)
    console.warn(`[content] Módulo "${module.id}" malformado:`, problems);
  return module;
}

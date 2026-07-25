/**
 * Ids de los diagramas de lección disponibles.
 *
 * Vive en un módulo JS plano (y no dentro de `LessonDiagram.jsx`) a
 * propósito: `scripts/check-i18n.mjs` corre en Node sin transformar JSX, así
 * que no puede importar el componente. Teniendo la lista aquí, la validación
 * puede comprobar de verdad que cada `"diagram"` de los módulos existe y que
 * todos tienen sus etiquetas en los 5 idiomas.
 *
 * El componente importa esta misma lista y falla en desarrollo si se le
 * olvida implementar alguno.
 */
export const DIAGRAM_IDS = [
  "four-forces",
  "angle-of-attack",
  "three-axes",
  "glide-ratio",
  "glideslope",
  "moment",
  "airspace",
];

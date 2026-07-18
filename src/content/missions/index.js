/**
 * Misiones del simulador — el puente entre teoría y práctica.
 *
 * Igual que los módulos de teoría: aquí solo vive la ESTRUCTURA (objetivos
 * numéricos, requisitos de desbloqueo, icono). Los textos se resuelven en
 * i18next, namespace "simulator", claves `missions.<id>.title/.objective`.
 *
 * `requiresModule` liga cada misión a un módulo de teoría: la misión se
 * desbloquea al aprobar su quiz (ver storage.isModulePassed). Las misiones
 * sin requisito están siempre disponibles.
 *
 * Tipos de objetivo (evaluados por src/simulator/MissionTracker.js):
 *  - null                → vuelo libre, termina solo por tiempo o crash
 *  - { type: "altitude", target }
 *  - { type: "heading", target, tolerance, minAltitude, holdSeconds }
 *  - { type: "landing", minAltitude }  → subir y volver a tierra sin crash
 */
export const MISSIONS = [
  {
    id: "free-flight",
    icon: "joystick",
    goal: null,
  },
  {
    id: "first-takeoff",
    icon: "plane-takeoff",
    requiresModule: "principles-of-flight",
    goal: { type: "altitude", target: 100 },
  },
  {
    id: "heading-turn",
    icon: "compass",
    requiresModule: "principles-of-flight",
    goal: { type: "heading", target: 270, tolerance: 12, minAltitude: 40, holdSeconds: 3 },
  },
  {
    id: "safe-landing",
    icon: "plane-landing",
    requiresModule: "principles-of-flight",
    goal: { type: "landing", minAltitude: 60 },
  },
];

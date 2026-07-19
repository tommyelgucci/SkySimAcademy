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
 *  - { type: "altitudeHold", target, band, holdSeconds, minAltitude? }
 *    → mantener la altitud dentro de ±band durante holdSeconds (vuelo nivelado)
 *  - { type: "bankTurn", bankTarget, tolerance, minAltitude, holdSeconds }
 *    → mantener un ángulo de banco objetivo (viraje estándar); bankTarget
 *      con signo, + = derecha
 *  - { type: "engineOut", armAltitude, touchdownSpeed }
 *    → al alcanzar armAltitude el ejercicio corta los gases (ver
 *      SimulatorView); hay que planear y tocar pista por debajo de
 *      touchdownSpeed sin motor
 *  - { type: "stallRecovery", minAltitude, recoverSpeed }
 *    → provocar la pérdida por encima de minAltitude y recuperar
 *      velocidad ≥ recoverSpeed sin tocar tierra ni chocar
 *
 * Las misiones se agrupan en niveles con licencia en
 * src/content/levels/index.js (LEVELS referencia estos ids).
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
    // Requiere "instrumentos de cabina": ahí se aprende qué es un rumbo
    id: "heading-turn",
    icon: "compass",
    requiresModule: "cockpit-instruments",
    goal: { type: "heading", target: 270, tolerance: 12, minAltitude: 40, holdSeconds: 3 },
  },
  {
    id: "safe-landing",
    icon: "plane-landing",
    requiresModule: "principles-of-flight",
    goal: { type: "landing", minAltitude: 60 },
  },
  {
    // Requiere "navegación básica": mantener un rumbo es navegar por estima
    id: "cross-country",
    icon: "map",
    requiresModule: "navigation-basics",
    goal: { type: "heading", target: 90, tolerance: 12, minAltitude: 80, holdSeconds: 4 },
  },
  {
    id: "level-flight",
    icon: "move-horizontal",
    requiresModule: "cockpit-instruments",
    goal: { type: "altitudeHold", target: 120, band: 15, holdSeconds: 8, minAltitude: 40 },
  },
  {
    id: "standard-turn",
    icon: "rotate-cw",
    requiresModule: "cockpit-instruments",
    goal: { type: "bankTurn", bankTarget: 30, tolerance: 8, minAltitude: 50, holdSeconds: 5 },
  },
  {
    id: "nav-leg",
    icon: "route",
    requiresModule: "navigation-basics",
    goal: { type: "heading", target: 180, tolerance: 10, minAltitude: 100, holdSeconds: 6 },
  },
  {
    id: "engine-out",
    icon: "triangle-alert",
    requiresModule: "principles-of-flight",
    goal: { type: "engineOut", armAltitude: 80, touchdownSpeed: 8 },
  },
  {
    id: "stall-recovery",
    icon: "life-buoy",
    requiresModule: "principles-of-flight",
    goal: { type: "stallRecovery", minAltitude: 100, recoverSpeed: 22 },
  },
];

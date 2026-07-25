/**
 * Niveles de la escuela de vuelo — agrupan misiones del simulador en una
 * progresión con licencia. Solo estructura (ids de misión, módulos de
 * teoría exigidos, icono); los textos viven en i18next, namespace
 * "simulator", claves `levels.<levelId>.title` / `.subtitle`.
 *
 * Una licencia se considera obtenida cuando se cumplen TODAS sus misiones
 * (`storage.isMissionComplete`) Y se ha aprobado el quiz de TODOS sus
 * módulos de teoría exigidos (`storage.isModulePassed`) — ver
 * `isLevelComplete`/`levelProgress` en `src/storage.js`. No hay bloqueo
 * secuencial entre niveles: el único cerrojo es `requiresModule` por
 * misión (definido en `src/content/missions/index.js`).
 */
export const LEVELS = [
  {
    id: "student-pilot",
    icon: "graduation-cap",
    missionIds: ["free-flight", "first-takeoff", "safe-landing"],
    requiresModules: ["principles-of-flight"],
  },
  {
    id: "instrument-basics",
    icon: "gauge",
    missionIds: ["heading-turn", "level-flight", "standard-turn"],
    requiresModules: ["cockpit-instruments"],
  },
  {
    id: "navigation",
    icon: "map",
    missionIds: ["cross-country", "nav-leg"],
    requiresModules: ["navigation-basics"],
  },
  {
    id: "emergency",
    icon: "life-buoy",
    missionIds: ["engine-out", "stall-recovery"],
    requiresModules: ["principles-of-flight"],
  },
];

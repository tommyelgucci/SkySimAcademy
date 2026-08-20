# Checkpoint

Bitácora de sesiones de trabajo. Cada entrada resume qué se hizo, en qué
quedó el proyecto y qué sigue — para que la próxima sesión (humana o de
Claude Code) no tenga que reconstruir el contexto desde cero.

Entrada nueva arriba. Una entrada por sesión de trabajo relevante, no por
commit.

---

## 2026-08-20 — Dos módulos de teoría nuevos: Aircraft systems y Advanced ATC

**Qué se hizo** (siguiendo la instrucción de trabajar el backlog de más
fácil a más difícil — ver entradas anteriores para tests/flashcards/misión
de este mismo ciclo):

- **Contenido:** 2 módulos nuevos, 12º y 13º del catálogo.
  - `aircraft-systems` (icono `wrench`, orden 12): motor, sistema de
    combustible, sistema eléctrico, mandos de vuelo, tren de aterrizaje y
    frenos, pitot-estática/aviónica, redundancia y fallos de sistema.
  - `advanced-atc` (icono `tower-control`, orden 13): qué exige cada clase
    de espacio aéreo, autorizaciones VFR/IFR, fraseología avanzada, radar
    y flight following, esperas, procedimientos de emergencia con ATC,
    diferencias internacionales/OACI. Construye explícitamente sobre
    `regulations` sin duplicar contenido (la lección de clases de espacio
    aéreo cubre ahí los requisitos de ATC, no los mínimos meteorológicos
    ya vistos en `regulations`).
  - 7 lecciones × 3 preguntas cada módulo, quiz derivado como siempre.
    Iconos `Wrench` y `TowerControl` añadidos a `icons.jsx`.
  - Traducción real a los 5 idiomas (de/es/pt/ar), verificada contra
    `flight-planning` y `regulations` para mantener tono y terminología;
    el árabe se revisó explícitamente en RTL en navegador (sin
    numerales arábigo-índicos, según la convención del proyecto).
  - A petición explícita del dueño del proyecto, el contenido en inglés
    se construyó y verificó primero, y las traducciones se hicieron en un
    segundo commit separado — así el trabajo quedó revisable por partes
    aunque ambos terminaron en la misma sesión.

**Estado al cierre:** `npm run lint`, `npm run format:check`, `npm run
check:i18n` (13 módulos × 5 idiomas), `npm test` (72/72) y `npm run
build`, todos en verde. 2 commits en `claude/skysimacademy-proyecto-727t5j`
(módulos en inglés · traducciones a los 4 idiomas restantes), pusheados.

**Próximo paso sugerido:** ver `RUMBO.md` — con 13 módulos y 11 misiones
cubiertos, quedan "validar con usuarios reales" y la versión "instructor"
(requiere decidir si rompe la filosofía sin-backend) como los pendientes
más grandes sin empezar.

---

## 2026-08-10 (2) — Módulo nuevo, ESLint/Prettier, tests, auditoría a11y

**Qué se hizo** (priorizado por el dueño del proyecto: Contenido nuevo +
Calidad/infraestructura + documentar analítica sin activarla — ver
`RUMBO.md` → Decisiones):

- **Contenido:** 11º módulo de teoría, "Planificación de vuelo"
  (`src/content/modules/flight-planning.json`, orden 11, icono
  `clipboard-list`). 7 lecciones (por qué importa, ruta y cartas,
  combustible y reservas, alternos y mínimos meteorológicos, NOTAM y
  partes, presentar y seguir un plan, decisión de ir/no ir), mini-quiz de
  3 preguntas c/u, traducido de verdad a los 5 idiomas.
- **ESLint + Prettier:** `eslint.config.js` (flat config, react +
  react-hooks + react-refresh), `.prettierrc.json`, scripts `lint` /
  `format` / `format:check`, integrados a `ci.yml`. El lint encontró y se
  corrigieron 3 problemas reales (ver commits); las 2 reglas nuevas de
  "preparación para React Compiler" de eslint-plugin-react-hooks v7
  quedaron en `warn` con la justificación en `eslint.config.js` y
  `CLAUDE.md` (el proyecto no usa el Compiler; los patrones flagged son
  los que la propia documentación de React recomienda para este caso).
  Reformateo completo del repo con Prettier en un commit `style:` aparte.
- **Tests de componentes:** `ErrorBoundary.test.jsx` y
  `LanguageSwitcher.test.jsx` (antes solo `Quiz.test.jsx`). De paso se
  encontró y arregló una falta de `afterEach(cleanup)` en
  `src/test/setup.js` — sin `test.globals: true`, RTL no limpiaba el DOM
  entre tests del mismo archivo.
- **Auditoría de accesibilidad** (manual, sin herramienta automatizada):
  botones de solo-icono con `aria-label`, toggles con `role="switch"` +
  `aria-checked`, radiogroups con roles correctos, iconos `aria-hidden`,
  sin `<div>`/`<span>` con `onClick` y sin equivalente de teclado,
  contraste de color calculado con la fórmula WCAG para los pares
  texto/fondo del tema (todos ≥ 6.4:1, muy por encima del mínimo AA de
  4.5:1), jerarquía de encabezados coherente con el patrón de mini-router
  (un `<h1>` por pantalla). Sin hallazgos que corregir.
- **Analítica:** documentado en el README (sección "Activar la analítica
  opcional") el paso a paso para activar `VITE_PLAUSIBLE_DOMAIN` cuando
  el dueño del proyecto tenga un dominio de Plausible — no se activó
  nada, a pedido explícito.

**Estado al cierre:** `npm run lint` (0 errores, 8 warnings documentados),
`npm run format:check`, `npm run check:i18n` (11 módulos), `npm test`
(59/59) y `npm run build`, todos en verde. 4 commits en
`claude/skysimacademy-proyecto-gudxjy` (módulo nuevo · ESLint/Prettier +
fixes · reformateo · tests de componentes) más este de documentación.

**Próximo paso sugerido:** ver `RUMBO.md` — quedan sin marcar "más
módulos", "más misiones/escenarios", "más flashcards", "validar con
usuarios reales" y la versión "instructor" (esta última requiere decidir
si se rompe la filosofía sin-backend antes de tocar código).

---

## 2026-08-10 — Revisión de estado + documentación de contexto

**Qué se hizo:**

- Se clonó el repo y se revisó el estado completo del proyecto: código,
  README, historial de git, issues/PRs en GitHub.
- Se corrieron los tres chequeos de CI en local: `npm test` (53 tests, 5
  archivos, todos pasan), `npm run check:i18n` (5 idiomas × 5 namespaces,
  10 módulos, 19 flashcards, sin faltantes) y `npm run build` (compila
  limpio, code-splitting por idioma/módulo funcionando).
- Se confirmó: 0 issues abiertos, 0 PRs abiertos. La única PR histórica
  (#1 — tests de componentes, OG tags, analítica opcional, code-splitting
  de idiomas) está mergeada desde 2026-07-24.
- Se creó `CLAUDE.md` (contexto/convenciones para agentes), `RUMBO.md`
  (dirección estratégica — el roadmap del README está 100% completo, así
  que se abrió este documento para las próximas líneas de trabajo) y este
  mismo `CHECKPOINT.md`.

**Estado al cierre:** proyecto sano, sin deuda técnica visible, sin
bloqueadores. El "Roadmap sugerido" del README tiene sus 17 ítems
marcados `[x]`. Lo que sigue es decisión de producto, no arreglos — ver
`RUMBO.md` para las líneas propuestas.

**Próximo paso sugerido:** el dueño del proyecto prioriza entre las
líneas de `RUMBO.md` (contenido nuevo, activar analítica, validación con
usuarios reales, lint/accesibilidad, etc.) antes de que una sesión futura
empiece a implementar algo.

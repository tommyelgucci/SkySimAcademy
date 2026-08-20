# Checkpoint

Bitácora de sesiones de trabajo. Cada entrada resume qué se hizo, en qué
quedó el proyecto y qué sigue — para que la próxima sesión (humana o de
Claude Code) no tenga que reconstruir el contexto desde cero.

Entrada nueva arriba. Una entrada por sesión de trabajo relevante, no por
commit.

---

## 2026-08-19 — Tercer mazo de flashcards + tests de ExamView/ModuleList

**Qué se hizo** (PR #8, mergeado directo por otra sesión de Claude Code
mientras esta sesión revisaba el estado del proyecto — ver nota de
"Contexto compartido" al pie):

- **Contenido:** tercer mazo de flashcards —
  `src/content/flashcards/index.js` — alfabeto radiotelefónico OACI (26
  tarjetas, una por letra: Alfa, Bravo, Charlie... Juliett con dos T,
  X-ray). Deletreo idéntico al ya usado en el módulo de teoría
  `radio-alphabet`, para no contradecir contenido existente. Cada
  tarjeta pide elegir la palabra OACI correcta entre 4 opciones; los
  distractores son otras palabras reales del alfabeto (offset fijo,
  nunca se repiten ni coinciden con la correcta). Las 26 palabras OACI
  no se traducen (estándar internacional); la pregunta y la explicación
  sí, a los 5 idiomas. `scripts/check-i18n.mjs` extendido para validar
  el mazo nuevo igual que los otros dos.
- **Tests de componentes:** `ExamView.test.jsx` (aprobar/reprobar queda
  en el historial con la nota correcta; si se agota el temporizador de
  20 min el examen se entrega solo con lo respondido hasta ese momento)
  y `ModuleList.test.jsx` (la herramienta de repaso se
  habilita/deshabilita según haya preguntas falladas pendientes con el
  conteo correcto, la insignia de "aprobado" aparece cuando corresponde,
  tocar un módulo dispara el callback con el id correcto). Mismo patrón
  que `Quiz.test.jsx`: i18n real (no mockeado), localStorage real
  limpiado antes de cada test, clicks vía `userEvent`.

**Resuelve dos líneas de `RUMBO.md`:** "Más mazos de flashcards" (ahora
son 3: instrumentos, alertas de cabina, alfabeto radiotelefónico) y
amplía "cobertura de tests de componentes React" (`ExamView` y
`ModuleList` sumados a `Quiz`, `ErrorBoundary`, `LanguageSwitcher`).

**Estado al cierre:** `npm run lint` (0 errores, 8 warnings ya
documentados), `npm run format:check`, `npm run check:i18n` (5 idiomas,
11 módulos, **45 flashcards**), `npm test` (**66/66**, 9 archivos) y
`npm run build`, todos en verde.

**Nota de contexto compartido:** esta sesión (la que revisa `RUMBO.md`/
`CHECKPOINT.md` más abajo, entrada 2026-08-16/17) descubrió este PR ya
mergeado en `origin/main` mientras armaba su propio plan de trabajo —
otra instancia de Claude Code lo implementó y mergeó en paralelo. Se
documenta acá para que quede registro aunque no haya una entrada previa
de "qué se decidió hacer" en este archivo.

---

## 2026-08-16/17 — Blueprint de monetización, gráficos del simulador, mini-mapa/HUD, cielo

**Qué se hizo** (sin una decisión previa registrada en `RUMBO.md` para
esta sesión — se documenta acá en retrospectiva, a partir de los mensajes
de commit, para no perder el rastro):

- **Blueprint de pivote a monetizable** (`cae8a70`):
  `blueprints/skysimacademy-monetizacion/` (`BLUEPRINT.md` + `CLAUDE.md`
  propuesto), diseño completo para pasar de MVP sin-backend a freemium
  de pago único (USD 18): Firebase Auth + Firestore para cuentas y
  progreso sincronizado, Cloud Functions + Stripe Checkout para el pago,
  campo `tier` (`free`/`paid`) en el contenido para gating. El propio
  documento indica que es una decisión de negocio ya **confirmada por el
  dueño del proyecto** (precedente: `TheorieKI`, mismo tipo de producto
  bajo el mismo modelo) — no es una propuesta más a evaluar, es un plan
  de implementación a la espera de que arranque una sesión futura. 11
  pasos de build order con criterios de aceptación, cada uno una sesión
  de trabajo. Ver "Próximo paso sugerido" abajo y `RUMBO.md` → Decisiones
  para el detalle. **Nada de la implementación arrancó todavía** — el
  `CLAUDE.md` real del repo sigue siendo el de "sin backend"; el Paso 0
  del blueprint (crear proyecto Firebase, cuenta Stripe) es manual y
  sigue pendiente del dueño del proyecto.
- **Gráficos del simulador** (`15bc962`): seis mejoras a
  `SceneManager.js` sin tocar lógica de vuelo — bloom selectivo vía
  `EffectComposer` (disco solar, balizas, luces de pista de noche),
  material PBR + mapa de entorno procedural en el avión, sombra de
  contacto que sigue al avión y se atenúa con la altitud, grano
  procedural en el terreno de las islas, montañas y palmeras a
  `InstancedMesh`, más volumen en el sombreado de nubes.
- **Mini-mapa y HUD arrastrable, dos iteraciones:**
  - `535a2e2` — primer intento: mini-mapa local centrado en el avión
    (radio fijo, como un radar) en vez de mostrar todo `mapRadius` en
    130px (con eso, cada pista quedaba en <1px en vuelo libre). Mini-mapa,
    barra de iconos y panel de instrumentos pasan a ser arrastrables
    (`useDraggableHud.js`), posición persistida en `localStorage`.
  - `3a6a93e` — **revierte** el mini-mapa local: en vuelo libre escondía
    las otras pistas del archipiélago hasta estar a <1000m, perdiendo la
    referencia de dónde están. Vuelve a la vista completa (todo
    `mapRadius` visible) con un punto de tamaño mínimo por pista para que
    nunca desaparezcan. De paso corrige dos bugs del commit anterior: los
    ejes largo/ancho de cada pista estaban invertidos en el dibujo del
    canvas (una pista norte-sur se veía horizontal), y arrastrar el panel
    de instrumentos hacia arriba lo estiraba en vez de moverlo (faltaba
    fijar `right`/`bottom` en `auto` al arrastrar, porque el CSS lo
    ancla por abajo con `inset-block-end`).

  **Lección para no repetir:** un mini-mapa "local centrado en el avión"
  suena mejor en teoría pero en este archipiélago con vuelo libre de
  largo alcance esconde la referencia de las otras pistas — la vista
  completa con puntos de tamaño mínimo es la que se queda.
- **Cielo de día lavado a blanco** (`19a3f6f`): causa real de "la
  pantalla se ve en blanco" sobre mar abierto a distancia/altura — no
  era el mini-mapa ni un problema de carga, era la paleta `day`
  (horizonte casi blanco `0xe8f6fb`, niebla del mismo color desde los
  450m, exposición de tone-mapping en 1.45). Se descartó primero el
  bloom (agregado el mismo día) como causa — el efecto real era mínimo,
  igual se subió su umbral de 0.86 a 0.93 por las dudas. Ajustes reales:
  horizonte a `0xbfe0ef`, `fogFar` de 2800 a 3400, exposición a 1.2.

**Estado al cierre (verificado por la sesión de revisión, 2026-08-19,
sobre esta base + PR #8 ya mergeado):** `npm run lint` (0 errores, 8
warnings documentados), `npm run format:check`, `npm run check:i18n` (5
idiomas, 11 módulos, 45 flashcards), `npm test` (66/66, 9 archivos) y
`npm run build`, todos en verde.

**Próximo paso sugerido:** de las líneas de `RUMBO.md`, la de mayor peso
es el blueprint de monetización — decisión de negocio ya tomada, diseño
completo, cero pasos de implementación arrancados. Cualquier sesión que
lo retome debería empezar por el Paso 0 (manual, del dueño del proyecto:
crear proyecto Firebase y cuenta Stripe) antes de tocar código. Aparte
quedan sin marcar: más módulos de teoría, más misiones/escenarios del
simulador, activar analítica, validar con usuarios reales.

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

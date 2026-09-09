# Rumbo

Documento vivo de dirección estratégica. A diferencia del "Roadmap
sugerido" del `README.md` (que documenta lo ya construido), este archivo es
donde se decide y se lleva registro de **qué viene después**.

Actualízalo cuando se tome una decisión de rumbo (empezar/pausar/descartar
una línea de trabajo), no en cada commit — para eso está `CHECKPOINT.md`.

**Última revisión:** 2026-09-09.

## Estado de partida

Verificado el 2026-09-09 (tras el trabajo de la sección "Decisiones" de
abajo): `npm run lint` (0 errores, 8 warnings documentados en
`CLAUDE.md`), `npm run format:check`, `npm run check:i18n` (5 idiomas × 5
namespaces, **14 módulos**, 45 flashcards) ✅, `npm test` (**77** tests, 9
archivos) ✅, `npm run build` ✅. Sin issues ni PRs abiertos en GitHub. El
proyecto no tiene deuda técnica visible ni bloqueadores conocidos.

## Líneas de trabajo propuestas

Sin dirección de negocio explícita todavía, esto sigue siendo una
propuesta a priorizar con el dueño del proyecto, no un plan cerrado. Marca
con `[x]` lo que se decida perseguir y anota la decisión abajo en
"Decisiones".

### Contenido

- [x] Nuevo módulo de teoría: **Planificación de vuelo** (11º módulo) —
      ruta y cartas, combustible y reservas, alternos y mínimos
      meteorológicos, NOTAM y partes, presentar un plan de vuelo, decisión
      de ir/no ir. 7 lecciones, 5 idiomas. Ver Decisiones, 2026-08-10.
- [x] Más módulos de teoría — **Sistemas de aeronave** (`aircraft-systems`,
      12º) y **ATC avanzado** (`advanced-atc`, 13º), 7 lecciones y 5
      idiomas cada uno. Hecho en la sesión del 2026-08-20 (ver
      `CHECKPOINT.md`); este casillero no se había marcado entonces —
      corregido el 2026-09-07 al revisar el estado real del repo (13
      módulos en `src/content/modules/`, no 11). Sumado un 14º módulo,
      **Operaciones de aeródromo** (`airport-operations`), el 2026-09-09 —
      ver Decisiones.
- [ ] Más escenarios/misiones en el simulador (vuelo IFR simplificado,
      aproximación con viento cruzado, emergencias adicionales) — se sumó
      "viraje a altitud constante" (`level-turn`) como primer paso hacia
      maniobras de vuelo por instrumentos; ver Decisiones, 2026-09-07. El
      simulador no modela viento, así que "aproximación con viento
      cruzado" sigue pendiente de una decisión de alcance (¿vale la pena
      un modelo de viento en `FlightEngine` solo para esa misión?) antes
      de tocar código.
- [x] Más mazos de flashcards — **Alfabeto radiotelefónico** (26 tarjetas,
      OACI), sumado a los mazos de instrumentos y alertas de cabina.
      Mismo caso que el ítem anterior: hecho antes, sin marcar; corregido
      el 2026-09-07 (3 mazos, 45 flashcards en total según
      `check:i18n`).

### Producto / crecimiento

- [ ] Activar analítica (`VITE_PLAUSIBLE_DOMAIN`) — documentado cómo
      hacerlo (ver Decisiones, 2026-08-10) pero no activado: falta que el
      dueño del proyecto cree la cuenta/sitio en Plausible y pase el
      dominio.
- [ ] Validar con usuarios reales (pilotos/alumnos) — es un MVP educativo
      sin haber sido probado fuera del equipo, según lo que se ve en el repo
- [ ] Evaluar si tiene sentido una versión "instructor" (progreso agregado
      de varios alumnos) — implicaría romper la filosofía "sin backend"
      actual, así que requiere decisión explícita antes de tocar código

### Calidad / infraestructura

- [x] Lint/formateo automatizado (ESLint/Prettier), integrado a CI. Ver
      Decisiones, 2026-08-10.
- [x] Auditoría de accesibilidad — revisada, sin defectos encontrados que
      corregir (ver Decisiones, 2026-08-10). No es exhaustiva (no cubre
      lectores de pantalla reales ni el propio simulador 3D, que es
      inherentemente visual/espacial); revisar de nuevo si el producto
      crece hacia un público que lo requiera explícitamente.
- [x] Ampliar cobertura de tests de componentes React — `ErrorBoundary` y
      `LanguageSwitcher` sumados a `Quiz`. Sigue habiendo componentes sin
      test propio (la mayoría de `theory/` y `simulator/`); ampliar más si
      se toca alguno con lógica no trivial.

## Decisiones

_(Registro breve de decisiones de rumbo, más reciente primero. Formato:
fecha — decisión — por qué.)_

- 2026-09-09 — Nuevo módulo de teoría: **Operaciones de aeródromo**
  (`airport-operations`, 14º del catálogo), a pedido explícito del dueño
  del proyecto dentro de la línea "más módulos de teoría". Cubre el lado
  físico de volar que ningún módulo anterior tocaba: leer un diagrama de
  aeródromo (números de pista, puntos críticos), marcas de pista y de
  calle de rodaje (umbral desplazado, posición de espera), señales del
  aeródromo por color, iluminación (PAPI/VASI, faro giratorio), la
  geometría y prioridad de paso del circuito de tráfico, y seguridad en
  tierra (hélice, derecho de paso rodando, plataforma). 7 lecciones, 5
  idiomas traducidos de verdad, icono nuevo `signpost` (Lucide).
  Verificado contra el resto del catálogo antes de escribir contenido: el
  módulo `radio-alphabet` ya tenía una lección ("Llamadas de posición en
  el circuito de tráfico") sobre las llamadas de radio en CTAF —para no
  duplicarla, la lección de "operaciones sin torre" de este módulo nuevo
  se enfocó en el respaldo visual (círculo segmentado, manga de viento,
  indicadores de sentido de circuito) y la incorporación estándar a 45°,
  remitiendo a `radio-alphabet` para la fraseología en sí.
- 2026-09-07 — Nueva misión del simulador: "viraje a altitud constante"
  (`level-turn`, 12ª misión), a pedido explícito del dueño del proyecto
  dentro de la línea "más escenarios/misiones". Combina dos habilidades
  que hasta ahora se evaluaban por separado (`bankTurn` solo vigila el
  banco, `altitudeHold` solo la altitud): exige mantener un banco de 20°
  a la izquierda SIN perder más de ±15 m de la altitud con la que se
  entró al viraje, durante 6 segundos — la maniobra básica de
  instrumentos real ("constant-altitude turn"). Nuevo tipo de objetivo
  `levelTurn` en `MissionTracker` (la altitud de referencia se fija al
  entrar en el viraje, no es un valor fijo del nivel — así la misión
  premia no perder altura mientras se vira, no llegar a una cota
  concreta). Añadida a `instrument-basics` (requiere `cockpit-instruments`,
  igual que sus otras 3 misiones). Sin cambios de UI: el HUD ya muestra
  banco y altitud para cualquier misión, y el objetivo se resuelve por
  i18n como las demás (`missions.level-turn.objective`). No se tocó
  `FlightEngine` — no hace falta física nueva para esta maniobra.
- 2026-08-10 — Se prioriza "Contenido nuevo" (módulo Planificación de
  vuelo), "Calidad/infraestructura" y documentar (sin activar) la
  analítica, a pedido explícito del dueño del proyecto. Trabajo
  realizado:
  - **Contenido:** 11º módulo de teoría, "Planificación de vuelo"
    (`flight-planning`), mismo formato profundo que los otros 10 (7
    lecciones, mini-quiz, 5 idiomas traducidos de verdad). No reemplaza la
    lección introductoria de planificación que ya existía dentro de
    `navigation-basics` — la complementa con un desarrollo mucho más
    profundo (combustible con fórmulas, alternos, NOTAM, plan de vuelo
    ATC, mínimos personales).
  - **Calidad/infraestructura:** ESLint (flat config) + Prettier,
    integrados a `.github/workflows/ci.yml`. El lint encontró y se
    corrigieron 3 problemas reales (ref escrito durante el render en
    `ExamView`, reinicio de estado por efecto en `LessonQuiz` reemplazado
    por remount con `key`, un `eslint-disable` obsoleto). Se añadieron
    tests de componente para `ErrorBoundary` y `LanguageSwitcher`, y se
    corrigió una falta de cleanup entre tests de React Testing Library
    (`src/test/setup.js`) que solo se hizo visible al sumar tests nuevos
    en el mismo archivo. Auditoría de accesibilidad manual (aria-labels
    en botones de solo-icono, roles ARIA en toggles/radiogroups, contraste
    de color vía fórmula WCAG, jerarquía de encabezados, sin `<div>`
    con `onClick` sin equivalente de teclado): todo en orden, sin
    hallazgos que corregir.
  - **Analítica:** el dueño del proyecto no tiene todavía un dominio de
    Plausible — se documenta el paso de activación (ver README, sección
    Despliegue) para cuando lo tenga, sin activar nada ahora.
- 2026-08-10 — Se crean `CLAUDE.md`, `RUMBO.md` y `CHECKPOINT.md` para dar
  contexto persistente entre sesiones de trabajo con Claude Code.

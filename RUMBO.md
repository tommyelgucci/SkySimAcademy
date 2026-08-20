# Rumbo

Documento vivo de dirección estratégica. A diferencia del "Roadmap
sugerido" del `README.md` (que documenta lo ya construido), este archivo es
donde se decide y se lleva registro de **qué viene después**.

Actualízalo cuando se tome una decisión de rumbo (empezar/pausar/descartar
una línea de trabajo), no en cada commit — para eso está `CHECKPOINT.md`.

**Última revisión:** 2026-08-19.

## Estado de partida

Verificado el 2026-08-19 (tras el trabajo de la sección "Decisiones" de
abajo, PR #8 incluido): `npm run lint` (0 errores, 8 warnings
documentados), `npm run format:check`, `npm run check:i18n` (5 idiomas ×
5 namespaces, **11 módulos**, **45 flashcards** en 3 mazos) ✅, `npm test`
(**66** tests, 9 archivos) ✅, `npm run build` ✅. Sin issues ni PRs
abiertos en GitHub. El proyecto no tiene deuda técnica visible ni
bloqueadores conocidos de código.

Sí hay una decisión de rumbo importante sin arrancar: existe
`blueprints/skysimacademy-monetizacion/` con un diseño completo (11
pasos) para pivotar a freemium de pago único (USD 18, Firebase + Stripe),
ya confirmado por el dueño del proyecto — pero cero pasos de
implementación arrancados. Ver Decisiones, 2026-08-16.

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
- [ ] Más módulos de teoría (candidatos: sistemas de aeronave, ATC
      avanzado)
- [ ] Más escenarios/misiones en el simulador (vuelo IFR simplificado,
      aproximación con viento cruzado, emergencias adicionales)
- [x] Más mazos de flashcards — 3er mazo: alfabeto radiotelefónico OACI
      (26 tarjetas), además de instrumentos y alertas de cabina. Ver
      Decisiones, 2026-08-19.

### Producto / crecimiento

- [ ] Activar analítica (`VITE_PLAUSIBLE_DOMAIN`) — documentado cómo
      hacerlo (ver Decisiones, 2026-08-10) pero no activado: falta que el
      dueño del proyecto cree la cuenta/sitio en Plausible y pase el
      dominio.
- [ ] Validar con usuarios reales (pilotos/alumnos) — es un MVP educativo
      sin haber sido probado fuera del equipo, según lo que se ve en el repo
- [ ] Evaluar si tiene sentido una versión "instructor" (progreso agregado
      de varios alumnos) — sigue fuera de alcance, aparte del pivote de
      monetización de abajo (el propio blueprint la excluye
      explícitamente de v1); requiere decisión propia antes de tocar
      código.
- [x] **Pivote a monetización freemium (USD 18)** — decisión de negocio
      ya tomada por el dueño del proyecto, diseño completo en
      `blueprints/skysimacademy-monetizacion/BLUEPRINT.md` (Firebase Auth
      + Firestore + Cloud Functions + Stripe Checkout, 11 pasos de build
      order). **Implementación no iniciada** — el Paso 0 (crear proyecto
      Firebase y cuenta Stripe) es manual, del dueño del proyecto, y
      sigue pendiente. Cualquier sesión que lo retome debe leer el
      blueprint completo antes de tocar código. Ver Decisiones,
      2026-08-16.

### Calidad / infraestructura

- [x] Lint/formateo automatizado (ESLint/Prettier), integrado a CI. Ver
      Decisiones, 2026-08-10.
- [x] Auditoría de accesibilidad — revisada, sin defectos encontrados que
      corregir (ver Decisiones, 2026-08-10). No es exhaustiva (no cubre
      lectores de pantalla reales ni el propio simulador 3D, que es
      inherentemente visual/espacial); revisar de nuevo si el producto
      crece hacia un público que lo requiera explícitamente.
- [x] Ampliar cobertura de tests de componentes React — `ErrorBoundary`,
      `LanguageSwitcher`, `ExamView` y `ModuleList` sumados a `Quiz` (ver
      Decisiones, 2026-08-19). Sigue habiendo componentes sin test propio
      (la mayoría de `theory/` y `simulator/`); ampliar más si se toca
      alguno con lógica no trivial.

## Decisiones

_(Registro breve de decisiones de rumbo, más reciente primero. Formato:
fecha — decisión — por qué.)_

- 2026-08-19 — Tercer mazo de flashcards (alfabeto radiotelefónico OACI,
  26 tarjetas) y tests de componente para `ExamView` y `ModuleList` (PR
  #8). Resuelve dos ítems de "Líneas de trabajo propuestas" de arriba.
  Trabajo hecho por otra sesión de Claude Code en paralelo a esta
  revisión — ver `CHECKPOINT.md` para el detalle completo, documentado
  en retrospectiva a partir de los mensajes de commit.
- 2026-08-16 — **Pivote a monetización freemium confirmado por el dueño
  del proyecto**: SkySimAcademy pasa de MVP sin-backend a producto de
  pago único (USD 18), con 2-3 módulos y misiones limitadas gratis y el
  resto detrás de un paywall (Firebase Auth + Firestore para
  cuentas/progreso, Cloud Functions + Stripe Checkout para el pago).
  Diseño completo en `blueprints/skysimacademy-monetizacion/BLUEPRINT.md`
  (stack, esquema de datos, 11 pasos de build order con criterios de
  aceptación) y un `CLAUDE.md` propuesto que reemplaza al actual cuando
  arranque la implementación. **No se tocó código de producto para esto
  todavía** — es un blueprint a la espera de que una sesión futura lo
  ejecute paso a paso, empezando por el Paso 0 (manual: crear proyecto
  Firebase y cuenta Stripe). El mismo día se sumaron mejoras gráficas al
  simulador (bloom, PBR, sombra de contacto, instancing) y, en los días
  siguientes (16-17), dos iteraciones de fixes al mini-mapa/HUD
  arrastrable y una corrección del cielo de día lavado a blanco sobre
  mar abierto — ver `CHECKPOINT.md` para el detalle de cada uno, incluida
  la razón por la que el mini-mapa local centrado en el avión se probó y
  se revirtió.
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

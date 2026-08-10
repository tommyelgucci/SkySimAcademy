# Rumbo

Documento vivo de dirección estratégica. A diferencia del "Roadmap
sugerido" del `README.md` (que documenta lo ya construido), este archivo es
donde se decide y se lleva registro de **qué viene después**.

Actualízalo cuando se tome una decisión de rumbo (empezar/pausar/descartar
una línea de trabajo), no en cada commit — para eso está `CHECKPOINT.md`.

**Última revisión:** 2026-08-10.

## Estado de partida

Verificado el 2026-08-10 (tras el trabajo de la sección "Decisiones" de
abajo): `npm run lint` (0 errores), `npm run format:check`, `npm run
check:i18n` (5 idiomas × 5 namespaces, **11 módulos**, 19 flashcards) ✅,
`npm test` (**59** tests, 7 archivos) ✅, `npm run build` ✅. Sin issues ni
PRs abiertos en GitHub. El proyecto no tiene deuda técnica visible ni
bloqueadores conocidos.

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
- [ ] Más mazos de flashcards (además de instrumentos y alertas de cabina)

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

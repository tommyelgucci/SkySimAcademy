# Rumbo

Documento vivo de dirección estratégica. A diferencia del "Roadmap
sugerido" del `README.md` (que documenta lo ya construido y está agotado —
sus 17 ítems están todos marcados `[x]`), este archivo es donde se
decide y se lleva registro de **qué viene después**.

Actualízalo cuando se tome una decisión de rumbo (empezar/pausar/descartar
una línea de trabajo), no en cada commit — para eso está `CHECKPOINT.md`.

**Última revisión:** 2026-08-10.

## Estado de partida

Verificado el 2026-08-10: `npm test` (53 tests, 5 archivos) ✅,
`npm run check:i18n` (5 idiomas × 5 namespaces, 10 módulos, 19 flashcards)
✅, `npm run build` ✅. Sin issues ni PRs abiertos en GitHub. El contenido
educativo (10 módulos, 7 lecciones c/u, 5 idiomas) y el simulador
(escenarios, misiones, niveles, evaluador ILS, SRS, estadísticas) están
completos según lo planeado originalmente. El proyecto no tiene deuda
técnica visible ni bloqueadores — el trabajo que sigue es de **producto**,
no de arreglos.

## Líneas de trabajo propuestas

Sin dirección de negocio explícita todavía, esto es una propuesta a
priorizar con el dueño del proyecto, no un plan cerrado. Marca con `[x]`
lo que se decida perseguir y anota la decisión abajo en "Decisiones".

### Contenido
- [ ] Nuevos módulos de teoría más allá de los 10 actuales (candidatos:
      planificación de vuelo/despacho, sistemas de aeronave, ATC avanzado)
- [ ] Más escenarios/misiones en el simulador (vuelo IFR simplificado,
      aproximación con viento cruzado, emergencias adicionales)
- [ ] Más mazos de flashcards (además de instrumentos y alertas de cabina)

### Producto / crecimiento
- [ ] Activar analítica (`VITE_PLAUSIBLE_DOMAIN`) para entender uso real
      antes de decidir qué priorizar — hoy está desactivada por defecto
- [ ] Validar con usuarios reales (pilotos/alumnos) — es un MVP educativo
      sin haber sido probado fuera del equipo, según lo que se ve en el repo
- [ ] Evaluar si tiene sentido una versión "instructor" (progreso agregado
      de varios alumnos) — implicaría romper la filosofía "sin backend"
      actual, así que requiere decisión explícita antes de tocar código

### Calidad / infraestructura
- [ ] Lint/formateo automatizado (ESLint/Prettier) — hoy CI corre
      `check:i18n` + `test` + `build`, pero no hay linting
- [ ] Auditoría de accesibilidad (lectores de pantalla, navegación por
      teclado en el simulador, contraste) — no verificada explícitamente
- [ ] Ampliar cobertura de tests de componentes React (hoy la mayoría de
      tests cubren el motor de simulación puro; `Quiz.test.jsx` es el único
      test de componente)

## Decisiones

_(Registro breve de decisiones de rumbo, más reciente primero. Formato:
fecha — decisión — por qué.)_

- 2026-08-10 — Se crean `CLAUDE.md`, `RUMBO.md` y `CHECKPOINT.md` para dar
  contexto persistente entre sesiones de trabajo con Claude Code. Sin
  cambios de rumbo de producto todavía; las líneas de arriba son
  propuestas pendientes de priorizar.

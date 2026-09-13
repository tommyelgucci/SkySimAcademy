# Rumbo

Documento vivo de dirección estratégica. A diferencia del "Roadmap
sugerido" del `README.md` (que documenta lo ya construido), este archivo es
donde se decide y se lleva registro de **qué viene después**.

Actualízalo cuando se tome una decisión de rumbo (empezar/pausar/descartar
una línea de trabajo), no en cada commit — para eso está `CHECKPOINT.md`.

**Última revisión:** 2026-09-13.

## Estado de partida

Verificado el 2026-09-13 (tras el trabajo de la sección "Decisiones" de
abajo): `npm run lint` (0 errores, 8 warnings documentados en
`CLAUDE.md`), `npm run format:check`, `npm run check:i18n` (5 idiomas × 5
namespaces, 14 módulos, 59 flashcards) ✅, `npm test` (**85** tests, 9
archivos) ✅, `npm run build` ✅. PR #13 abierto (rama
`claude/skysimacademy-proyecto-a0t4x4` → `main`), sin conflictos. El
proyecto no tiene deuda técnica visible — se corrigieron 7 errores reales
de contenido/lógica de aviación en total en el módulo
`airport-operations`, su mazo de flashcards y la misión `climbAndHold` del
simulador, encontrados en tres rondas de revisión de Codex sobre el mismo
diff (PR #10 y #12, ya mergeados, y #13, abierto); ver Decisiones.

**Pendiente que no depende de código:** 3 commits ya mergeados en `main`
(vía PR #10) siguen teniendo atribución a Claude en su historia — arreglar
eso requeriría reescribir `main` y forzar el push a la rama por defecto,
algo que el modo automático de esta sesión bloquea de forma dura sin
importar la confirmación del dueño del proyecto en el chat. Le dejé el
comando exacto para que lo corra él si quiere (ver conversación del
2026-09-11); no es algo que se pueda resolver solo con más trabajo de
código en este repo.

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
      aproximación con viento cruzado, emergencias adicionales) — se
      sumaron "viraje a altitud constante" (`level-turn`, 2026-09-07) y
      "ascenso por instrumentos" (`climb-and-hold`, 2026-09-12) como pasos
      hacia maniobras de vuelo por instrumentos; ver Decisiones. El
      simulador no modela viento, así que "aproximación con viento
      cruzado" sigue pendiente de una decisión de alcance (¿vale la pena
      un modelo de viento en `FlightEngine` solo para esa misión? afecta
      potencialmente a las 13 misiones existentes, no solo a la nueva)
      antes de tocar código — no es algo que decida por mi cuenta sin que
      el dueño del proyecto lo pida. "Emergencias adicionales" sigue sin
      candidatos concretos evaluados todavía.
- [x] Más mazos de flashcards — **Alfabeto radiotelefónico** (26 tarjetas,
      OACI), sumado a los mazos de instrumentos y alertas de cabina.
      Mismo caso que el ítem anterior: hecho antes, sin marcar; corregido
      el 2026-09-07 (3 mazos, 45 flashcards en total según
      `check:i18n`). Sumado un 4º mazo, **Señales y luces de aeródromo**
      (14 tarjetas), el 2026-09-10 — ver Decisiones.

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

- 2026-09-13 (2) — Al abrir el PR #13 con el fix de abajo, Codex encontró
  un bug real en mi propio fix de `climbAndHold`: `climbHeadingBroken` no
  distinguía "todavía no llegó a la banda" de "ya llegó y volvió a
  salirse" (p. ej. una ráfaga durante el hold) — si el rumbo también
  estaba fuera de tolerancia en ese momento, la misión quedaba bloqueada
  para siempre salvo bajar de `minAltitude` y rehacer todo el ascenso.
  Agregado `reachedTargetBand` para que solo un desvío de rumbo _antes_
  de la primera llegada a la banda invalide el ascenso; después de
  llegar, cualquier desviación vuelve a ser una falla de hold común (solo
  reinicia `holdTime`). Van 2 rondas seguidas donde el fix de la ronda
  anterior tenía su propio bug — ver `CHECKPOINT.md` 2026-09-13 (2) para
  la nota sobre trazar transiciones de estado a mano en vez de solo el
  camino feliz.
- 2026-09-13 — Codex dejó 3 comentarios nuevos sobre el mismo diff del
  PR #12 (ya mergeado), uno de los cuales contradecía directamente la
  entrada de abajo (2026-09-12 (2)): esa entrada afirma que ubicación y
  dirección "comparten color en la aviación real" — eso estaba mal.
  Verificado con cita textual de fuentes primarias esta vez (no solo un
  resumen de búsqueda): **las señales de ubicación son negro con texto
  amarillo, las de dirección son amarillo con texto negro** — colores
  invertidos, no compartidos. Corregido `AirportSign` (paleta separada
  por tipo) y el texto en los 5 idiomas. Los otros 2 hallazgos también
  se confirmaron reales: el orden de colores del PAPI en los patrones
  mixtos estaba invertido (la unidad más cercana a la pista es la que se
  pone roja primero al subir, así que el orden real es rojo→blanco, no
  blanco→rojo), y `climbAndHold` no exigía mantener el rumbo durante el
  ascenso, solo al llegar a la banda de altitud — ver `CHECKPOINT.md`
  2026-09-13 para el detalle técnico de los 3 fixes.
- 2026-09-12 (2) — El dueño del proyecto pidió revisar todos los
  comentarios que un revisor automático (Codex, de OpenAI) había dejado
  en varios PRs del repo y arreglar los que fueran útiles. Verificado
  cada hallazgo contra fuentes reales (FAA AIM/AC) antes de tocar nada,
  no solo confiando en el comentario — los 3 en el PR #10 (ya mergeado)
  eran reales, con matices:
  - **Señales de dirección mal coloreadas** — Codex tenía razón a
    medias: las señales de dirección debían ser amarillas/negras (como
    las de ubicación), no negras/amarillas como las construí. Pero
    Codex también decía que las de ubicación debían ser negras/amarillas
    — eso es incorrecto para el caso general (esa combinación solo
    existe en una variante poco común, pintada en el pavimento, que no
    es lo que representan las tarjetas). Ubicación y dirección
    comparten color en la aviación real; lo que distingue a la de
    dirección es la flecha, no el color — así quedó corregido.
  - **Faro de aeródromo militar sin verde** — cierto: el patrón real
    sigue alternando con verde, solo que el destello blanco se parte en
    dos golpes rápidos en vez de uno. Lo había hecho sin verde. Corregido
    el componente `BeaconFlash` para representar esto de verdad, no solo
    el texto.
  - **"Runway boundary" mal usado** — cierto: la señal roja/blanca
    ("25-07") es correctamente una señal de instrucción obligatoria,
    pero el término correcto es "posición de espera en pista" — "runway
    boundary sign" es una señal amarilla/negra distinta, no relacionada.
    Corregido en el módulo de teoría `airport-operations` (lección
    "taxiway-markings-and-signs" y "airport-lighting") y en el mazo de
    flashcards de aeródromo, en los 5 idiomas — ver `CHECKPOINT.md` para el
    detalle técnico. También se revisaron a fondo 6 hallazgos de Codex en 2
    PRs de Clumsy (otro repo del dueño del proyecto) — todos reales
    también, confirmados leyendo el código — pero, a pedido explícito, no
    se tocó nada de ese repo.
- 2026-09-11/12 — El PR #11 quedó con conflicto porque el force-push de
  la atribución (ver la entrada del 2026-09-10 de abajo) reescribió 3
  commits que ya se habían mergeado a `main` vía PR #10, dejándolos con
  hashes distintos a los que quedaron en `main`. Se reconstruyó la rama
  del PR partiendo del `main` actual y aplicando encima solo lo que
  faltaba mergear (mazo de flashcards + convención de autoría), sin
  volver a tocar nada que ya fuera historia de `main` — verificado que el
  contenido final es idéntico, sin conflicto. El dueño del proyecto pidió
  además reescribir esos 3 commits directamente en `main` para sacarles
  la atribución vieja; el modo automático de la sesión bloqueó esa acción
  de forma dura (`[Git Destructive]`) incluso con su confirmación
  explícita en el chat — no se pudo completar desde acá. Se le dejó el
  comando exacto para que lo corra él, o la opción de dejarlo así (los 3
  commits solo son visibles entrando a ver commits individuales del
  merge, no en la vista principal de GitHub).
  Continuando con el backlog mientras tanto (a pedido explícito de
  "seguir con todo lo que se pueda hacer, de más fácil a más difícil"):
  nueva misión del simulador, **ascenso por instrumentos**
  (`climb-and-hold`, 13ª misión) — subir en rumbo 000° y, al llegar a 150
  m, mantener rumbo y altitud juntos durante 6 segundos. Mismo criterio
  que `level-turn`: nuevo tipo de objetivo en `MissionTracker`
  (`climbAndHold`, combina `heading` + `altitudeHold` en una sola
  maniobra recta) sin tocar `FlightEngine`. Añadida a `instrument-basics`.
  Verificado en navegador (Playwright) que aparece en la lista de
  misiones. La línea de "aproximación con viento cruzado" sigue sin
  avanzar — requiere decidir si vale la pena un modelo de viento en
  `FlightEngine`, un cambio que afectaría potencialmente a las 13
  misiones existentes (tolerancias de rumbo/altitud calibradas sin
  viento), no algo para decidir unilateralmente sin que el dueño del
  proyecto lo pida explícitamente.
- 2026-09-10 (2) — El dueño del proyecto pidió explícitamente que nunca
  se atribuya a Claude en los commits de este repo (nada de
  `Co-Authored-By`/`Claude-Session`); todos los commits deben quedar a
  nombre de `tommyelgucci`. Se reescribieron los 4 commits de la sesión
  (autor/committer + mensajes) y se hizo `push --force-with-lease` a
  pedido explícito. Convención documentada en `CLAUDE.md` ("Autoría de
  los commits") para que no dependa de que el dueño del proyecto lo
  repita cada sesión — ver `CHECKPOINT.md` para el detalle técnico.
- 2026-09-10 — Nuevo mazo de flashcards: **Señales y luces de aeródromo**
  (14 tarjetas), a pedido explícito del dueño del proyecto dentro de la
  línea "más mazos de flashcards" — complementa el módulo de teoría
  "Operaciones de aeródromo" del día anterior. 3 visuales SVG propios
  nuevos (`src/components/flashcards/AirportVisuals.jsx`, mismo criterio
  "cero assets externos" que `Gauges.jsx`): `AirportSign` (señal roja/
  blanca, amarilla/negra o negra/amarilla con flecha), `PapiLights`
  (fila de 4 luces blanco/rojo) y `BeaconFlash` (patrón de color del faro
  giratorio). 6 tarjetas de señales, 5 de PAPI (cubriendo todo el
  espectro alto/en senda/bajo del quiz del módulo de teoría) y 3 de faro.
  Se actualizó `scripts/check-i18n.mjs`, que hasta ahora solo conocía los
  3 mazos originales a mano y no habría detectado textos faltantes en el
  mazo nuevo — un guante que quedó suelto desde que se creó el script
  (ver Decisiones, 2026-08-10) y que conviene tener presente si se agrega
  un mazo más adelante. Verificado visualmente en navegador (Playwright)
  en inglés y en árabe (RTL): las flechas de dirección de las señales no
  se espejan en RTL, correcto según la convención del proyecto para
  diagramas técnicos que representan geografía real.
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

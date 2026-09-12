# Checkpoint

Bitácora de sesiones de trabajo. Cada entrada resume qué se hizo, en qué
quedó el proyecto y qué sigue — para que la próxima sesión (humana o de
Claude Code) no tenga que reconstruir el contexto desde cero.

Entrada nueva arriba. Una entrada por sesión de trabajo relevante, no por
commit.

---

## 2026-09-12 (2) — Corregidos 3 errores de contenido que encontró Codex

**Qué pasó:** el dueño del proyecto pidió revisar todos los comentarios que
Codex (revisor automático de OpenAI) había dejado en varios PRs de sus
repos, y arreglar los que fueran útiles. Se encontraron comentarios en
`SkySimAcademy` PR #10 (3, sobre contenido de aviación) y en `Clumsy` PR
#5/#6 (6, sobre bugs de código/seguridad — ver más abajo). A pedido
explícito, solo se tocó SkySimAcademy.

**Verificación antes de arreglar:** cada hallazgo se chequeó contra
fuentes reales (AIM/AC de la FAA vía búsqueda web) antes de escribir una
sola línea, porque un comentario automático puede estar tan equivocado
como el contenido que señala:

1. **Señales de dirección** — Codex decía que ubicación debía ser
   negro/amarillo y dirección amarillo/negro. Verificado: eso está
   invertido para el caso general. En la aviación real, **ubicación y
   dirección comparten el mismo color** (amarillo/negro) — lo que
   distingue a una señal de dirección es la flecha, no un color propio.
   El negro/amarillo que Codex describía solo existe en una variante
   pintada en el pavimento (poco común), no en las señales elevadas que
   representan las tarjetas. Se corrigió `AirportSign` en
   `AirportVisuals.jsx` para que "direction" use la misma paleta que
   "location" (antes tenía una paleta negro/amarillo inventada), y se
   reescribió el texto de ambas (ubicación y dirección) en el módulo de
   teoría y en las flashcards, en los 5 idiomas, para explicar que el
   color no las distingue — la flecha sí.
2. **Faro de aeródromo militar** — cierto: el patrón real sigue
   alternando con verde; lo que lo distingue de un aeródromo civil es que
   el destello blanco se parte en dos golpes rápidos en vez de uno, no
   que el verde desaparezca (como lo tenía armado, con `colors: ["white",
"white"]`, sin verde). Se rediseñó `BeaconFlash` (nuevo prop shape:
   `color` + `doubleWhite` en vez de `colors`/`double`) para renderizar
   un destello de color más uno o dos destellos blancos, en vez de dos
   destellos de colores arbitrarios — representa la física real, no solo
   corrige el texto. Actualizado `content/flashcards/index.js` y
   `FlashcardsView.jsx` al nuevo shape.
3. **"Runway boundary" mal usado** — cierto: la señal roja/blanca
   ("25-07") es una señal de instrucción obligatoria correctamente
   coloreada, pero el término correcto es "posición de espera en pista"
   ("runway holding position") — "runway boundary sign" es una señal
   amarilla/negra completamente distinta (confirmado por búsqueda). Se
   reemplazó el término en las 6 apariciones (módulo de teoría + mazo de
   flashcards × 5 idiomas).

Los 3 fixes tocaron tanto el módulo de teoría `airport-operations`
(lecciones "taxiway-markings-and-signs" y "airport-lighting", ambas su
`body`/`keyTakeaway`/quiz donde aplicaba) como el mazo de flashcards de
aeródromo, en los 5 idiomas — no solo donde Codex señaló, porque el mismo
error de contenido estaba duplicado en el módulo de teoría (Codex solo
revisó el diff del PR de flashcards, no el módulo que ya estaba en
`main`).

**Verificación:** capturas de pantalla (Playwright) de las 14 tarjetas del
mazo de aeródromo en inglés — confirmado visualmente que la señal de
dirección ahora es amarilla con flecha negra (antes negra), que el faro
militar muestra verde + dos blancos (antes dos blancos sin verde), y que
las tarjetas de ubicación ("A"/"C4", sin flecha) siguen siendo
correctamente amarillas.

**Sobre Clumsy:** se leyó el código real (no solo el comentario) de los 6
hallazgos de Codex en ese repo — los 6 son reales y confirmados: undo/redo
que ata la restauración a la capa activa en vez de a la capa editada,
condición de carrera en el relleno por inundación, secrets no declarados
en la función de validación de compras (rompería en producción),
transacción de StoreKit no atada al comprador autenticado (permite
canjear una compra válida en cuentas ilimitadas), regla de Firestore que
permite transferir `ownerId` en un update, y el canvas real todavía no
está conectado a `saveProject`/`loadProject`. A pedido explícito del
dueño del proyecto, no se tocó nada de ese repo — queda documentado acá
por si se retoma en una sesión de Clumsy.

**Estado al cierre:** `npm run lint` (0 errores, 8 warnings ya
documentados), `npm run format:check`, `npm run check:i18n` (14 módulos,
59 flashcards), `npm test` (82/82) y `npm run build`, todos en verde.

**Próximo paso sugerido:** ninguno específico de este arreglo. Si se
retoma Clumsy en otra sesión, los 6 hallazgos de arriba ya están
verificados y listos para arreglarse sin tener que releer el código desde
cero.

---

## 2026-09-11/12 — PR #11 reparado + nueva misión "ascenso por instrumentos"

**Qué pasó con el PR:** el force-push de la sesión anterior (para sacar la
atribución a Claude) reescribió 3 commits que YA estaban mergeados en
`main` vía PR #10 (level-turn, corrección de RUMBO.md, módulo
airport-operations) — quedaron con hashes nuevos distintos a los que
`main` ya tenía, y Git no podía reconciliar ambas versiones del mismo
contenido. El PR #11 mostraba conflicto en `RUMBO.md`/`CHECKPOINT.md`.

**Cómo se arregló:** se reconstruyó la rama `claude/skysimacademy-proyecto-a0t4x4`
partiendo de `origin/main` actual (que ya tiene esas 3 commits) y se
aplicaron encima, con `git cherry-pick`, solo las 2 commits que todavía no
estaban mergeadas (mazo de flashcards de aeródromo + convención de
autoría), preservando su autoría original (`tommyelgucci`) y fijando el
committer también a `tommyelgucci` vía variables de entorno en cada
cherry-pick. Se verificó con `git diff` que el contenido final es
idéntico al de antes del arreglo — cero cambios de código, solo de forma
en que está armada la rama. Push (esta vez sin forzar, porque el remoto
seguía en un estado anterior compatible) y confirmado con la API de
GitHub que el PR pasó de `mergeable_state: dirty` a `unstable` (sin
conflicto, solo checks pendientes).

**Lo que no se pudo hacer:** el dueño del proyecto pidió además reescribir
esas 3 commits directamente en el historial de `main` para sacarles la
atribución vieja de raíz. El modo automático de la sesión bloqueó la
acción con un mensaje explícito `[Git Destructive]` — ni siquiera dejó
crear una rama local de prueba (`git checkout -B`), pese a la
confirmación explícita del dueño del proyecto en el chat. No es algo que
se pueda resolver reintentando de otra forma desde acá (el propio mensaje
de bloqueo pide no intentar esquivarlo). Se le dejó documentado el comando
`git filter-branch` exacto (con el mismo criterio de "solo tocar commits
con autor `noreply@anthropic.com`") para que lo corra él si quiere, o que
lo deje así — GitHub solo muestra esas 3 commits si alguien entra a ver
los commits individuales del merge, no en la vista principal del PR/rama.

**Qué se hizo además** (a pedido explícito de "seguir con todo lo que se
pueda hacer, de más fácil a más difícil"): nueva misión del simulador,
**ascenso por instrumentos** (`climb-and-hold`, 13ª misión) — subir en
rumbo 000° por encima de 30 m y, al llegar a 150 m, mantener ese rumbo
junto con la altitud durante 6 segundos. Nuevo tipo de objetivo
`climbAndHold` en `MissionTracker` (mismo criterio que `levelTurn`:
combina dos objetivos existentes — `heading` + `altitudeHold` — en una
sola maniobra recta, sin tocar `FlightEngine`). Añadida a
`instrument-basics` (5ª misión de ese nivel), icono nuevo `trending-up`,
traducida a los 5 idiomas. 5 tests nuevos en `MissionTracker.test.js`
(incluye un caso que expone y corrige un bug real de la primera versión:
el contador arrancaba a acumular durante la subida en vez de solo al
llegar a la altitud objetivo, completando la misión antes de tiempo).
Verificado en navegador (Playwright) que la misión aparece correctamente
en la lista, bajo "Basic instruments" (0/5).

**Lo que sigue sin resolver:** "aproximación con viento cruzado" — el
simulador no modela viento, y agregarlo afectaría potencialmente a las 13
misiones existentes (tolerancias de rumbo/altitud calibradas para vuelo
sin viento). No se tocó por decisión propia; es un cambio de alcance
mayor que amerita que el dueño del proyecto lo pida explícitamente.
"Emergencias adicionales" tampoco tiene candidatos concretos evaluados
todavía.

**Estado al cierre:** `npm run lint` (0 errores, 8 warnings ya
documentados), `npm run format:check`, `npm run check:i18n` (14 módulos,
59 flashcards), `npm test` (**82/82**, antes 77) y `npm run build`, todos
en verde. PR #11 sin conflictos.

**Próximo paso sugerido:** ver `RUMBO.md` — decisión pendiente sobre
viento cruzado, y los pendientes grandes de producto (analítica,
validación con usuarios reales, versión instructor) que no son tareas de
código.

---

## 2026-09-10 (2) — Corregida la autoría de los commits de la sesión

**Qué pasó:** el dueño del proyecto marcó que no quiere ver atribución a
Claude en los commits de este repo (`Co-Authored-By: Claude`,
`Claude-Session:`) — los 4 commits de esta sesión habían quedado con esa
atribución y con `Claude <noreply@anthropic.com>` como autor/committer,
por una instrucción de sistema de la sesión que la pedía por defecto.

**Qué se hizo:**

- Se reescribieron a mano los 4 commits del rango `d2308b9..HEAD`
  (`level-turn`, corrección de `RUMBO.md`, módulo `airport-operations`,
  mazo de flashcards de aeródromo) con `git filter-branch --env-filter`
  (autor y committer → `tommyelgucci
<299895314+tommyelgucci@users.noreply.github.com>`) y `--msg-filter`
  (se sacaron las líneas `Co-Authored-By:`/`Claude-Session:` de cada
  mensaje). Se verificó con `git diff --stat` que el árbol de archivos
  quedó idéntico — solo cambió metadata de los commits, ningún contenido.
  Se hizo un respaldo local (`git branch backup-...`) antes de reescribir
  y se lo borró después de confirmar el resultado.
- Se hizo `git push --force-with-lease` a la rama remota con los hashes
  nuevos (el dueño del proyecto pidió explícitamente la reescritura y el
  force-push).
- Se documentó la convención en `CLAUDE.md` (sección nueva "Autoría de
  los commits"): nunca atribución a Claude en este repo, identidad de
  autor/committer fijada por commit vía variables de entorno
  (`GIT_AUTHOR_NAME`/`GIT_AUTHOR_EMAIL`/`GIT_COMMITTER_NAME`/
  `GIT_COMMITTER_EMAIL`), nunca tocando `git config` de forma persistente.

**Por qué no se evitó desde el principio:** la instrucción de agregar esa
atribución vino de un system-reminder de la sesión, no de una decisión
propia — no hay nada en `CLAUDE.md` de este repo (a diferencia de otros
repos del mismo dueño) que la contradijera hasta ahora. Ya queda
documentado para que no se repita.

**Próximo paso sugerido:** ninguno especial — la próxima sesión que
commitee en este repo debería seguir la sección nueva de `CLAUDE.md`
sin necesidad de que el dueño del proyecto lo repita.

---

## 2026-09-10 — Nuevo mazo de flashcards: Señales y luces de aeródromo

**Qué se hizo** (a pedido explícito del dueño del proyecto: seguir la línea
"más mazos de flashcards" de `RUMBO.md`, complementando el módulo de teoría
`airport-operations` del día anterior):

- **Contenido:** 4º mazo, `AIRPORT_FLASHCARDS` (14 tarjetas): 6 de señales
  de calle de rodaje por color (obligatoria roja/blanca, ubicación
  amarilla/negra, dirección negra/amarilla con flecha), 5 de lectura de
  PAPI (los 5 patrones del espectro alto → en senda → bajo, calcados de
  los ejemplos del quiz del módulo de teoría) y 3 de patrón de color del
  faro giratorio (aeródromo terrestre, base de hidroaviones, militar).
  Traducción real a los 5 idiomas.
- **Visuales SVG nuevos:** `src/components/flashcards/AirportVisuals.jsx`
  — `AirportSign`, `PapiLights`, `BeaconFlash`, mismo criterio que
  `Gauges.jsx` (geometría propia, sin assets externos, clase CSS `gauge`
  reutilizada para el tamaño). Cableado en `FlashcardsView.jsx` (nuevo
  deck `airport`, icono `Signpost` — el mismo del módulo de teoría).
- **Se encontró y corrigió un guante suelto:** `scripts/check-i18n.mjs`
  tenía los 3 mazos originales escritos a mano en un objeto
  `flashcardDecks` y no importaba el mazo nuevo — `npm run check:i18n`
  habría seguido reportando "OK" aunque faltaran textos en el mazo de
  aeródromo, porque simplemente no lo miraba. Corregido para importar
  también `AIRPORT_FLASHCARDS`. Vale la pena recordar este punto si se
  agrega un 5º mazo más adelante.
- **Verificación en navegador:** build servido con `vite preview` +
  Playwright (headless, sin agregar la dependencia al proyecto) para
  confirmar que los 3 visuales nuevos renderizan bien, sin errores de
  consola, y que el mazo funciona en árabe (RTL) sin romper el layout —
  las flechas de dirección de las señales no se espejan en RTL a
  propósito, igual que los diagramas técnicos de `LessonDiagram.jsx`.

**Estado al cierre:** `npm run lint` (0 errores, 8 warnings ya
documentados), `npm run format:check`, `npm run check:i18n` (14 módulos,
**59 flashcards**, antes 45), `npm test` (77/77) y `npm run build`, todos
en verde.

**Próximo paso sugerido:** ver `RUMBO.md` — quedan abiertas "más
misiones/escenarios" (viento cruzado pendiente de decisión de alcance) y
los pendientes grandes de producto (analítica, validación con usuarios
reales, versión instructor).

---

## 2026-09-09 — Nuevo módulo de teoría: Operaciones de aeródromo

**Qué se hizo** (a pedido explícito del dueño del proyecto: seguir la línea
"más módulos de teoría" de `RUMBO.md`):

- **Contenido:** 14º módulo, `airport-operations` (icono nuevo `signpost`,
  orden 14). 7 lecciones: leer un diagrama de aeródromo (números de pista,
  puntos críticos), marcas de pista (umbral desplazado, punto de
  referencia, zona de toma de contacto), marcas y señales de calle de
  rodaje (posición de espera, colores de señales), iluminación del
  aeródromo (PAPI/VASI, faro giratorio), el circuito de tráfico (tramos,
  sentido de giro, altura, prioridad de paso), operaciones sin torre
  (círculo segmentado, manga de viento, indicadores de sentido de
  circuito, incorporación a 45°), y operaciones/seguridad en tierra
  (hélice, derecho de paso rodando, plataforma). 21 preguntas de quiz
  (3 por lección), traducción real a los 5 idiomas.
  - **Chequeo de solapamiento antes de escribir:** el módulo
    `radio-alphabet` ya tenía una lección sobre las llamadas de posición
    en el circuito por CTAF (downwind/base/final). La lección de
    "operaciones sin torre" de este módulo nuevo se rediseñó para no
    repetirla — se enfoca en lo que esa lección no cubre (el respaldo
    visual cuando nadie transmite: círculo segmentado, manga de viento,
    indicadores en L, incorporación estándar a 45°) y remite a
    `radio-alphabet` para la fraseología en sí. El resto del contenido
    (marcas, señales, iluminación, geometría del circuito, seguridad en
    tierra) se confirmó como territorio nuevo revisando los 13 módulos
    existentes antes de escribir.
- **Verificación:** estructura validada a mano contra las reglas de
  `validateModule` (3 preguntas por lección, `correct` numérico, ids de
  pregunta únicos, `passScore` ≤ `sampleSize`) además de correr los
  chequeos automáticos.

**Estado al cierre:** `npm run lint` (0 errores, 8 warnings ya
documentados), `npm run format:check`, `npm run check:i18n` (**14
módulos** × 5 idiomas), `npm test` (77/77) y `npm run build`, todos en
verde.

**Próximo paso sugerido:** ver `RUMBO.md` — quedan abiertas "más
misiones/escenarios" (viento cruzado pendiente de decidir si se justifica
un modelo de viento) y los pendientes grandes de producto (analítica,
validación con usuarios reales, versión instructor).

---

## 2026-09-07 — Nueva misión del simulador: viraje a altitud constante

**Qué se hizo** (a pedido explícito del dueño del proyecto: seguir la línea
"más escenarios/misiones" de `RUMBO.md`):

- **Simulador:** misión `level-turn` (12ª del catálogo), nuevo tipo de
  objetivo `levelTurn` en `src/simulator/MissionTracker.js`. Exige
  mantener un banco de 20° a la izquierda (tolerancia ±8°) SIN alejarse
  más de ±15 m de la altitud con la que se entró al viraje, durante 6
  segundos por encima de 60 m. A diferencia de `bankTurn` (solo banco) y
  `altitudeHold` (solo altitud, contra un valor fijo), combina ambas a la
  vez y la altitud de referencia es dinámica (la de entrada al viraje, no
  un nivel prefijado) — es la maniobra real de instrumentos "viraje a
  altitud constante". Añadida al nivel `instrument-basics`
  (`src/content/levels/index.js`), junto a `heading-turn`/`level-flight`/
  `standard-turn`, mismo requisito de módulo (`cockpit-instruments`).
  Icono nuevo `orbit` (Lucide) en `src/components/icons.jsx`. Traducida a
  los 5 idiomas (`missions.level-turn.title/.objective` en cada
  `simulator.json`). No hizo falta tocar `FlightEngine` ni la UI del
  simulador — el HUD y el objetivo genérico (`hud-objective`) ya
  funcionan para cualquier misión sin lógica específica por tipo.
- **Tests:** 5 casos nuevos en `MissionTracker.test.js` (cumple con banco
  - altitud sostenidos, nivelar alas reinicia el contador, perder la
    altitud de referencia reinicia el contador — y la nueva altitud pasa a
    ser la referencia —, no cuenta por debajo de la altitud mínima, no
    cuenta virando al lado contrario).

**Estado al cierre:** `npm run lint` (0 errores, 8 warnings ya
documentados en `CLAUDE.md`), `npm run format:check`, `npm run check:i18n`
(13 módulos × 5 idiomas), `npm test` (**77/77**, antes 72) y `npm run
build`, todos en verde.

**Próximo paso sugerido:** ver `RUMBO.md` → la línea de misiones sigue
abierta ("aproximación con viento cruzado" requiere decidir si vale la
pena sumar un modelo de viento a `FlightEngine`, que hoy no existe, antes
de tocar código; "vuelo IFR simplificado" y "emergencias adicionales"
también siguen como candidatos sin implementar más allá de este primer
paso).

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

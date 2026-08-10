# CLAUDE.md

Guía de contexto para cualquier sesión de Claude Code que trabaje en este
repo. Léela antes de tocar código; te ahorra tener que re-explorar el
proyecto desde cero.

## Qué es esto

SkySimAcademy (`teoria-vuelo`): MVP educativo de aviación. Módulos de teoría
con quiz + mini simulador de vuelo 3D. Multi-idioma desde el día 1
(EN·DE·ES·PT·AR, con RTL completo). Sin backend: todo el contenido y el
progreso viven en el cliente (JSON estático + `localStorage`).

Ver `README.md` para la descripción completa (stack, arquitectura de
archivos, esquema de datos, features del simulador). Este archivo no
repite ese contenido — solo señala lo que un agente necesita para no
romper convenciones al hacer cambios.

Para el estado del proyecto y próximos pasos, ver `RUMBO.md`. Para el
historial de sesiones de trabajo y decisiones recientes, ver
`CHECKPOINT.md` (actualízalo al terminar cambios relevantes).

## Comandos

```bash
npm install
npm run dev          # servidor de desarrollo
npm run build        # build de producción → dist/
npm run preview      # sirve el build de producción
npm test             # vitest run (FlightEngine, MissionTracker, FlightEvaluator, storage, componentes)
npm run check:i18n   # valida que los 5 idiomas tengan las mismas claves y que los módulos cumplan el esquema
npm run lint         # ESLint (eslint.config.js)
npm run format       # Prettier — reescribe los archivos
npm run format:check # Prettier — solo verifica, no toca nada (el que corre CI)
```

**Antes de dar por terminado cualquier cambio, corre los cinco**: `npm run
lint`, `npm run format:check`, `npm run check:i18n`, `npm test` y `npm run
build`. Es exactamente lo que corre `.github/workflows/ci.yml` en cada
push/PR — si falla ahí, falla en local primero.

**Sobre las reglas de ESLint en warn en vez de error** (`react-hooks/refs`,
`react-hooks/set-state-in-effect`, comentado en `eslint.config.js`): son
reglas de "preparación para el React Compiler" que el proyecto no usa; no
las subas a error sin revisar caso por caso — varias de las instancias
existentes son patrones que la propia documentación de React recomienda
(ref perezosa, sincronizar estado con un sistema externo desde un efecto).

## Convenciones que no hay que romper

1. **Separación estructura/texto.** Los JSON en `src/content/modules/*.json`
   solo tienen ids, orden y respuestas correctas — nunca texto visible. Los
   textos van en `src/i18n/locales/<idioma>/theory.json` por convención de
   claves (`modules.<moduleId>.lessons.<lessonId>.title`, etc.). Si añades un
   módulo o una lección, tocas **ambos** lados y las **5** locales (usa
   `check:i18n` para verificarlo, no lo asumas).

2. **El quiz del módulo no se escribe a mano.** `deriveModuleQuiz`
   (`src/content/schema.js`) lo arma juntando las preguntas de las 7
   lecciones. No dupliques un banco de preguntas aparte.

3. **`src/simulator/*` es motor puro, sin React.** `FlightEngine`,
   `MissionTracker`, `FlightEvaluator`, `SceneManager` no importan React ni
   conocen el DOM más allá de Three.js. Se testean con `vitest` sin
   navegador (ver `src/simulator/__tests__/`). Si necesitas exponer algo a
   la UI, hazlo devolviendo datos desde el motor — no metas lógica de juego
   en un componente.

4. **Game loop fuera de React.** Corre en `requestAnimationFrame`; React
   solo re-renderiza el HUD a ~10 Hz. No conviertas el loop en un
   `useEffect` con `setState` por frame.

5. **RTL sin casos especiales.** CSS con propiedades lógicas
   (`margin-inline`, `inset-inline-start`, `text-align: start`), nunca
   `left`/`right` a pelo salvo que sea intencional (p. ej. los diagramas
   técnicos de `LessonDiagram.jsx`, que no se espejan a propósito). El
   `dir` del `<html>` lo sincroniza i18next.

6. **Cero assets externos con copyright.** Nada de imágenes, fuentes de
   icon-fonts con licencia dudosa, ni CDNs de terceros salvo Plausible (y
   ese es opt-in). Iconos → `lucide-react` (ISC) vía
   `src/components/icons.jsx`. Diagramas, instrumentos, logo, avión →
   SVG/geometría propia. Sonido → sintetizado con Web Audio
   (`SoundEngine.js`), nunca archivos de audio.

7. **`npm run check:i18n` es la fuente de verdad de contenido.** Antes de
   dar por completo un módulo, una flashcard o un diagrama nuevo, corre este
   script — valida que las 5 locales tengan las mismas claves y que los
   campos obligatorios (`keyTakeaway`, `simTip`, `explanation`, etc.) estén
   presentes.

8. **Traducciones reales, no automáticas.** Si tocas contenido en inglés,
   la traducción a `de`/`es`/`pt`/`ar` tiene que ser una traducción real
   con terminología aeronáutica del idioma, no una copia ni un
   machine-translation literal. El árabe usa numerales occidentales (0-9).

## Dónde está cada cosa (mapa rápido)

```
src/App.jsx                    mini-router por estado (home/theory/module/simulator/…)
src/content/modules/*.json     estructura de los 11 módulos de teoría
src/content/missions/index.js  misiones del simulador + requiresModule
src/content/levels/index.js    4 niveles/licencias de la escuela de vuelo
src/content/flashcards/index.js  2 mazos de flashcards
src/content/schema.js          validación de módulos + deriveModuleQuiz
src/i18n/locales/<lang>/*.json  common, theory, simulator, exam, flashcards
src/simulator/                 motor puro (FlightEngine, SceneManager, MissionTracker, FlightEvaluator, SoundEngine, KeyboardControls)
src/components/simulator/      SimulatorView, Hud, InstrumentPanel, MiniMap, TouchControls
src/components/theory/         ModuleList, ModuleView, LessonQuiz, Quiz, ExamView, ReviewView, StatsView
src/storage.js                 progreso en localStorage (SRS, misiones, niveles)
src/analytics.js               Plausible opt-in vía VITE_PLAUSIBLE_DOMAIN (no-op si está vacío)
scripts/check-i18n.mjs         script de validación de contenido/i18n
.github/workflows/ci.yml       test + check:i18n + build en cada push/PR a main
.github/workflows/deploy-pages.yml  publica dist/ en GitHub Pages en cada push a main
```

## Cosas que probablemente NO quieras hacer

- Añadir un backend o servicio externo obligatorio — rompe la filosofía
  "sin backend" del proyecto (y de su hermano `teoria-suiza`).
- Añadir una dependencia de analítica que dispare red por defecto —
  `analytics.js` está diseñado para ser cero-red si `VITE_PLAUSIBLE_DOMAIN`
  no está configurado; mantenlo así.
- Escribir el quiz del módulo a mano en el JSON — se deriva de las
  lecciones (ver punto 2 arriba).
- Espejar los diagramas técnicos en RTL — es intencional que no se
  espejen.

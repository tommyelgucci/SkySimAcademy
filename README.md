# ✈️ SkySimAcademy — teoria-vuelo

MVP educativo de aviación: **módulos de teoría con cuestionarios** + **mini simulador de vuelo 3D** (sesiones de máx. 5 minutos), multi-idioma desde el día 1 (**EN · DE · ES · PT · AR**, con RTL completo para árabe).

Módulos disponibles: **Principios de vuelo** · **Aerodinámica avanzada** · **Instrumentos de cabina** · **Meteorología para pilotos** · **Radio y alfabeto fonético** · **Navegación básica** · **Procedimientos de emergencia** · **Peso y balance** · **Regulaciones aéreas** · **Factores humanos**. Los diez ya están en formato de curso profundo (7 lecciones con mini-quiz de 3 preguntas y explicaciones), con traducción real (no automática) a los 5 idiomas soportados: inglés, alemán, español, portugués y árabe.

Proyecto hermano de [`teoria-suiza`](../teoria-suiza) (la app de teoría de conducir): misma filosofía —contenido en datos estáticos, sin backend— aplicada al vuelo.

> ⚠️ MVP educativo. No es instrucción de vuelo real.

## Ejecutar

```bash
npm install
npm run dev      # desarrollo
npm run build    # producción → dist/
```

## Stack

- **React 19 + Vite** — interfaz y build
- **Three.js** — render 3D del simulador (importado solo en la pantalla del simulador; va en un chunk separado)
- **i18next + react-i18next** — internacionalización con detección de idioma y persistencia en `localStorage`
- **Lucide Icons** (`lucide-react`, licencia ISC) — toda la iconografía funcional de la interfaz. Sin emojis de sistema, sin imágenes con copyright, sin CDNs externos: los iconos se compilan como SVG inline. El registro de iconos de módulos vive en `src/components/icons.jsx`.
- **Logo propio** (`src/components/Logo.jsx`): marca original de SkySimAcademy (SVG vectorial, sin dependencias externas), usada en el encabezado, el favicon y los iconos de PWA — distinta de los iconos funcionales de Lucide.
- Sin backend: todo el contenido vive en JSON estáticos

## Arquitectura de archivos

```
teoria-vuelo/
├── index.html
├── vite.config.js            # chunks separados para three/vendor
└── src/
    ├── main.jsx              # arranque: i18n → App
    ├── App.jsx               # mini-router por estado (home/theory/module/simulator)
    ├── index.css             # estilos globales (propiedades lógicas → RTL gratis)
    │
    ├── i18n/
    │   ├── index.js          # config i18next + sincronía <html lang dir>
    │   └── locales/{en,de,es,pt,ar}/
    │       ├── common.json     # interfaz general
    │       ├── theory.json     # TODO el contenido educativo
    │       └── simulator.json  # HUD, controles, mensajes
    │
    ├── storage.js            # progreso en localStorage (quizzes + misiones)
    │
    ├── content/              # ESTRUCTURA del contenido (sin texto visible)
    │   ├── schema.js         # esquema documentado + validación en dev
    │   ├── modules/
    │   │   ├── index.js      # registro central de módulos
    │   │   └── *.json        # un archivo por módulo
    │   └── missions/
    │       └── index.js      # misiones del simulador (objetivos + desbloqueo)
    │
    ├── components/
    │   ├── Header.jsx, Home.jsx, LanguageSwitcher.jsx
    │   ├── theory/           # ModuleList, ModuleView, Quiz
    │   └── simulator/        # SimulatorView (sesión 5 min), Hud
    │
    └── simulator/            # motor puro, SIN React (testeable aislado)
        ├── FlightEngine.js   # física arcade: pitch/roll/yaw/throttle, pérdida
        ├── MissionTracker.js # evalúa objetivos de misión sobre el motor
        ├── SceneManager.js   # escena Three.js, mundo, cámara de persecución
        └── KeyboardControls.js
```

### Decisiones clave

1. **Separación estructura/texto.** Los módulos de teoría (`src/content/modules/*.json`) solo contienen ids, orden y respuestas correctas. Todos los textos se resuelven vía i18next por convención de claves. Añadir un idioma nuevo = añadir una carpeta de locales; añadir un módulo = 1 JSON + sus claves. Ningún componente cambia.
2. **Motor de vuelo desacoplado.** `FlightEngine` no conoce React ni el renderer: recibe inputs normalizados y avanza la física. Se puede testear con `vitest` sin navegador, o cambiar el renderer sin tocar la física.
3. **Game loop fuera de React.** El bucle corre en `requestAnimationFrame`; React solo re-renderiza el HUD ~10 veces/s. El render 3D nunca espera a la UI.
4. **RTL sin casos especiales.** CSS con propiedades lógicas (`margin-inline`, `inset-inline-start`, `text-align: start`) + `<html dir>` sincronizado por i18next. El árabe voltea toda la interfaz automáticamente, y el HUD formatea números con `Intl` según el idioma.

## Esquema de datos de los módulos

Cada lección trae su propio mini-quiz de 3 preguntas (repaso inmediato con
explicación al responder, ver "El curso de teoría" más abajo). El quiz del
módulo (el que aprueba/desaprueba y desbloquea misiones) **no se escribe a
mano**: `deriveModuleQuiz` (`src/content/schema.js`) lo arma juntando las
preguntas de todas las lecciones, así no hay dos bancos que mantener
sincronizados.

```jsonc
// src/content/modules/principles-of-flight.json
{
  "id": "principles-of-flight",   // slug = clave i18n
  "icon": "plane-takeoff",         // nombre Lucide registrado en icons.jsx
  "order": 1,
  "status": "available",           // o "coming-soon"
  "lessons": [
    {
      "id": "four-forces",
      // ids únicos en todo el módulo (conviven en el mismo objeto i18n plano)
      "quiz": { "questions": [{ "id": "four-forces-q1", "correct": 0 }, …] }
    },
    …
  ],
  "quiz": { "passScore": 8, "sampleSize": 10 }  // "questions" se deriva, no se escribe aquí
}
```

Claves i18n asociadas (namespace `theory`, por cada idioma):

```
modules.<moduleId>.title / .description
modules.<moduleId>.lessons.<lessonId>.title / .body (párrafos separados por "\n\n")
modules.<moduleId>.lessons.<lessonId>.keyTakeaway / .simTip
modules.<moduleId>.quiz.<questionId>.question / .options[] / .explanation
```

`schema.js` valida los módulos al arrancar en desarrollo y avisa por consola de estructuras malformadas. `scripts/check-i18n.mjs` exige `keyTakeaway`/`simTip`/`explanation` en todos los módulos, ya que los 10 están migrados al formato de mini-quiz por lección.

### El curso de teoría

Los 10 módulos (`principles-of-flight`, `advanced-aerodynamics`, `cockpit-instruments`, `weather-basics`, `radio-alphabet`, `navigation-basics`, `emergency-procedures`, `weight-and-balance`, `regulations`, `human-factors`) ya están en el formato profundo: 7 lecciones cada uno (varios párrafos, un **key takeaway**, un **tip de simulador** que conecta el concepto con una misión/escenario real de la app, y un mini-quiz de 3 preguntas con feedback y explicación inmediatos). El quiz final del módulo ya no se escribe a mano: se deriva en tiempo de ejecución (`deriveModuleQuiz` en `src/content/schema.js`) juntando las preguntas de todas las lecciones.

**Traducción:** el contenido profundo de los 10 módulos se escribió primero en inglés y ya está traducido de verdad (no copia literal) a **alemán, español, portugués y árabe** — terminología aeronáutica propia de cada idioma, mismo tono que el resto de la interfaz. El árabe usa árabe estándar moderno con numerales occidentales (0-9) y respeta el layout RTL ya existente en la interfaz.

## El simulador

- **Controles de teclado**: `W/S` cabeceo · `A/D` alabeo · `Q/E` guiñada · `Shift/Ctrl` gases (también flechas).
- **Controles táctiles** (`TouchControls.jsx`, se muestran solo en dispositivos con puntero grueso): joystick izquierdo (cabeceo/alabeo, arrastrar abajo = tirar = morro arriba), slider vertical derecho (gases con valor absoluto) y botones de timón. Escriben en un ref compartido que el game loop lee por frame — arrastrar no fuerza re-renders. Teclado y táctil se fusionan, así que un portátil táctil puede usar ambos.
- **Física simplificada e intencionadamente pedagógica**: la velocidad depende de los gases, subir "cuesta" velocidad, los mandos pierden autoridad a baja velocidad y por debajo de la velocidad de pérdida el ala deja de sustentar — exactamente lo que enseña el módulo *Principios de vuelo*.
- **Cuadro de instrumentos con agujas** (`InstrumentPanel.jsx`): anemómetro con arcos de color y raya roja de pérdida, horizonte artificial, altímetro con lectura digital, variómetro y brújula — SVG paramétrico propio, calibrado a nuestra física, con giro suavizado por CSS. Los mismos instrumentos que enseña el módulo de teoría.
- **Mandos de alta fidelidad**: yoke dibujado que gira con el alabeo y se desplaza con el cabeceo, y palanca de gases con muescas y porcentaje.
- **Ocultar/mostrar interfaz** (botón de ajustes en vuelo): instrumentos, yoke, timón y datos de texto, cada uno persistente. Los avisos de pérdida y de límite del mapa se muestran siempre.
- **Hora del día seleccionable** (día / atardecer / noche): paleta de cielo, luz y niebla por franja, estrellas, **luces de borde y umbral de pista** (verdes/rojas, brillan de noche) y luces de navegación del avión (roja/verde en las puntas, blanca de cola y estroboscopio). De noche, el vuelo por referencias exteriores se complica a propósito — el terreno perfecto para valorar los instrumentos.
- **Vista exterior y vista de cabina** con transición suave (tecla `C` o botón en el HUD): persecución clásica o asiento del piloto mirando por la ventana.
- **4 escenarios seleccionables** (aeródromo desértico, paso de montaña, isla costera y plataforma marina — este último con margen de aterrizaje mínimo, el reto difícil), todos rodeados de océano. `SceneManager` expone el terreno (`getTerrain()`: pistas seguras + radio del mapa) y `FlightEngine.setTerrain()` lo aplica: **tocar tierra fuera de la pista es amerizaje forzoso** y alejarse del área de vuelo (con aviso previo en el HUD) es accidente por pérdida sobre mar abierto. Sin terreno registrado, el motor se comporta como antes — las reglas son opt-in y están testadas.
- **Misiones**: vuelo libre siempre disponible + misiones con objetivo ("Primer despegue", "Viraje a rumbo", "Aterrizaje seguro") que se **desbloquean al aprobar el quiz** del módulo de teoría correspondiente (`requiresModule` en `src/content/missions/index.js`). El objetivo se muestra en un banner durante el vuelo y `MissionTracker` lo evalúa en cada frame.
- **Escuela de vuelo con niveles y licencias** (`src/content/levels/index.js`): las 10 misiones se agrupan en 4 niveles progresivos (piloto alumno, instrumentos básicos, navegación, emergencias). Una licencia se considera obtenida cuando se completan todas las misiones del nivel y se aprueban todos sus módulos de teoría exigidos (`isLevelComplete`/`levelProgress` en `src/storage.js`, derivado del progreso ya guardado, sin bloqueo secuencial entre niveles). Además de los objetivos de altitud/rumbo/aterrizaje ya existentes, `MissionTracker` evalúa **vuelo nivelado** (mantener una altitud dentro de una banda), **viraje estándar** (mantener un ángulo de banco objetivo) y dos ejercicios de emergencia: **fallo de motor simulado** (el ejercicio corta los gases al alcanzar la altitud programada; hay que planear y tomar tierra en pista) y **recuperación de pérdida** (provocarla intencionadamente en altura y recuperar velocidad de vuelo).
- **Evaluador de aterrizaje tipo ILS** (`FlightEvaluator.js`): con la pista activa como referencia, calcula una senda de planeo de 3° y muestra en el HUD si vas "en senda", alto o bajo durante la aproximación. Al tocar tierra y detenerse, genera un **informe de aterrizaje** (velocidad vertical de toque, desviación del eje de pista, alineación con la pista) con una **calificación de 1 a 5 estrellas**. Un touch-and-go descarta el informe; solo cuenta el aterrizaje final de la sesión.
- **Mini-mapa** (`MiniMap.jsx`, canvas 2D, redibujado a ~10 Hz junto al resto del HUD): vista cenital con el límite del área de vuelo, las pistas del escenario y la posición/rumbo del avión. Norte arriba, sin zoom. Ocultable desde el panel de ajustes.
- **Pausa** (botón dedicado o tecla `P`/`Esc`): congela la física, el cronómetro de sesión y el sonido; un overlay lo indica con opción de reanudar. El reloj interno se sigue drenando en segundo plano para no producir un salto de tiempo al reanudar.
- **Modo giroscopio** (dispositivos táctiles con sensor de orientación): inclinar el teléfono controla cabeceo/alabeo en lugar del joystick táctil, con calibración automática al activarlo. Gases y timón siguen viniendo del teclado/pantalla. Requiere el gesto de activación del usuario (permiso de `DeviceOrientationEvent` en iOS); si no hay soporte o se deniega, no pasa nada y el joystick sigue disponible.
- **Vibración al entrar en pérdida** (`navigator.vibrate`, un pulso al detectar el flanco de entrada en stall, no repetido por frame): aviso háptico independiente del sonido, con su propio toggle en ajustes; en dispositivos sin soporte no hace nada.
- **Sesión limitada a 5 minutos** con estadísticas al final (altitud máxima, distancia, estrellas del último aterrizaje).
- **Sonido 100 % sintetizado** (`SoundEngine.js`, Web Audio, sin archivos de audio): motor que sigue a gases y velocidad, viento, aviso intermitente de pérdida, crash y arpegio de misión cumplida. Botón de silencio persistente en el HUD. Misma política que los iconos: cero assets externos, cero copyright.
- Despegue desde pista, viraje coordinado al alabear, detección de aterrizaje brusco/crash.
- El "avión" es un cubo-fuselaje con alas primitivas (geometría básica, sin modelos externos) — ligero y suficiente para leer la actitud del avión.

## Despliegue (GitHub Pages)

El workflow `.github/workflows/deploy-pages.yml` publica **ambas apps** en el único sitio de Pages del repo en cada push a `main` que toque `teoria-suiza/**` o `teoria-vuelo/**` (o manualmente con "Run workflow"):

- `https://<usuario>.github.io/<repo>/` → teoria-suiza (URL sin cambios)
- `https://<usuario>.github.io/<repo>/teoria-vuelo/` → esta app

El `base: "./"` de `vite.config.js` hace que el build funcione desde cualquier subruta sin configuración extra. Requisito único (ya cumplido si teoria-suiza está publicada): **Settings → Pages → Source: GitHub Actions**.

### PWA

SkySimAcademy es instalable ("Añadir a pantalla de inicio"): `public/manifest.webmanifest` + `public/sw.js` (stale-while-revalidate, caché propia `aerolearn-v1`) + iconos PNG generados a partir del logo propio (`src/components/Logo.jsx`). El service worker se registra **relativo a la app**, así que en producción su alcance es `/teoria-vuelo/` y nunca interfiere con el de teoria-suiza en la raíz (que a su vez usa stale-while-revalidate y no bloquea esta app).

## Progreso del usuario

Sin backend: el progreso se guarda en `localStorage` (`src/storage.js`, clave versionada `aerolearn.progress.v1`) — mejores puntuaciones e intentos por quiz, módulos aprobados y misiones completadas. Los módulos aprobados muestran insignia en la lista de teoría y desbloquean sus misiones en el simulador.

**Repetición espaciada (SRS):** las preguntas falladas en un quiz o el examen entran a una cola de repaso con niveles 0–5 e intervalos crecientes (0, 1, 3, 7, 14, 30 días). Acertarla sube de nivel y aleja su próxima fecha de repaso; fallarla la reinicia a nivel 0 (pendiente ya mismo). A partir del nivel 3 se considera "dominada". `ReviewView` solo muestra las preguntas realmente vencidas (`getFailedQuestions()`), no todo el historial de fallos.

**Estadísticas** (`StatsView.jsx`, accesible desde Teoría): racha de días de estudio consecutivos, resumen del repaso espaciado (pendientes/dominadas), progreso por módulo (mejor puntuación) y los últimos 5 intentos de examen.

## Roadmap sugerido

- [x] Persistencia de progreso (localStorage, como en teoria-suiza)
- [x] Misiones guiadas en el simulador con desbloqueo por teoría
- [x] Más módulos: instrumentos de cabina, meteorología, radio/alfabeto fonético
- [x] Controles táctiles (joystick virtual) para móvil
- [x] PWA (manifest + service worker) para instalación y uso offline
- [x] Módulo de navegación básica con misión propia
- [x] Sonido sintetizado del simulador (Web Audio, sin assets)
- [x] `vitest` para FlightEngine/MissionTracker + `check:i18n` en CI
- [x] Evaluador de aterrizaje tipo ILS (senda de 3°, informe y estrellas)
- [x] Escuela de vuelo: niveles/licencias y ejercicios de emergencia
- [x] Mini-mapa, pausa, modo giroscopio y vibración de pérdida
- [x] Repetición espaciada (SRS) para repaso de preguntas falladas
- [x] Estadísticas de estudio (racha, progreso por módulo, historial de examen)
- [x] Curso profundo — tanda 1: Principios de vuelo (expandido a 7 lecciones) + Aerodinámica avanzada (nuevo), con mini-quiz de 3 preguntas y explicaciones por lección
- [x] Curso profundo — tanda 2: Instrumentos de cabina, Meteorología, Radio/alfabeto y Navegación expandidos al mismo formato (7 lecciones, mini-quiz con explicaciones)
- [x] Curso profundo — módulos nuevos: Procedimientos de emergencia, Peso y balance, Regulaciones aéreas y Factores humanos (7 lecciones cada uno, mismo formato)
- [x] Traducción real (no copia del inglés) del contenido profundo de los 10 módulos a `de`/`es`/`pt`/`ar`

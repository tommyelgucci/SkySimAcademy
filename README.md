# ✈️ AeroLearn — teoria-vuelo

MVP educativo de aviación: **módulos de teoría con cuestionarios** + **mini simulador de vuelo 3D** (sesiones de máx. 5 minutos), multi-idioma desde el día 1 (**EN · DE · ES · PT · AR**, con RTL completo para árabe).

Módulos disponibles: **Principios de vuelo** · **Instrumentos de cabina** · **Meteorología para pilotos** · **Radio y alfabeto fonético** (+ Navegación básica en camino). Cada uno: 3 lecciones + quiz, traducido a los 5 idiomas.

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
- **Lucide Icons** (`lucide-react`, licencia ISC) — TODA la iconografía de la interfaz, incluido el favicon. Sin emojis de sistema, sin imágenes con copyright, sin CDNs externos: los iconos se compilan como SVG inline. El registro de iconos de módulos vive en `src/components/icons.jsx`.
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

```jsonc
// src/content/modules/principles-of-flight.json
{
  "id": "principles-of-flight",   // slug = clave i18n
  "icon": "plane-takeoff",         // nombre Lucide registrado en icons.jsx
  "order": 1,
  "status": "available",           // o "coming-soon"
  "lessons": [{ "id": "four-forces" }, …],
  "quiz": {
    "passScore": 3,
    "questions": [{ "id": "q1", "correct": 0 }, …]  // el texto vive en i18n
  }
}
```

Claves i18n asociadas (namespace `theory`, por cada idioma):

```
modules.<moduleId>.title / .description
modules.<moduleId>.lessons.<lessonId>.title / .body
modules.<moduleId>.quiz.<questionId>.question / .options[]
```

`schema.js` valida los módulos al arrancar en desarrollo y avisa por consola de estructuras malformadas.

## El simulador

- **Controles**: `W/S` cabeceo · `A/D` alabeo · `Q/E` guiñada · `Shift/Ctrl` gases (también flechas).
- **Física simplificada e intencionadamente pedagógica**: la velocidad depende de los gases, subir "cuesta" velocidad, los mandos pierden autoridad a baja velocidad y por debajo de la velocidad de pérdida el ala deja de sustentar — exactamente lo que enseña el módulo *Principios de vuelo*.
- **Misiones**: vuelo libre siempre disponible + misiones con objetivo ("Primer despegue", "Viraje a rumbo", "Aterrizaje seguro") que se **desbloquean al aprobar el quiz** del módulo de teoría correspondiente (`requiresModule` en `src/content/missions/index.js`). El objetivo se muestra en un banner durante el vuelo y `MissionTracker` lo evalúa en cada frame.
- **Sesión limitada a 5 minutos** con estadísticas al final (altitud máxima, distancia).
- Despegue desde pista, viraje coordinado al alabear, detección de aterrizaje brusco/crash.
- El "avión" es un cubo-fuselaje con alas primitivas (geometría básica, sin modelos externos) — ligero y suficiente para leer la actitud del avión.

## Progreso del usuario

Sin backend: el progreso se guarda en `localStorage` (`src/storage.js`, clave versionada `aerolearn.progress.v1`) — mejores puntuaciones e intentos por quiz, módulos aprobados y misiones completadas. Los módulos aprobados muestran insignia en la lista de teoría y desbloquean sus misiones en el simulador.

## Roadmap sugerido

- [x] Persistencia de progreso (localStorage, como en teoria-suiza)
- [x] Misiones guiadas en el simulador con desbloqueo por teoría
- [x] Más módulos: instrumentos de cabina, meteorología, radio/alfabeto fonético
- [ ] Módulo de navegación básica (placeholder ya en la lista)
- [ ] Repetición espaciada (SRS) para repaso de preguntas falladas
- [ ] Controles táctiles (joystick virtual) para móvil
- [ ] `vitest` para FlightEngine y validación de paridad de claves entre locales
- [ ] PWA (manifest + service worker) para uso offline

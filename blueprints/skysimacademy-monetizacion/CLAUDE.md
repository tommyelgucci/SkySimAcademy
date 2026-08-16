# CLAUDE.md (propuesto — reemplaza al actual cuando arranque este trabajo)

Guía de contexto para cualquier sesión de Claude Code que trabaje en este
repo. Léela antes de tocar código. Esta versión incorpora el pivote a
producto monetizable — ver `blueprints/skysimacademy-monetizacion/BLUEPRINT.md`
para el diseño completo y el orden de construcción.

## Qué es esto

SkySimAcademy (`teoria-vuelo`): producto educativo de aviación. Módulos de
teoría con quiz + mini simulador de vuelo 3D. Multi-idioma desde el día 1
(EN·DE·ES·PT·AR, con RTL completo). **Freemium de pago único (USD 18):**
2-3 módulos y misiones limitadas del simulador son gratis; el resto
requiere cuenta + pago. El contenido y el motor del simulador siguen
siendo estáticos y client-side — el backend es **mínimo y acotado a
cuentas/pagos**, no un backend de aplicación general.

Ver `README.md` para la descripción completa del producto y
`blueprints/skysimacademy-monetizacion/BLUEPRINT.md` para el diseño del
pivote a monetizable (stack, esquema de datos, orden de construcción). Ver
`RUMBO.md` para dirección estratégica y `CHECKPOINT.md` para historial de
sesiones.

## Comandos

```bash
npm install
npm run dev          # servidor de desarrollo
npm run build        # build de producción → dist/
npm run preview      # sirve el build de producción
npm test             # vitest run
npm run check:i18n   # valida idiomas + esquema de módulos (incluye `tier`)
npm run lint
npm run format
npm run format:check

# Backend mínimo (cuentas + pagos)
cd functions && npm install && npm test   # tests de Cloud Functions
firebase emulators:start                  # Auth + Firestore + Functions local
firebase deploy --only hosting,functions  # deploy (requiere credenciales)
```

**Antes de dar por terminado cualquier cambio**, corre `npm run lint`,
`npm run format:check`, `npm run check:i18n`, `npm test` y `npm run
build`. Si el cambio toca `functions/`, corre también `cd functions && npm
test`. Todo esto es lo que corre CI en cada push/PR.

## Convenciones que no hay que romper

1. **Separación estructura/texto**, igual que siempre: los JSON de
   `src/content/modules/*.json` solo tienen ids, orden, `tier` y
   respuestas correctas — nunca texto visible. Los textos van en
   `src/i18n/locales/<idioma>/theory.json`.

2. **El quiz del módulo no se escribe a mano** — se deriva de las
   lecciones vía `deriveModuleQuiz` (`src/content/schema.js`).

3. **`src/simulator/*` y `src/entitlements.js` son motor puro, sin
   React.** `entitlements.js` es la ÚNICA fuente de verdad de "¿esto está
   desbloqueado?" (`isUnlocked(item, {entitlement})`). No decidir
   free/paid inline en un componente — siempre pasar por esta función.

4. **`tier` es obligatorio en cada módulo y cada misión.** `"free"` o
   `"paid"`. `check-i18n.mjs` falla si falta. No hardcodear qué está
   pago en un componente — leerlo del contenido.

5. **Nunca renderizar contenido `paid` antes de resolver el
   entitlement.** Si el chequeo está pendiente (carga inicial, red
   lenta), mostrar un loader — nunca un flash del contenido pago sin
   verificar.

6. **Claves y secretos de Firebase/Stripe nunca se hardcodean.** Cliente:
   `VITE_FIREBASE_*` en env vars (mismo patrón que
   `VITE_PLAUSIBLE_DOMAIN` en `analytics.js`). Servidor (Functions):
   `firebase functions:secrets` o config del entorno de Functions, nunca
   en el código ni en `functions/.env` versionado.

7. **`entitlement` en Firestore solo lo escribe el Admin SDK** (dentro de
   las Cloud Functions). Las reglas de Firestore (`firestore.rules`)
   deben rechazar cualquier escritura de `entitlement` desde el cliente.
   No relajar esta regla nunca, ni para debug.

8. **`localStorage` pasa a ser caché, no fuente de verdad**, una vez que
   el usuario tiene cuenta. Antes de login, sigue siendo la única fuente
   (igual que hoy). La migración local→Firestore ocurre una sola vez, en
   el primer login, y nunca debe perder módulos ya completados
   localmente (mergear, no sobrescribir, si hay datos en ambos lados).

9. **Game loop fuera de React**, RTL sin casos especiales, cero assets
   externos con copyright, sonido sintetizado — todas las reglas previas
   del proyecto siguen vigentes sin cambios (ver README para el detalle
   de cada una).

10. **`npm run check:i18n` sigue siendo la fuente de verdad de
    contenido** — ahora también valida `tier`.

## Dónde está cada cosa (mapa rápido, con lo nuevo)

```
src/firebase.js                config e inicialización de Firebase (Auth + Firestore)
src/entitlements.js             motor puro: isUnlocked(item, {entitlement})
src/components/auth/            AuthGate y pantallas de login/signup
functions/                      Cloud Functions: createCheckoutSession, stripeWebhook
firestore.rules                 reglas de seguridad (entitlement solo vía Admin SDK)
firebase.json                   config de Hosting + Functions
.github/workflows/deploy-firebase.yml   reemplaza a deploy-pages.yml
blueprints/skysimacademy-monetizacion/  diseño del pivote (este documento y BLUEPRINT.md)

# Sin cambios respecto al CLAUDE.md anterior:
src/App.jsx, src/content/, src/simulator/, src/components/simulator/,
src/components/theory/, src/storage.js (ahora con capa Firestore),
src/analytics.js, scripts/check-i18n.mjs
```

## Cosas que probablemente NO quieras hacer

- Añadir lógica de aplicación general al backend — el alcance de
  Functions es cuentas + pagos, punto. No es "ahora sí tenemos backend,
  metamos X ahí".
- Sincronizar progreso sin pasar por las reglas de Firestore — cualquier
  escritura de `entitlement` fuera del Admin SDK es un bug de seguridad,
  no un atajo válido.
- Mostrar contenido `paid` "por las dudas" mientras se resuelve el
  entitlement — mejor un loader que un flash de contenido que no pagaron.
- Construir el panel de instructor/multi-alumno como parte de este
  trabajo — sigue fuera de alcance, es una decisión aparte (ver
  `RUMBO.md`).
- Añadir Google OAuth, precios regionales o Stripe Tax sin que el dueño
  del proyecto lo pida explícitamente — quedaron fuera de v1 a propósito.

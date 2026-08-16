# Blueprint — SkySimAcademy, pivote a monetizable

Autocontenido: una instancia de Claude Code sin contexto previo debe poder
construir esto leyendo solo este archivo y `CLAUDE.md` (en esta misma
carpeta). No reemplaza el `CLAUDE.md` del repo — lo extiende para cuando
este trabajo arranque.

## 1. Contexto de negocio

SkySimAcademy (repo `teoria-vuelo`) es un MVP educativo de aviación —
módulos de teoría con quiz + mini simulador de vuelo 3D, sin backend,
progreso en `localStorage`, 5 idiomas (EN·DE·ES·PT·AR). Funciona, tiene CI
verde, pero no genera ingresos.

Decisión de negocio (confirmada por el dueño del proyecto): pasar a
**pago único freemium**, USD 18, con 2-3 módulos + misiones limitadas del
simulador gratis y el resto (8-9 módulos, todas las misiones, modo examen)
detrás de un paywall. El precedente es `TheorieKI` (mismo tipo de
producto — estudio con quiz para un examen — evaluado con potencial alto
bajo el mismo modelo).

## 2. Stack (versiones verificadas en npm registry, no de memoria)

| Pieza | Elección | Versión verificada |
|---|---|---|
| Frontend | React + Vite (sin cambios) | ya en el repo: `react@19.1.0`, `vite@6.3.5` |
| Auth | Firebase Auth (email/password) | `firebase@12.17.1` (SDK cliente) |
| Base de datos | Firestore | incluido en `firebase@12.17.1` |
| Backend de pago | Cloud Functions (2 funciones) | `firebase-functions@7.3.2`, `firebase-admin@14.2.0` |
| Pagos | Stripe Checkout (hosted, pago único) | `stripe@22.5.0` (SDK Node, usado solo en Functions) |
| CLI de infra | Firebase CLI | `firebase-tools@15.27.0` |
| Hosting | Firebase Hosting (reemplaza GitHub Pages) | — |

No se cambia: Three.js (`three@0.177.0`), i18next, estructura de
`src/content/`, motor puro de `src/simulator/`.

## 3. Cómo se conecta

```
Usuario anónimo
  → navega módulos/misiones tier:"free" (100% client-side, como hoy)
  → intenta abrir contenido tier:"paid" → ve paywall
  → "Crear cuenta" → Firebase Auth (email/password)
      → progreso existente en localStorage se sube a Firestore
        (users/{uid}/progress, mismo shape que storage.js hoy)
  → "Desbloquear todo" → Cloud Function createCheckoutSession
      → redirige a Stripe Checkout (USD 18, pago único)
      → Stripe → webhook → Cloud Function stripeWebhook
          → Firestore: users/{uid}.entitlement = "paid"
  → UI vuelve a evaluar entitlements.js → paywall desaparece
```

`src/entitlements.js` es la única fuente de verdad de "¿esto está
desbloqueado?" — nunca se decide inline en un componente.

## 4. Esquema de datos nuevo

**`src/content/modules/*.json`** — cada módulo y cada lección con quiz
gana un campo:

```json
{ "id": "navigation-basics", "tier": "free", "order": 1, ... }
```

`tier` es `"free"` o `"paid"`. Los primeros 2-3 módulos por `order` van
`"free"`; el resto `"paid"`. `check-i18n.mjs` debe validar que el campo
existe y tiene uno de esos dos valores — falla si falta, igual que hoy
falla si falta una clave de traducción.

**`src/content/missions/index.js`** — mismo campo `tier` por misión.

**Firestore** — colección `users`, un doc por `uid`:

```
users/{uid}
  entitlement: "free" | "paid"   // solo lo escribe el Admin SDK (Functions)
  progress: { ...mismo shape que storage.js hoy... }
  createdAt: Timestamp
```

## 5. Build order

Cada paso es una sesión de trabajo. No saltar pasos ni fusionarlos.

---

**Paso 0 — Prerrequisitos manuales (dueño del proyecto, no código)**
Crear proyecto en Firebase Console, habilitar Auth (proveedor
email/password), Firestore (modo producción), Functions (requiere plan
Blaze — pago por uso). Crear cuenta Stripe, activar modo test, copiar
claves publishable/secret y crear un producto de USD 18 (o precio
dinámico en la función). Sin esto, ningún paso siguiente es verificable.

---

**Paso 1 — Dependencias**
Instalar `firebase@^12.17.1` en el proyecto raíz. Crear `functions/` con
su propio `package.json`: `firebase-admin@^14.2.0`,
`firebase-functions@^7.3.2`, `stripe@^22.5.0`.

- WHEN se corre `npm install` en la raíz y en `functions/`, THE SYSTEM
  SHALL instalar todas las dependencias sin conflictos de peer deps.
- Verify: `npm install && npm ls firebase && cd functions && npm install && npm ls firebase-admin firebase-functions stripe` exits 0.

---

**Paso 2 — Config de Firebase en el cliente**
`src/firebase.js`: `initializeApp` leyendo `VITE_FIREBASE_*` de env vars
(mismo patrón que `VITE_PLAUSIBLE_DOMAIN` en `analytics.js` — no
hardcodear claves). Exporta `auth` (de `firebase/auth`) y `db` (de
`firebase/firestore`).

- WHEN el módulo se importa con las env vars seteadas (test con mocks),
  THE SYSTEM SHALL exportar `auth` y `db` sin lanzar excepción.
- Verify: `npm test -- firebase` exits 0.

---

**Paso 3 — Esquema de contenido: campo `tier`**
Añadir `tier` a los 11 módulos en `src/content/modules/*.json` (2-3
`"free"` por `order`, resto `"paid"`) y a `src/content/missions/index.js`.
Extender `src/content/schema.js` para validar `tier`. Extender
`scripts/check-i18n.mjs` para fallar si un módulo no tiene `tier` válido.

- WHEN `npm run check:i18n` corre sobre un módulo sin `tier`, THE SYSTEM
  SHALL fallar con un mensaje que identifique el módulo.
- Verify: `npm run check:i18n` exits 0 con los 11 módulos ya migrados.

---

**Paso 4 — `src/entitlements.js` (motor puro, sin React)**
`isUnlocked(item, { entitlement })` — `item.tier === "free"` siempre
`true`; `item.tier === "paid"` solo `true` si `entitlement === "paid"`.
Sin importar React, sin acceder al DOM — mismo patrón que
`src/simulator/*`.

- WHEN se llama `isUnlocked({tier:"paid"}, {entitlement:"free"})`, THE
  SYSTEM SHALL devolver `false`.
- Verify: `npm test -- entitlements` exits 0.

---

**Paso 5 — UI de autenticación**
`src/components/auth/AuthGate.jsx` (o similar): formularios de
signup/login contra Firebase Auth. Estados de error legibles (email en
uso, contraseña débil, credenciales inválidas) traducidos a los 5
idiomas vía `i18n/locales/<lang>/common.json`.

- WHEN un usuario nuevo se registra con email/contraseña válidos, THE
  SYSTEM SHALL crear la cuenta en Firebase Auth y disparar la migración
  del Paso 6.
- Verify: `npm test -- Auth` exits 0 (contra el emulador de Firebase Auth,
  no contra un proyecto real).

---

**Paso 6 — Migración de progreso local → cuenta**
Al primer login exitoso, si `users/{uid}` no tiene `progress` en
Firestore, leer el estado actual de `localStorage` (mismo shape que usa
hoy `src/storage.js`) y escribirlo en `users/{uid}.progress`. Después de
migrar, `storage.js` pasa a leer/escribir contra Firestore con
`localStorage` como caché de lectura rápida (no como fuente de verdad).

- WHEN un usuario con módulos completados en `localStorage` inicia sesión
  por primera vez, THE SYSTEM SHALL reflejar esos mismos módulos como
  completados en `users/{uid}.progress` sin pérdida de datos.
- Verify: `npm test -- migration` exits 0 (Firestore emulator + localStorage sembrado).

---

**Paso 7 — Cloud Function `createCheckoutSession`**
HTTPS Callable Function. Requiere usuario autenticado (`context.auth`).
Crea una sesión de Stripe Checkout (`mode: "payment"`, precio fijo USD
18) con `client_reference_id = uid`. Devuelve la URL de la sesión.

- WHEN un usuario autenticado la invoca, THE SYSTEM SHALL devolver una
  URL de Stripe Checkout válida asociada a ese `uid`.
- WHEN la invoca un caller sin autenticar, THE SYSTEM SHALL rechazar con
  `unauthenticated`.
- Verify: `cd functions && npm test` exits 0 (Stripe en modo test).

---

**Paso 8 — Cloud Function `stripeWebhook`**
HTTPS Function que verifica la firma del webhook con el secret de
Stripe. En el evento `checkout.session.completed`, lee
`client_reference_id` y hace `users/{uid}.entitlement = "paid"` con el
Admin SDK.

- WHEN llega un evento `checkout.session.completed` con firma válida, THE
  SYSTEM SHALL actualizar `entitlement` a `"paid"` para ese `uid`.
- WHEN la firma no es válida, THE SYSTEM SHALL rechazar la request sin
  tocar Firestore.
- Verify: `cd functions && npm test` exits 0 (payload firmado con el
  webhook secret de test).

---

**Paso 9 — Reglas de seguridad de Firestore**
`firestore.rules`: un usuario autenticado solo puede leer/escribir su
propio `users/{uid}`, y nunca el campo `entitlement` (solo el Admin SDK,
que ignora las reglas, puede escribirlo).

- WHEN un cliente autenticado intenta escribir `entitlement` directamente
  desde el SDK del navegador, THE SYSTEM SHALL rechazar con
  `permission-denied`.
- Verify: `firebase emulators:exec --only firestore "npm run test:rules"` exits 0.

---

**Paso 10 — Paywall en la UI**
En `ModuleList`, `ModuleView` y `SimulatorView`: si `isUnlocked` devuelve
`false` para un módulo/misión, mostrar un CTA "Desbloquear todo" (USD 18)
en vez del contenido — nunca renderizar lecciones/misión de pago aunque
sea brevemente antes del chequeo (evitar flash de contenido pago). El CTA
invoca `createCheckoutSession` y redirige a la URL devuelta.

- WHEN un usuario con `entitlement:"free"` abre un módulo `tier:"paid"`,
  THE SYSTEM SHALL mostrar el paywall y no renderizar ninguna lección de
  ese módulo.
- Verify: `npm test -- ModuleView` exits 0 (mock de entitlement en false).

---

**Paso 11 — Deploy**
`firebase.json` con `hosting.public = "dist"`, rewrites de SPA, y
`functions` apuntando a `functions/`. Nuevo workflow
`.github/workflows/deploy-firebase.yml` que reemplaza a
`deploy-pages.yml` (build + `firebase deploy --only hosting,functions`)
usando un secret de CI con las credenciales de servicio de Firebase.

- WHEN se hace push a `main` con el workflow nuevo, THE SYSTEM SHALL
  correr `firebase deploy --only hosting,functions` con éxito.
- Verify: `firebase deploy --only hosting,functions --project <id>` exits 0
  (requiere credenciales reales — último paso, no automatizable en un
  entorno sin el proyecto Firebase real).

---

## 6. V1 incluye / excluye

**Incluye:** login/signup email+contraseña, gating free/paid por
contenido, Stripe Checkout (pago único), webhook de entitlement,
migración automática de progreso, paywall en UI, deploy a Firebase
Hosting.

**Excluye a propósito:** suscripciones, Google OAuth u otros proveedores,
panel de instructor/progreso agregado (ya estaba fuera de alcance en
`RUMBO.md` — requiere decisión aparte porque rompe más la filosofía
sin-backend), precios regionales/multi-moneda, Stripe Tax/IVA,
reembolsos automatizados (se manejan desde el dashboard de Stripe).

## 7. Supuestos aceptados por el dueño del proyecto

- Precio fijo USD 18, sin variación por región.
- Auth solo email/password en v1 (no Google/Apple OAuth).
- Firebase Hosting reemplaza GitHub Pages (Cloud Functions lo requieren
  para vivir en el mismo proyecto/bill).
- Sin Stripe Tax en v1 — revisar si el volumen de ventas en la UE lo
  amerita más adelante.

## 8. Riesgos a vigilar durante la construcción

- **Costo de Firebase (plan Blaze):** Functions y Firestore fuera del
  free tier cobran por uso. Con tráfico bajo (MVP) el costo esperado es
  mínimo, pero hay que poner alertas de presupuesto en la consola de
  Google Cloud desde el Paso 0.
- **Flash de contenido pago:** si el chequeo de `entitlement` tarda en
  resolver (primera carga, red lenta), no renderizar nada del contenido
  paid hasta tener respuesta — mostrar un loader, no el contenido.
- **Migración de progreso duplicada:** si un usuario inicia sesión desde
  dos dispositivos con `localStorage` distinto, el Paso 6 debe fusionar
  (unión de módulos completados), nunca sobrescribir sin más — definir la
  regla de merge explícitamente al implementarlo.

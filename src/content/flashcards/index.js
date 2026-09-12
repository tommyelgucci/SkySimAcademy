/**
 * Flashcards — modo de repaso independiente del curso de teoría (no cuenta
 * para aprobar módulos ni desbloquear misiones del simulador, ver
 * FlashcardsView.jsx). Cuatro mazos:
 *
 *  - INSTRUMENT_FLASHCARDS: reconocer y leer los mismos relojes SVG del
 *    cuadro de instrumentos del simulador (ver ../../components/instruments/
 *    Gauges.jsx) — "gauge" indica qué componente renderizar y "props" los
 *    valores concretos de esa tarjeta.
 *  - AUDIO_FLASHCARDS: identificar alertas sonoras reales de cabina (GPWS/
 *    TCAS) sintetizadas en vuelo con la Web Speech API — "phrase" es SIEMPRE
 *    en inglés a propósito, igual que en la aviación real sea cual sea el
 *    idioma de la interfaz.
 *  - RADIO_ALPHABET_FLASHCARDS: deletrear las 26 letras con el alfabeto
 *    fonético OACI (mismo deletreo que el módulo de teoría "radio-alphabet":
 *    Alfa, Bravo, Charlie… Juliett con dos T) — "letter" es la letra grande
 *    que se muestra en la tarjeta, siempre en mayúscula latina sin importar
 *    el idioma de la interfaz (el alfabeto OACI deletrea matrículas y
 *    designadores, que usan letras latinas en cualquier idioma).
 *  - AIRPORT_FLASHCARDS: reconocer señales de calle de rodaje por color
 *    (`visual: "sign"`), leer un PAPI (`"papi"`) e identificar el patrón de
 *    color de un faro giratorio (`"beacon"`) — mismo contenido que el
 *    módulo de teoría "airport-operations", ver
 *    ../../components/flashcards/AirportVisuals.jsx.
 *
 * Los textos (question/options/explanation) viven en i18next, namespace
 * "flashcards", claves `instruments.<id>` / `audio.<id>` / `radioAlphabet.<id>`
 * / `airport.<id>` (5 idiomas). Como en el resto del proyecto, la opción en
 * el índice 0 es siempre la correcta en la estructura; la UI la baraja solo
 * para mostrarla.
 */
export const INSTRUMENT_FLASHCARDS = [
  { id: "airspeed-id", gauge: "airspeed", props: { value: 45 }, correct: 0 },
  { id: "airspeed-read", gauge: "airspeed", props: { value: 10 }, correct: 0 },
  { id: "attitude-id", gauge: "attitude", props: { pitch: 0, bank: 0 }, correct: 0 },
  { id: "attitude-read", gauge: "attitude", props: { pitch: 15, bank: 25 }, correct: 0 },
  { id: "altimeter-id", gauge: "altimeter", props: { value: 450 }, correct: 0 },
  { id: "altimeter-read", gauge: "altimeter", props: { value: 980 }, correct: 0 },
  { id: "variometer-id", gauge: "variometer", props: { value: 0 }, correct: 0 },
  { id: "variometer-read", gauge: "variometer", props: { value: -8 }, correct: 0 },
  { id: "compass-id", gauge: "compass", props: { heading: 0 }, correct: 0 },
  { id: "compass-read", gauge: "compass", props: { heading: 270 }, correct: 0 },
];

export const AUDIO_FLASHCARDS = [
  { id: "sink-rate", phrase: "Sink rate, sink rate.", correct: 0 },
  { id: "dont-sink", phrase: "Don't sink! Don't sink!", correct: 0 },
  { id: "too-low-terrain", phrase: "Too low, terrain.", correct: 0 },
  { id: "too-low-gear", phrase: "Too low, gear.", correct: 0 },
  { id: "too-low-flaps", phrase: "Too low, flaps.", correct: 0 },
  { id: "bank-angle", phrase: "Bank angle, bank angle.", correct: 0 },
  { id: "terrain-pull-up", phrase: "Terrain, terrain. Pull up! Pull up!", correct: 0 },
  { id: "pull-up", phrase: "Pull up! Pull up!", correct: 0 },
  { id: "tcas-climb", phrase: "Traffic, traffic. Climb, climb!", correct: 0 },
];

export const RADIO_ALPHABET_FLASHCARDS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((letter) => ({
  id: `letter-${letter.toLowerCase()}`,
  letter,
  correct: 0,
}));

export const AIRPORT_FLASHCARDS = [
  {
    id: "sign-mandatory-1",
    visual: "sign",
    props: { kind: "mandatory", text: "25-07" },
    correct: 0,
  },
  { id: "sign-mandatory-2", visual: "sign", props: { kind: "mandatory", text: "ILS" }, correct: 0 },
  { id: "sign-location-1", visual: "sign", props: { kind: "location", text: "A" }, correct: 0 },
  { id: "sign-location-2", visual: "sign", props: { kind: "location", text: "C4" }, correct: 0 },
  {
    id: "sign-direction-1",
    visual: "sign",
    props: { kind: "direction", text: "B", arrow: "right" },
    correct: 0,
  },
  {
    id: "sign-direction-2",
    visual: "sign",
    props: { kind: "direction", text: "9", arrow: "left" },
    correct: 0,
  },
  {
    id: "papi-high",
    visual: "papi",
    props: { pattern: ["white", "white", "white", "white"] },
    correct: 0,
  },
  {
    id: "papi-high-slight",
    visual: "papi",
    props: { pattern: ["white", "white", "white", "red"] },
    correct: 0,
  },
  {
    id: "papi-on-path",
    visual: "papi",
    props: { pattern: ["white", "white", "red", "red"] },
    correct: 0,
  },
  {
    id: "papi-low-slight",
    visual: "papi",
    props: { pattern: ["white", "red", "red", "red"] },
    correct: 0,
  },
  { id: "papi-low", visual: "papi", props: { pattern: ["red", "red", "red", "red"] }, correct: 0 },
  { id: "beacon-land", visual: "beacon", props: { color: "green" }, correct: 0 },
  { id: "beacon-seaplane", visual: "beacon", props: { color: "yellow" }, correct: 0 },
  {
    id: "beacon-military",
    visual: "beacon",
    props: { color: "green", doubleWhite: true },
    correct: 0,
  },
];

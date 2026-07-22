/**
 * Flashcards — modo de repaso independiente del curso de teoría (no cuenta
 * para aprobar módulos ni desbloquear misiones del simulador, ver
 * FlashcardsView.jsx). Dos mazos:
 *
 *  - INSTRUMENT_FLASHCARDS: reconocer y leer los mismos relojes SVG del
 *    cuadro de instrumentos del simulador (ver ../../components/instruments/
 *    Gauges.jsx) — "gauge" indica qué componente renderizar y "props" los
 *    valores concretos de esa tarjeta.
 *  - AUDIO_FLASHCARDS: identificar alertas sonoras reales de cabina (GPWS/
 *    TCAS) sintetizadas en vuelo con la Web Speech API — "phrase" es SIEMPRE
 *    en inglés a propósito, igual que en la aviación real sea cual sea el
 *    idioma de la interfaz.
 *
 * Los textos (question/options/explanation) viven en i18next, namespace
 * "flashcards", claves `instruments.<id>` / `audio.<id>` (5 idiomas). Como
 * en el resto del proyecto, la opción en el índice 0 es siempre la
 * correcta en la estructura; la UI la baraja solo para mostrarla.
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

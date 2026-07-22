#!/usr/bin/env node
/**
 * Validación de i18n y contenido. Falla (exit 1) si:
 *  1. Algún idioma no tiene EXACTAMENTE las mismas claves que el inglés
 *     (referencia) en cualquiera de los 3 namespaces.
 *  2. Alguna pregunta declarada en los módulos de estructura no tiene su
 *     texto (question + options) en el namespace theory, o al revés: hay
 *     preguntas traducidas que ningún módulo declara.
 *  3. El índice `correct` de alguna pregunta queda fuera del rango de
 *     opciones traducidas.
 *
 * Conviven dos formatos de módulo (migración gradual, ver schema.js):
 *  - Antiguo: preguntas en `mod.quiz.questions` (nivel de módulo), sin
 *    `keyTakeaway`/`simTip`/`explanation` obligatorios.
 *  - Nuevo: preguntas en `lesson.quiz.questions` (nivel de lección, 3 c/u),
 *    con `keyTakeaway`/`simTip` por lección y `explanation` por pregunta
 *    obligatorios — un módulo usa el formato nuevo si al menos una de sus
 *    lecciones declara su propio `quiz`.
 *
 * Uso: node scripts/check-i18n.mjs   (o `npm run check:i18n`)
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en", "de", "es", "pt", "ar"];
const NAMESPACES = ["common", "theory", "simulator", "exam", "flashcards"];

const load = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const flatten = (obj, prefix = "") =>
  Object.entries(obj).flatMap(([key, value]) =>
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? flatten(value, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`✗ ${msg}`);
};

// --- 1. Paridad de claves entre idiomas -------------------------------
for (const ns of NAMESPACES) {
  const reference = new Set(flatten(load(`src/i18n/locales/en/${ns}.json`)));
  for (const lang of LANGS.filter((l) => l !== "en")) {
    const keys = new Set(flatten(load(`src/i18n/locales/${lang}/${ns}.json`)));
    for (const k of reference)
      if (!keys.has(k)) fail(`[${lang}/${ns}] falta la clave: ${k}`);
    for (const k of keys)
      if (!reference.has(k)) fail(`[${lang}/${ns}] clave sobrante (no está en en): ${k}`);
  }
}

// --- 2. Estructura de módulos ↔ textos de teoría ----------------------
const moduleFiles = readdirSync(join(root, "src/content/modules")).filter((f) =>
  f.endsWith(".json")
);
const modules = moduleFiles.map((f) => load(`src/content/modules/${f}`));

for (const lang of LANGS) {
  const theory = load(`src/i18n/locales/${lang}/theory.json`);
  for (const mod of modules) {
    const translated = theory.modules?.[mod.id];
    if (!translated) {
      fail(`[${lang}] módulo sin textos: ${mod.id}`);
      continue;
    }
    for (const lesson of mod.lessons ?? []) {
      const l = translated.lessons?.[lesson.id];
      if (!l?.title || !l?.body) fail(`[${lang}] lección incompleta: ${mod.id}.${lesson.id}`);
      if (lesson.quiz) {
        // formato nuevo: keyTakeaway/simTip son obligatorios
        if (!l?.keyTakeaway) fail(`[${lang}] falta keyTakeaway: ${mod.id}.${lesson.id}`);
        if (!l?.simTip) fail(`[${lang}] falta simTip: ${mod.id}.${lesson.id}`);
      }
    }

    // Banco de preguntas: nivel de módulo (formato antiguo) + nivel de
    // lección (formato nuevo, donde `explanation` es obligatoria).
    const moduleLevelQuestions = mod.quiz?.questions ?? [];
    const lessonLevelQuestions = (mod.lessons ?? []).flatMap((l) => l.quiz?.questions ?? []);
    const allQuestions = [...moduleLevelQuestions, ...lessonLevelQuestions];
    const lessonLevelIds = new Set(lessonLevelQuestions.map((q) => q.id));
    const declared = new Set(allQuestions.map((q) => q.id));

    for (const q of allQuestions) {
      const text = translated.quiz?.[q.id];
      if (!text?.question || !Array.isArray(text?.options))
        fail(`[${lang}] pregunta sin texto: ${mod.id}.${q.id}`);
      else if (q.correct < 0 || q.correct >= text.options.length)
        fail(`[${lang}] correct fuera de rango: ${mod.id}.${q.id}`);
      if (lessonLevelIds.has(q.id) && !text?.explanation)
        fail(`[${lang}] falta explanation: ${mod.id}.${q.id}`);
    }
    for (const id of Object.keys(translated.quiz ?? {}))
      if (!declared.has(id))
        fail(`[${lang}] pregunta traducida no declarada en estructura: ${mod.id}.${id}`);
  }
}

// --- 3. Estructura de flashcards ↔ textos de flashcards ---------------
const { INSTRUMENT_FLASHCARDS, AUDIO_FLASHCARDS } = await import(
  join(root, "src/content/flashcards/index.js")
);
const flashcardDecks = { instruments: INSTRUMENT_FLASHCARDS, audio: AUDIO_FLASHCARDS };

for (const lang of LANGS) {
  const flashcards = load(`src/i18n/locales/${lang}/flashcards.json`);
  for (const [deckId, cards] of Object.entries(flashcardDecks)) {
    const declared = new Set(cards.map((c) => c.id));
    for (const card of cards) {
      const text = flashcards[deckId]?.[card.id];
      if (!text?.question || !Array.isArray(text?.options) || !text?.explanation)
        fail(`[${lang}] flashcard sin texto: ${deckId}.${card.id}`);
      else if (card.correct < 0 || card.correct >= text.options.length)
        fail(`[${lang}] correct fuera de rango: flashcards.${deckId}.${card.id}`);
    }
    for (const id of Object.keys(flashcards[deckId] ?? {}))
      if (!declared.has(id))
        fail(`[${lang}] flashcard traducida no declarada en estructura: ${deckId}.${id}`);
  }
}

if (failures) {
  console.error(`\n${failures} problema(s) de i18n/contenido.`);
  process.exit(1);
}
console.log(
  `✓ i18n OK: ${LANGS.length} idiomas × ${NAMESPACES.length} namespaces, ${modules.length} módulos, ` +
    `${INSTRUMENT_FLASHCARDS.length + AUDIO_FLASHCARDS.length} flashcards.`
);

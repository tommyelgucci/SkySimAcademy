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
 * Uso: node scripts/check-i18n.mjs   (o `npm run check:i18n`)
 */
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const LANGS = ["en", "de", "es", "pt", "ar"];
const NAMESPACES = ["common", "theory", "simulator"];

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
      if (!translated.lessons?.[lesson.id]?.title || !translated.lessons?.[lesson.id]?.body)
        fail(`[${lang}] lección incompleta: ${mod.id}.${lesson.id}`);
    }
    const declared = new Set((mod.quiz?.questions ?? []).map((q) => q.id));
    for (const q of mod.quiz?.questions ?? []) {
      const text = translated.quiz?.[q.id];
      if (!text?.question || !Array.isArray(text?.options))
        fail(`[${lang}] pregunta sin texto: ${mod.id}.${q.id}`);
      else if (q.correct < 0 || q.correct >= text.options.length)
        fail(`[${lang}] correct fuera de rango: ${mod.id}.${q.id}`);
    }
    for (const id of Object.keys(translated.quiz ?? {}))
      if (!declared.has(id))
        fail(`[${lang}] pregunta traducida no declarada en estructura: ${mod.id}.${id}`);
  }
}

if (failures) {
  console.error(`\n${failures} problema(s) de i18n/contenido.`);
  process.exit(1);
}
console.log(`✓ i18n OK: ${LANGS.length} idiomas × ${NAMESPACES.length} namespaces, ${modules.length} módulos.`);

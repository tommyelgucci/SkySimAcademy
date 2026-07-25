/**
 * FlashcardsView — modo de repaso independiente del curso de teoría: no usa
 * `storage.js` ni cuenta para aprobar módulos o desbloquear misiones, solo
 * practicar. Dos mazos (ver src/content/flashcards/index.js):
 *
 *  - Instrumentos: reconocer y leer los mismos relojes SVG del simulador
 *    (Gauges.jsx) — "imágenes creadas por nosotros mismos", sin fotos ni
 *    assets externos.
 *  - Alertas de audio: identificar avisos de cabina reales (GPWS/TCAS)
 *    sintetizados en el momento con la Web Speech API del navegador — sin
 *    archivos de audio que alojar. La frase suena siempre en inglés, igual
 *    que en la aviación real, aunque la interfaz esté en otro idioma.
 *
 * Flujo: selector de mazo → tarjetas (con feedback + explicación, igual que
 * el resto de quizzes de la app) → resultado final, sin nota de aprobado/
 * reprobado — es repaso libre, se puede reiniciar cuantas veces se quiera.
 */
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Gauge, RotateCcw, Volume2 } from "lucide-react";
import { INSTRUMENT_FLASHCARDS, AUDIO_FLASHCARDS } from "../../content/flashcards/index.js";
import {
  AirspeedIndicator,
  AttitudeIndicator,
  Altimeter,
  Variometer,
  CompassGauge,
} from "../instruments/Gauges.jsx";

const DECKS = {
  instruments: INSTRUMENT_FLASHCARDS,
  audio: AUDIO_FLASHCARDS,
};

/** Baraja de Fisher-Yates sin mutar el original (igual que Quiz.jsx). */
function shuffled(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/** Habla una frase SIEMPRE en inglés (así suenan de verdad estas alertas),
 *  sin importar el idioma activo de la interfaz. Sin soporte -> no-op. */
function speakEnglish(phrase) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(phrase);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
  return true;
}

/** Renderiza el reloj SVG que le toca a una tarjeta de instrumento. Label
 *  genérica a propósito: revelar el nombre real filtraría la respuesta en
 *  las tarjetas de "¿qué instrumento es este?". */
function InstrumentFace({ card, label }) {
  const { gauge, props } = card;
  if (gauge === "airspeed") return <AirspeedIndicator value={props.value} label={label} />;
  if (gauge === "attitude") return <AttitudeIndicator pitch={props.pitch} bank={props.bank} label={label} />;
  if (gauge === "altimeter") return <Altimeter value={props.value} label={label} locale="en" />;
  if (gauge === "variometer") return <Variometer value={props.value} label={label} />;
  if (gauge === "compass") {
    return (
      <CompassGauge
        heading={props.heading}
        label={label}
        cardinals={{ n: "N", e: "E", s: "S", w: "W" }}
      />
    );
  }
  return null;
}

export default function FlashcardsView({ onExit }) {
  const { t } = useTranslation("flashcards");
  const [deckId, setDeckId] = useState(null); // null = selector de mazo
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0);

  const cards = useMemo(() => {
    if (!deckId) return [];
    return shuffled(DECKS[deckId]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId, round]);

  const optionOrders = useMemo(
    () =>
      cards.map((card) => {
        const count = t(`${deckId}.${card.id}.options`).length;
        return shuffled([...Array(count).keys()]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cards]
  );

  const openDeck = (id) => {
    setDeckId(id);
    setIndex(0);
    setSelected(null);
    setChecked(false);
    setScore(0);
    setFinished(false);
    setRound((r) => r + 1);
  };

  const backToDecks = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setDeckId(null);
  };

  const restart = () => openDeck(deckId);

  if (!deckId) {
    return (
      <section className="flashcards flashcards--decks">
        <h1>{t("title")}</h1>
        <p>{t("intro")}</p>
        <div className="mission-list">
          <button className="mission-card" onClick={() => openDeck("instruments")}>
            <span className="mission-card__icon">
              <Gauge size={20} aria-hidden="true" />
            </span>
            <span className="mission-card__text">
              <span className="mission-card__title">{t("decks.instruments.title")}</span>
              <span className="mission-card__objective">
                {t("decks.instruments.description", { count: INSTRUMENT_FLASHCARDS.length })}
              </span>
            </span>
          </button>
          <button className="mission-card" onClick={() => openDeck("audio")}>
            <span className="mission-card__icon">
              <Volume2 size={20} aria-hidden="true" />
            </span>
            <span className="mission-card__text">
              <span className="mission-card__title">{t("decks.audio.title")}</span>
              <span className="mission-card__objective">
                {t("decks.audio.description", { count: AUDIO_FLASHCARDS.length })}
              </span>
            </span>
          </button>
        </div>
        <div className="simulator__panel-actions">
          <button className="button button--ghost" onClick={onExit}>
            {t("exit")}
          </button>
        </div>
      </section>
    );
  }

  if (finished) {
    return (
      <section className="quiz quiz--results">
        <div className="quiz__result-icon">
          <RotateCcw size={56} aria-hidden="true" />
        </div>
        <p className="quiz__score">{t("score", { score, total: cards.length })}</p>
        <div className="quiz__actions">
          <button className="button button--secondary" onClick={backToDecks}>
            <ArrowLeft size={18} className="rtl-flip" aria-hidden="true" /> {t("backToDecks")}
          </button>
          <button className="button button--primary" onClick={restart}>
            {t("restart")}
          </button>
        </div>
      </section>
    );
  }

  const card = cards[index];
  const keyBase = `${deckId}.${card.id}`;
  const options = t(`${keyBase}.options`);
  const order = optionOrders[index];
  const isLast = index === cards.length - 1;
  const isCorrect = selected === card.correct;

  const check = () => {
    setChecked(true);
    if (selected === card.correct) setScore((s) => s + 1);
  };

  const next = () => {
    if (isLast) {
      setFinished(true);
    } else {
      setIndex((i) => i + 1);
      setSelected(null);
      setChecked(false);
    }
  };

  return (
    <section className="flashcards">
      <button className="flashcards__back" onClick={backToDecks}>
        <ArrowLeft size={16} className="rtl-flip" aria-hidden="true" /> {t("backToDecks")}
      </button>
      <p className="quiz__progress">
        {t("cardProgress", { current: index + 1, total: cards.length })}
      </p>

      {deckId === "instruments" && (
        <div className="flashcards__visual">
          <InstrumentFace card={card} label={t("instrumentAlt")} />
        </div>
      )}
      {deckId === "audio" && (
        <button
          type="button"
          className="flashcards__play"
          onClick={() => speakEnglish(card.phrase)}
        >
          <Volume2 size={22} aria-hidden="true" /> {t("playAudio")}
        </button>
      )}

      <h1 className="quiz__question">{t(`${keyBase}.question`)}</h1>

      <div className="quiz__options">
        {order.map((optionIndex) => {
          let modifier = "";
          if (checked) {
            if (optionIndex === card.correct) modifier = "quiz__option--correct";
            else if (optionIndex === selected) modifier = "quiz__option--wrong";
          } else if (optionIndex === selected) {
            modifier = "quiz__option--selected";
          }
          return (
            <button
              key={optionIndex}
              className={`quiz__option ${modifier}`}
              disabled={checked}
              onClick={() => setSelected(optionIndex)}
            >
              {options[optionIndex]}
            </button>
          );
        })}
      </div>

      {checked && (
        <div className={`lesson-quiz__feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
          <p className="quiz__feedback">{isCorrect ? t("correct") : t("wrong")}</p>
          {deckId === "audio" && (
            <p className="flashcards__phrase">{t("theAlertSaid", { phrase: card.phrase })}</p>
          )}
          <p className="lesson-quiz__explanation">{t(`${keyBase}.explanation`)}</p>
        </div>
      )}

      {checked ? (
        <button className="button button--primary" onClick={next}>
          {isLast ? t("seeResults") : t("next")}
        </button>
      ) : (
        <button
          className="button button--primary"
          disabled={selected === null}
          onClick={check}
        >
          {t("check")}
        </button>
      )}
    </section>
  );
}

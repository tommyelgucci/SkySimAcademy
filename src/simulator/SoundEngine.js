/**
 * SoundEngine — sonido del simulador 100 % sintetizado con Web Audio.
 *
 * Sin archivos de audio: osciladores y ruido generado (cero assets, cero
 * copyright, cero peticiones de red — misma política que la iconografía).
 *
 *  - Motor: oscilador sawtooth + sub-oscilador, filtro paso-bajo; el tono y
 *    el volumen siguen a los gases y a la velocidad.
 *  - Viento: ruido blanco filtrado cuyo volumen crece con la velocidad.
 *  - Pérdida: pitido intermitente de aviso mientras `stalled`.
 *  - Crash: ráfaga de ruido con caída rápida.
 *  - Misión cumplida: pequeño arpegio ascendente.
 *
 * El AudioContext solo puede arrancar tras un gesto del usuario: `start()`
 * se llama desde el click de "iniciar misión". `update()` es seguro de
 * llamar siempre (no hace nada si no hay contexto o está silenciado).
 */
import { FLIGHT } from "./FlightEngine.js";

const MUTE_KEY = "aerolearn.sound.muted";

export class SoundEngine {
  constructor() {
    this.ctx = null;
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  }

  /** Crea el grafo de audio. Llamar desde un gesto del usuario. */
  start() {
    if (this.ctx || typeof window === "undefined" || !window.AudioContext) return;
    const ctx = new AudioContext();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 1;
    this.master.connect(ctx.destination);

    // Motor: dos osciladores ligeramente desafinados → paso-bajo → ganancia
    this.engineOsc = ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 50;
    this.engineSub = ctx.createOscillator();
    this.engineSub.type = "triangle";
    this.engineSub.frequency.value = 25;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = "lowpass";
    this.engineFilter.frequency.value = 420;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineOsc.connect(this.engineFilter);
    this.engineSub.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);

    // Viento: bucle de ruido blanco → paso-banda → ganancia
    const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    this.wind = ctx.createBufferSource();
    this.wind.buffer = noiseBuffer;
    this.wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 700;
    this.windFilter.Q.value = 0.6;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    this.wind.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);

    // Aviso de pérdida: square agudo con ganancia pulsada desde update()
    this.beepOsc = ctx.createOscillator();
    this.beepOsc.type = "square";
    this.beepOsc.frequency.value = 880;
    this.beepGain = ctx.createGain();
    this.beepGain.gain.value = 0;
    this.beepOsc.connect(this.beepGain);
    this.beepGain.connect(this.master);

    this.engineOsc.start();
    this.engineSub.start();
    this.wind.start();
    this.beepOsc.start();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
  }

  /**
   * Sincroniza el audio con el estado de la física. Llamar por frame.
   * @param {import("./FlightEngine.js").FlightEngine} engine
   */
  update(engine) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const speedFactor = Math.min(engine.airspeed / FLIGHT.MAX_SPEED, 1.2);

    // Tono del motor: ralentí grave que sube con gases y velocidad
    const frequency = 46 + engine.throttle * 60 + speedFactor * 22;
    this.engineOsc.frequency.setTargetAtTime(frequency, t, 0.08);
    this.engineSub.frequency.setTargetAtTime(frequency / 2, t, 0.08);
    this.engineGain.gain.setTargetAtTime(
      engine.crashed ? 0 : 0.035 + engine.throttle * 0.11,
      t,
      0.1
    );

    // Viento: crece cuadráticamente con la velocidad
    this.windGain.gain.setTargetAtTime(
      engine.crashed ? 0 : speedFactor * speedFactor * 0.14,
      t,
      0.15
    );

    // Pérdida: pitido intermitente ~4 Hz
    const beeping = engine.stalled && !engine.crashed && Math.floor(t * 8) % 2 === 0;
    this.beepGain.gain.setTargetAtTime(beeping ? 0.09 : 0, t, 0.01);
  }

  /** Ráfaga de ruido al estrellarse. */
  crash() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const burst = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++)
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    burst.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    burst.connect(gain);
    gain.connect(this.master);
    burst.start();
  }

  /** Arpegio ascendente al cumplir una misión. */
  success() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    [523.25, 659.25, 783.99].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = ctx.createGain();
      const start = ctx.currentTime + i * 0.13;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.5);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(start);
      osc.stop(start + 0.55);
    });
  }

  /** Silencia/activa y persiste la preferencia. */
  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
    } catch {
      /* sin almacenamiento: solo afecta a la sesión */
    }
    if (this.ctx)
      this.master.gain.setTargetAtTime(muted ? 0 : 1, this.ctx.currentTime, 0.05);
  }

  /** Congela el audio en pausa (independiente del mute del usuario). */
  pause() {
    this.ctx?.suspend().catch(() => {});
  }

  /** Reanuda el audio tras una pausa. */
  resume() {
    if (this.ctx?.state === "suspended" && !document.hidden) {
      this.ctx.resume().catch(() => {});
    }
  }

  /** Libera el contexto de audio. */
  dispose() {
    this.ctx?.close().catch(() => {});
    this.ctx = null;
  }
}

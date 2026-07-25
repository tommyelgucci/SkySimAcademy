/**
 * MissionTracker — evalúa en cada frame si el objetivo de la misión se ha
 * cumplido. Puro y sin dependencias (ni React ni Three): recibe el
 * FlightEngine y el delta de tiempo, y expone `done`.
 */
export class MissionTracker {
  /** @param {{goal: object|null}|null} mission */
  constructor(mission) {
    this.goal = mission?.goal ?? null;
    this.done = false;
    this.holdTime = 0; // segundos manteniendo el rumbo/altitud/banco objetivo
    this.wasAirborne = false; // para "landing": primero hay que subir
    this.wasStalled = false; // para "stallRecovery": primero hay que entrar en pérdida
    this.engineCut = false; // para "engineOut": el ejercicio ya cortó los gases
  }

  /**
   * @param {import("./FlightEngine.js").FlightEngine} engine
   * @param {number} dt
   */
  update(engine, dt) {
    if (!this.goal || this.done || engine.crashed) return;

    switch (this.goal.type) {
      case "altitude":
        if (engine.altitude >= this.goal.target) this.done = true;
        break;

      case "heading": {
        if (engine.altitude < this.goal.minAltitude) {
          this.holdTime = 0;
          break;
        }
        // Diferencia angular mínima (maneja el cruce 359°→0°)
        const diff = Math.abs(
          ((engine.heading - this.goal.target + 540) % 360) - 180
        );
        if (diff <= this.goal.tolerance) {
          this.holdTime += dt;
          if (this.holdTime >= this.goal.holdSeconds) this.done = true;
        } else {
          this.holdTime = 0;
        }
        break;
      }

      case "landing":
        if (engine.altitude >= this.goal.minAltitude) this.wasAirborne = true;
        if (
          this.wasAirborne &&
          engine.grounded &&
          !engine.crashed &&
          engine.airspeed < 6
        ) {
          this.done = true;
        }
        break;

      case "altitudeHold": {
        if (this.goal.minAltitude != null && engine.altitude < this.goal.minAltitude) {
          this.holdTime = 0;
          break;
        }
        if (Math.abs(engine.altitude - this.goal.target) <= this.goal.band) {
          this.holdTime += dt;
          if (this.holdTime >= this.goal.holdSeconds) this.done = true;
        } else {
          this.holdTime = 0;
        }
        break;
      }

      case "bankTurn": {
        if (engine.altitude < this.goal.minAltitude) {
          this.holdTime = 0;
          break;
        }
        if (Math.abs(engine.bankAngle - this.goal.bankTarget) <= this.goal.tolerance) {
          this.holdTime += dt;
          if (this.holdTime >= this.goal.holdSeconds) this.done = true;
        } else {
          this.holdTime = 0;
        }
        break;
      }

      case "engineOut":
        // Se arma al cruzar la altitud objetivo; SimulatorView lee
        // `tracker.engineCut` y corta los gases del jugador en el loop.
        if (engine.altitude >= this.goal.armAltitude) this.engineCut = true;
        if (
          this.engineCut &&
          engine.grounded &&
          !engine.crashed &&
          engine.airspeed < this.goal.touchdownSpeed
        ) {
          this.done = true;
        }
        break;

      case "stallRecovery":
        if (engine.altitude >= this.goal.minAltitude && engine.stalled) {
          this.wasStalled = true;
        }
        if (
          this.wasStalled &&
          !engine.stalled &&
          !engine.grounded &&
          !engine.crashed &&
          engine.airspeed >= this.goal.recoverSpeed
        ) {
          this.done = true;
        }
        break;
    }
  }
}

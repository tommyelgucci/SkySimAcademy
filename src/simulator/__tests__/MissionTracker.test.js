import { describe, it, expect } from "vitest";
import { MissionTracker } from "../MissionTracker.js";

/** El tracker solo lee propiedades: basta un objeto plano como "motor". */
const engineState = (overrides = {}) => ({
  altitude: 0,
  heading: 0,
  airspeed: 0,
  grounded: true,
  crashed: false,
  bankAngle: 0,
  stalled: false,
  ...overrides,
});

describe("MissionTracker", () => {
  it("vuelo libre (sin goal) nunca se completa solo", () => {
    const tracker = new MissionTracker({ goal: null });
    tracker.update(engineState({ altitude: 500 }), 1);
    expect(tracker.done).toBe(false);
  });

  it("objetivo de altitud se cumple al alcanzarla", () => {
    const tracker = new MissionTracker({ goal: { type: "altitude", target: 100 } });
    tracker.update(engineState({ altitude: 99, grounded: false }), 0.016);
    expect(tracker.done).toBe(false);
    tracker.update(engineState({ altitude: 101, grounded: false }), 0.016);
    expect(tracker.done).toBe(true);
  });

  it("objetivo de rumbo exige mantenerlo el tiempo pedido", () => {
    const goal = { type: "heading", target: 270, tolerance: 12, minAltitude: 40, holdSeconds: 3 };
    const tracker = new MissionTracker({ goal });
    const onCourse = engineState({ altitude: 100, heading: 268, grounded: false });
    tracker.update(onCourse, 2.0);
    expect(tracker.done).toBe(false); // aún no llega a 3 s
    tracker.update(engineState({ altitude: 100, heading: 180, grounded: false }), 0.5);
    tracker.update(onCourse, 2.0);
    expect(tracker.done).toBe(false); // salirse del rumbo reinicia el contador
    tracker.update(onCourse, 1.5);
    expect(tracker.done).toBe(true);
  });

  it("el rumbo maneja el cruce 359°→0°", () => {
    const goal = { type: "heading", target: 0, tolerance: 10, minAltitude: 40, holdSeconds: 1 };
    const tracker = new MissionTracker({ goal });
    tracker.update(engineState({ altitude: 100, heading: 355, grounded: false }), 1.2);
    expect(tracker.done).toBe(true); // 355° está a 5° de 0°
  });

  it("por debajo de la altitud mínima el rumbo no cuenta", () => {
    const goal = { type: "heading", target: 90, tolerance: 12, minAltitude: 40, holdSeconds: 1 };
    const tracker = new MissionTracker({ goal });
    tracker.update(engineState({ altitude: 20, heading: 90, grounded: false }), 5);
    expect(tracker.done).toBe(false);
  });

  it("aterrizaje: exige haber subido antes y tocar tierra despacio", () => {
    const goal = { type: "landing", minAltitude: 60 };
    const tracker = new MissionTracker({ goal });
    // Rodar por la pista sin haber volado no cuenta
    tracker.update(engineState({ grounded: true, airspeed: 3 }), 1);
    expect(tracker.done).toBe(false);
    // Subir, y aterrizar suave
    tracker.update(engineState({ altitude: 80, grounded: false, airspeed: 40 }), 1);
    tracker.update(engineState({ altitude: 0, grounded: true, airspeed: 4 }), 1);
    expect(tracker.done).toBe(true);
  });

  it("un crash no cuenta como misión cumplida", () => {
    const goal = { type: "landing", minAltitude: 60 };
    const tracker = new MissionTracker({ goal });
    tracker.update(engineState({ altitude: 80, grounded: false, airspeed: 40 }), 1);
    tracker.update(engineState({ altitude: 0, grounded: true, airspeed: 4, crashed: true }), 1);
    expect(tracker.done).toBe(false);
  });

  it("altitudeHold exige mantener la banda el tiempo pedido", () => {
    const goal = { type: "altitudeHold", target: 120, band: 15, holdSeconds: 8, minAltitude: 40 };
    const tracker = new MissionTracker({ goal });
    const level = engineState({ altitude: 125, grounded: false });
    tracker.update(level, 5);
    expect(tracker.done).toBe(false); // aún no llega a 8 s
    tracker.update(engineState({ altitude: 140, grounded: false }), 1); // fuera de banda (±15)
    tracker.update(level, 5);
    expect(tracker.done).toBe(false); // salirse de la banda reinicia el contador
    tracker.update(level, 3);
    expect(tracker.done).toBe(true);
  });

  it("altitudeHold no cuenta por debajo de la altitud mínima", () => {
    const goal = { type: "altitudeHold", target: 120, band: 15, holdSeconds: 2, minAltitude: 40 };
    const tracker = new MissionTracker({ goal });
    tracker.update(engineState({ altitude: 20, grounded: false }), 5);
    expect(tracker.done).toBe(false);
  });

  it("bankTurn exige mantener el ángulo de banco objetivo", () => {
    const goal = { type: "bankTurn", bankTarget: 30, tolerance: 8, minAltitude: 50, holdSeconds: 5 };
    const tracker = new MissionTracker({ goal });
    const banked = engineState({ altitude: 100, bankAngle: 28, grounded: false });
    tracker.update(banked, 3);
    expect(tracker.done).toBe(false);
    tracker.update(engineState({ altitude: 100, bankAngle: 0, grounded: false }), 0.5);
    tracker.update(banked, 3);
    expect(tracker.done).toBe(false); // nivelar alas reinicia el contador
    tracker.update(banked, 2);
    expect(tracker.done).toBe(true);
  });

  it("bankTurn en sentido contrario (banco negativo) no cuenta", () => {
    const goal = { type: "bankTurn", bankTarget: 30, tolerance: 8, minAltitude: 50, holdSeconds: 1 };
    const tracker = new MissionTracker({ goal });
    tracker.update(engineState({ altitude: 100, bankAngle: -30, grounded: false }), 5);
    expect(tracker.done).toBe(false);
  });

  it("engineOut se arma al alcanzar la altitud y exige tocar pista despacio", () => {
    const goal = { type: "engineOut", armAltitude: 80, touchdownSpeed: 8 };
    const tracker = new MissionTracker({ goal });
    // Aún no se ha armado: aterrizar ahora no cuenta
    tracker.update(engineState({ altitude: 0, grounded: true, airspeed: 4 }), 1);
    expect(tracker.done).toBe(false);
    expect(tracker.engineCut).toBe(false);
    // Sube hasta armar el fallo de motor
    tracker.update(engineState({ altitude: 85, grounded: false, airspeed: 30 }), 1);
    expect(tracker.engineCut).toBe(true);
    // Toca pista dentro de la velocidad exigida
    tracker.update(engineState({ altitude: 0, grounded: true, airspeed: 6 }), 1);
    expect(tracker.done).toBe(true);
  });

  it("engineOut no se completa si el crash interrumpe la evaluación", () => {
    const goal = { type: "engineOut", armAltitude: 80, touchdownSpeed: 8 };
    const tracker = new MissionTracker({ goal });
    tracker.update(engineState({ altitude: 85, grounded: false, airspeed: 30 }), 1);
    tracker.update(
      engineState({ altitude: 0, grounded: true, airspeed: 6, crashed: true }),
      1
    );
    expect(tracker.done).toBe(false);
  });

  it("stallRecovery exige entrar en pérdida y recuperar velocidad en vuelo", () => {
    const goal = { type: "stallRecovery", minAltitude: 100, recoverSpeed: 22 };
    const tracker = new MissionTracker({ goal });
    // Recuperar sin haber entrado antes en pérdida no cuenta
    tracker.update(engineState({ altitude: 150, stalled: false, airspeed: 30, grounded: false }), 1);
    expect(tracker.done).toBe(false);
    // Entra en pérdida por encima de la altitud mínima
    tracker.update(engineState({ altitude: 150, stalled: true, airspeed: 10, grounded: false }), 1);
    expect(tracker.done).toBe(false);
    // Recupera velocidad suficiente sin tocar tierra
    tracker.update(engineState({ altitude: 120, stalled: false, airspeed: 25, grounded: false }), 1);
    expect(tracker.done).toBe(true);
  });

  it("stallRecovery no cuenta una pérdida provocada por debajo de la altitud mínima", () => {
    const goal = { type: "stallRecovery", minAltitude: 100, recoverSpeed: 22 };
    const tracker = new MissionTracker({ goal });
    tracker.update(engineState({ altitude: 50, stalled: true, airspeed: 10, grounded: false }), 1);
    tracker.update(engineState({ altitude: 60, stalled: false, airspeed: 25, grounded: false }), 1);
    expect(tracker.done).toBe(false);
  });
});

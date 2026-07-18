import { describe, it, expect } from "vitest";
import { MissionTracker } from "../MissionTracker.js";

/** El tracker solo lee propiedades: basta un objeto plano como "motor". */
const engineState = (overrides = {}) => ({
  altitude: 0,
  heading: 0,
  airspeed: 0,
  grounded: true,
  crashed: false,
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
});

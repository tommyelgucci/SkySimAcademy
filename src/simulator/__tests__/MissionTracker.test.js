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
    const goal = {
      type: "bankTurn",
      bankTarget: 30,
      tolerance: 8,
      minAltitude: 50,
      holdSeconds: 5,
    };
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
    const goal = {
      type: "bankTurn",
      bankTarget: 30,
      tolerance: 8,
      minAltitude: 50,
      holdSeconds: 1,
    };
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
    tracker.update(engineState({ altitude: 0, grounded: true, airspeed: 6, crashed: true }), 1);
    expect(tracker.done).toBe(false);
  });

  it("stallRecovery exige entrar en pérdida y recuperar velocidad en vuelo", () => {
    const goal = { type: "stallRecovery", minAltitude: 100, recoverSpeed: 22 };
    const tracker = new MissionTracker({ goal });
    // Recuperar sin haber entrado antes en pérdida no cuenta
    tracker.update(
      engineState({ altitude: 150, stalled: false, airspeed: 30, grounded: false }),
      1,
    );
    expect(tracker.done).toBe(false);
    // Entra en pérdida por encima de la altitud mínima
    tracker.update(engineState({ altitude: 150, stalled: true, airspeed: 10, grounded: false }), 1);
    expect(tracker.done).toBe(false);
    // Recupera velocidad suficiente sin tocar tierra
    tracker.update(
      engineState({ altitude: 120, stalled: false, airspeed: 25, grounded: false }),
      1,
    );
    expect(tracker.done).toBe(true);
  });

  it("stallRecovery no cuenta una pérdida provocada por debajo de la altitud mínima", () => {
    const goal = { type: "stallRecovery", minAltitude: 100, recoverSpeed: 22 };
    const tracker = new MissionTracker({ goal });
    tracker.update(engineState({ altitude: 50, stalled: true, airspeed: 10, grounded: false }), 1);
    tracker.update(engineState({ altitude: 60, stalled: false, airspeed: 25, grounded: false }), 1);
    expect(tracker.done).toBe(false);
  });

  describe("levelTurn", () => {
    const goal = {
      type: "levelTurn",
      bankTarget: -20,
      tolerance: 8,
      altitudeBand: 15,
      minAltitude: 60,
      holdSeconds: 6,
    };

    it("exige mantener el banco Y la altitud de entrada al viraje a la vez", () => {
      const tracker = new MissionTracker({ goal });
      const turning = engineState({ altitude: 100, bankAngle: -22, grounded: false });
      tracker.update(turning, 4);
      expect(tracker.done).toBe(false); // aún no llega a 6 s
      tracker.update(turning, 2);
      expect(tracker.done).toBe(true);
    });

    it("nivelar alas reinicia el contador", () => {
      const tracker = new MissionTracker({ goal });
      const turning = engineState({ altitude: 100, bankAngle: -22, grounded: false });
      tracker.update(turning, 4);
      tracker.update(engineState({ altitude: 100, bankAngle: 0, grounded: false }), 0.5);
      tracker.update(turning, 4);
      expect(tracker.done).toBe(false);
      tracker.update(turning, 2);
      expect(tracker.done).toBe(true);
    });

    it("perder la altitud de entrada durante el viraje reinicia el contador", () => {
      const tracker = new MissionTracker({ goal });
      tracker.update(engineState({ altitude: 100, bankAngle: -22, grounded: false }), 4);
      // Se hunde 20 m sin nivelar alas: sigue virando pero fuera de la banda
      tracker.update(engineState({ altitude: 80, bankAngle: -22, grounded: false }), 3);
      expect(tracker.done).toBe(false);
      // La nueva altitud (80) pasa a ser la referencia: mantenerla ahora sí cuenta
      tracker.update(engineState({ altitude: 80, bankAngle: -22, grounded: false }), 6);
      expect(tracker.done).toBe(true);
    });

    it("por debajo de la altitud mínima no cuenta", () => {
      const tracker = new MissionTracker({ goal });
      tracker.update(engineState({ altitude: 40, bankAngle: -22, grounded: false }), 10);
      expect(tracker.done).toBe(false);
    });

    it("virar al lado contrario del objetivo no cuenta", () => {
      const tracker = new MissionTracker({ goal });
      tracker.update(engineState({ altitude: 100, bankAngle: 22, grounded: false }), 10);
      expect(tracker.done).toBe(false);
    });
  });

  describe("climbAndHold", () => {
    const goal = {
      type: "climbAndHold",
      heading: 0,
      tolerance: 12,
      targetAltitude: 150,
      band: 15,
      holdSeconds: 6,
      minAltitude: 30,
    };

    it("no cuenta mientras se sube, solo al llegar a la altitud objetivo en rumbo", () => {
      const tracker = new MissionTracker({ goal });
      // Subiendo en rumbo, todavía lejos de la altitud objetivo: no acumula
      tracker.update(engineState({ altitude: 80, heading: 0, grounded: false }), 20);
      expect(tracker.done).toBe(false);
      expect(tracker.holdTime).toBe(0);
      // Llega a la altitud objetivo y mantiene rumbo + altitud
      const level = engineState({ altitude: 150, heading: 0, grounded: false });
      tracker.update(level, 4);
      expect(tracker.done).toBe(false); // aún no llega a 6 s
      tracker.update(level, 2);
      expect(tracker.done).toBe(true);
    });

    it("salirse de rumbo ya nivelado reinicia el contador", () => {
      const tracker = new MissionTracker({ goal });
      const level = engineState({ altitude: 150, heading: 0, grounded: false });
      tracker.update(level, 4);
      tracker.update(engineState({ altitude: 150, heading: 90, grounded: false }), 0.5);
      tracker.update(level, 4);
      expect(tracker.done).toBe(false);
      tracker.update(level, 2);
      expect(tracker.done).toBe(true);
    });

    it("el rumbo maneja el cruce 359°→0°", () => {
      const tracker = new MissionTracker({ goal });
      const level = engineState({ altitude: 150, heading: 355, grounded: false });
      tracker.update(level, 6);
      expect(tracker.done).toBe(true); // 355° está a 5° de 0°, dentro de ±12°
    });

    it("por debajo de la altitud mínima no cuenta", () => {
      const tracker = new MissionTracker({ goal });
      tracker.update(engineState({ altitude: 20, heading: 0, grounded: false }), 10);
      expect(tracker.done).toBe(false);
    });

    it("fuera de la banda de altitud objetivo, aunque sea por encima, no cuenta", () => {
      const tracker = new MissionTracker({ goal });
      tracker.update(engineState({ altitude: 200, heading: 0, grounded: false }), 10);
      expect(tracker.done).toBe(false);
    });

    it("subir fuera de rumbo y enderezar recién dentro de la banda no completa la misión", () => {
      const tracker = new MissionTracker({ goal });
      // Sube casi hasta la banda con un rumbo arbitrario, fuera de tolerancia
      tracker.update(engineState({ altitude: 80, heading: 90, grounded: false }), 5);
      // Endereza justo al entrar en la banda y mantiene rumbo + altitud 6 s
      const level = engineState({ altitude: 150, heading: 0, grounded: false });
      tracker.update(level, 6);
      expect(tracker.done).toBe(false);
      tracker.update(level, 6);
      expect(tracker.done).toBe(false);
    });

    it("una desviación después de llegar a la banda no bloquea la misión para siempre", () => {
      const tracker = new MissionTracker({ goal });
      // Sube en rumbo correcto y llega a la banda
      tracker.update(engineState({ altitude: 80, heading: 0, grounded: false }), 5);
      const level = engineState({ altitude: 150, heading: 0, grounded: false });
      tracker.update(level, 3);
      // Se sale de la banda de altitud Y de rumbo (p. ej. una ráfaga), sin
      // bajar de la altitud mínima — esto no es un nuevo intento de ascenso
      tracker.update(engineState({ altitude: 200, heading: 90, grounded: false }), 2);
      expect(tracker.done).toBe(false);
      // Recupera altitud y rumbo y completa el hold sin necesidad de bajar
      // de minAltitude para "reiniciar" el intento
      tracker.update(level, 6);
      expect(tracker.done).toBe(true);
    });

    it("bajar de la altitud mínima y volver a subir en rumbo permite un intento válido", () => {
      const tracker = new MissionTracker({ goal });
      // Primer intento: sube fuera de rumbo, invalida el ascenso
      tracker.update(engineState({ altitude: 80, heading: 90, grounded: false }), 5);
      // Vuelve por debajo de la altitud mínima — reinicia el intento
      tracker.update(engineState({ altitude: 20, heading: 90, grounded: false }), 5);
      // Segundo intento: sube en rumbo correcto todo el ascenso
      tracker.update(engineState({ altitude: 80, heading: 0, grounded: false }), 5);
      const level = engineState({ altitude: 150, heading: 0, grounded: false });
      tracker.update(level, 6);
      expect(tracker.done).toBe(true);
    });
  });

  describe("precisionLanding (informe de FlightEvaluator, no de engineState)", () => {
    const goal = { type: "precisionLanding", maxVerticalSpeed: 3, maxOffCenter: 5 };

    it("se completa con un aterrizaje suave, centrado y alineado", () => {
      const tracker = new MissionTracker({ goal });
      tracker.checkLanding({ verticalSpeed: 2, offCenter: 3, aligned: true });
      expect(tracker.done).toBe(true);
    });

    it("no cuenta si el descenso fue demasiado brusco", () => {
      const tracker = new MissionTracker({ goal });
      tracker.checkLanding({ verticalSpeed: 5, offCenter: 3, aligned: true });
      expect(tracker.done).toBe(false);
    });

    it("no cuenta si tocó lejos del centro de la pista", () => {
      const tracker = new MissionTracker({ goal });
      tracker.checkLanding({ verticalSpeed: 2, offCenter: 8, aligned: true });
      expect(tracker.done).toBe(false);
    });

    it("no cuenta si no quedó alineado con el eje de la pista", () => {
      const tracker = new MissionTracker({ goal });
      tracker.checkLanding({ verticalSpeed: 2, offCenter: 3, aligned: false });
      expect(tracker.done).toBe(false);
    });

    it("sin informe (null) no hace nada", () => {
      const tracker = new MissionTracker({ goal });
      tracker.checkLanding(null);
      expect(tracker.done).toBe(false);
    });

    it("un aterrizaje de otra misión no completa precisionLanding", () => {
      const tracker = new MissionTracker({ goal: { type: "landing", minAltitude: 60 } });
      tracker.checkLanding({ verticalSpeed: 1, offCenter: 1, aligned: true });
      expect(tracker.done).toBe(false);
    });
  });
});

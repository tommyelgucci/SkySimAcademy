import { describe, it, expect } from "vitest";
import { Quaternion, Vector3 } from "three";
import { FlightEvaluator } from "../FlightEvaluator.js";
import { FlightEngine, FLIGHT } from "../FlightEngine.js";

// Pista de prueba: como la del aeródromo desértico (eje norte-sur)
const runway = { x: 0, z: -430, length: 900, width: 20, rotationY: 0 };
const terrain = {
  mapRadius: 3000,
  runways: [runway],
  isSafeZone: (x, z) => Math.abs(x) <= 24 && z <= 60 && z >= -920,
};

/** Motor falso: el evaluador solo lee propiedades. */
function fakeEngine(overrides = {}) {
  return {
    position: { x: 0, y: FLIGHT.GROUND_Y, z: 0 },
    altitude: 0,
    heading: 0,
    airspeed: 0,
    verticalSpeed: 0,
    grounded: true,
    crashed: false,
    ...overrides,
  };
}

describe("FlightEvaluator — senda de planeo", () => {
  it("se activa alineado hacia la pista y marca 'en senda' a la altitud ideal", () => {
    const evaluator = new FlightEvaluator(terrain);
    // A 800 m del umbral sur (z = +length/2 - ... el umbral norte está en
    // z = -880; nos acercamos desde el sur: umbral en z = +20 → avión en z = 820
    const dist = 800;
    const ideal = dist * Math.tan((3 * Math.PI) / 180); // ≈ 42 m
    const engine = fakeEngine({
      position: { x: 0, y: ideal, z: runway.z + runway.length / 2 + dist },
      altitude: ideal,
      heading: 0, // hacia el norte, donde está la pista
      grounded: false,
    });
    evaluator.update(engine);
    expect(evaluator.approach.active).toBe(true);
    expect(evaluator.approach.status).toBe("onCourse");
  });

  it("marca 'alto' y 'bajo' fuera de la senda", () => {
    const evaluator = new FlightEvaluator(terrain);
    const dist = 800;
    const base = {
      heading: 0,
      grounded: false,
    };
    const high = fakeEngine({
      ...base,
      position: { x: 0, y: 120, z: runway.z + runway.length / 2 + dist },
      altitude: 120,
    });
    evaluator.update(high);
    expect(evaluator.approach.status).toBe("high");

    const low = fakeEngine({
      ...base,
      position: { x: 0, y: 10, z: runway.z + runway.length / 2 + dist },
      altitude: 10,
    });
    evaluator.update(low);
    expect(evaluator.approach.status).toBe("low");
  });

  it("no se activa alejándote de la pista ni muy desplazado del eje", () => {
    const evaluator = new FlightEvaluator(terrain);
    const dist = 800;
    const leaving = fakeEngine({
      position: { x: 0, y: 42, z: runway.z + runway.length / 2 + dist },
      altitude: 42,
      heading: 180, // morro hacia el sur: te alejas
      grounded: false,
    });
    evaluator.update(leaving);
    expect(evaluator.approach.active).toBe(false);

    const offset = fakeEngine({
      position: { x: 120, y: 42, z: runway.z + runway.length / 2 + dist },
      altitude: 42,
      heading: 0,
      grounded: false,
    });
    evaluator.update(offset);
    expect(evaluator.approach.active).toBe(false);
  });
});

describe("FlightEvaluator — nota de aterrizaje", () => {
  /** Simula toque + rodadura con métricas dadas y devuelve el informe. */
  function land(evaluator, { verticalSpeed, x = 0, heading = 0 }) {
    evaluator.update(
      fakeEngine({
        position: { x, y: 30, z: -430 },
        altitude: 30,
        heading,
        airspeed: 25,
        grounded: false,
      })
    );
    evaluator.update(
      fakeEngine({
        position: { x, y: FLIGHT.GROUND_Y, z: -430 },
        heading,
        airspeed: 22,
        verticalSpeed: -verticalSpeed,
        grounded: true,
      })
    );
    evaluator.update(
      fakeEngine({ position: { x, y: FLIGHT.GROUND_Y, z: -430 }, heading, airspeed: 3 })
    );
    return evaluator.consumeLanding();
  }

  it("5 estrellas: toque suave, centrado y alineado", () => {
    const landing = land(new FlightEvaluator(terrain), { verticalSpeed: 1.4 });
    expect(landing.stars).toBe(5);
    expect(landing.centered).toBe(true);
    expect(landing.aligned).toBe(true);
  });

  it("3 estrellas: toque firme pero seguro", () => {
    const landing = land(new FlightEvaluator(terrain), { verticalSpeed: 5 });
    expect(landing.stars).toBe(3);
  });

  it("1 estrella: casi al límite de rotura", () => {
    const landing = land(new FlightEvaluator(terrain), { verticalSpeed: 8.4 });
    expect(landing.stars).toBe(1);
  });

  it("penaliza el descentrado aunque el toque sea suave", () => {
    const landing = land(new FlightEvaluator(terrain), { verticalSpeed: 1.4, x: 9 });
    expect(landing.stars).toBeLessThan(5);
  });

  it("el informe se consume una sola vez", () => {
    const evaluator = new FlightEvaluator(terrain);
    land(evaluator, { verticalSpeed: 2 });
    expect(evaluator.consumeLanding()).toBe(null);
  });

  it("un touch & go no genera informe", () => {
    const evaluator = new FlightEvaluator(terrain);
    evaluator.update(fakeEngine({ position: { x: 0, y: 30, z: -430 }, altitude: 30, grounded: false, airspeed: 25 }));
    evaluator.update(fakeEngine({ position: { x: 0, y: FLIGHT.GROUND_Y, z: -430 }, airspeed: 24, verticalSpeed: -1, grounded: true }));
    // vuelve a despegar sin frenar
    evaluator.update(fakeEngine({ position: { x: 0, y: 8, z: -500 }, altitude: 8, grounded: false, airspeed: 28 }));
    evaluator.update(fakeEngine({ position: { x: 0, y: 12, z: -520 }, altitude: 12, grounded: false, airspeed: 30 }));
    expect(evaluator.consumeLanding()).toBe(null);
  });
});

describe("FlightEvaluator — integración con el motor real", () => {
  it("una aproximación volada con el motor sigue la senda y puntúa el toque", () => {
    const engine = new FlightEngine();
    engine.setTerrain(terrain);
    const evaluator = new FlightEvaluator(terrain);

    // Corto final estabilizado: 700 m del umbral, sobre la senda, morro al
    // norte con actitud fija de −3° (la senda de planeo)
    const dist = 700;
    engine.position.set(0, dist * Math.tan((3 * Math.PI) / 180) + FLIGHT.GROUND_Y, runway.z + runway.length / 2 + dist);
    engine.quaternion.copy(
      new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), (-3 * Math.PI) / 180)
    );
    engine.airspeed = 20;
    engine.throttle = 0.3;
    engine.update(1 / 60);

    // Descenso mantenido con mandos neutros: la actitud de −3° se conserva
    engine.setInput({ pitch: 0, roll: 0, yaw: 0, throttle: 0, throttleTarget: 0.3 });
    let sawOnCourse = false;
    for (let i = 0; i < 60 * 60 && !engine.grounded; i++) {
      engine.update(1 / 60);
      evaluator.update(engine);
      if (evaluator.approach.active && evaluator.approach.status === "onCourse")
        sawOnCourse = true;
    }
    // Rodadura hasta frenar
    engine.setInput({ pitch: 0, roll: 0, yaw: 0, throttle: 0, throttleTarget: 0 });
    for (let i = 0; i < 60 * 20; i++) {
      engine.update(1 / 60);
      evaluator.update(engine);
    }

    expect(engine.crashed).toBe(false);
    expect(sawOnCourse).toBe(true);
    const landing = evaluator.consumeLanding();
    expect(landing).not.toBe(null);
    expect(landing.stars).toBeGreaterThanOrEqual(3);
  });
});

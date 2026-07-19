import { describe, it, expect } from "vitest";
import { FlightEngine, FLIGHT } from "../FlightEngine.js";

/** Simula `seconds` de vuelo a 60 fps con una entrada fija. */
function run(engine, seconds, input = {}) {
  engine.setInput({ pitch: 0, roll: 0, yaw: 0, throttle: 0, throttleTarget: null, ...input });
  const steps = Math.round(seconds * 60);
  for (let i = 0; i < steps; i++) engine.update(1 / 60);
}

/** Coloca el avión en vuelo recto y nivelado a una altitud dada. */
function airborne(engine, { altitude = 200, airspeed = 40 } = {}) {
  engine.position.y = FLIGHT.GROUND_Y + altitude;
  engine.airspeed = airspeed;
  engine.throttle = airspeed / FLIGHT.MAX_SPEED;
  engine.update(1 / 60);
}

describe("FlightEngine — suelo y despegue", () => {
  it("arranca parado en la pista", () => {
    const engine = new FlightEngine();
    expect(engine.grounded).toBe(true);
    expect(engine.airspeed).toBe(0);
    expect(engine.altitude).toBe(0);
  });

  it("acelera con gases pero no despega sin tirar del mando", () => {
    const engine = new FlightEngine();
    run(engine, 8, { throttle: 1 });
    expect(engine.airspeed).toBeGreaterThan(FLIGHT.ROTATE_SPEED);
    expect(engine.grounded).toBe(true);
    expect(engine.altitude).toBe(0);
  });

  it("despega con gases a fondo y una tirada suave del mando", () => {
    const engine = new FlightEngine();
    run(engine, 4, { throttle: 1 }); // carrera de despegue
    run(engine, 2, { throttle: 1, pitch: 0.5 }); // rotar
    run(engine, 1, { throttle: 1 }); // ascenso
    expect(engine.grounded).toBe(false);
    expect(engine.altitude).toBeGreaterThan(5);
    expect(engine.crashed).toBe(false);
  });

  it("acepta gases absolutos (throttleTarget, mandos táctiles)", () => {
    const engine = new FlightEngine();
    run(engine, 3, { throttleTarget: 0.8 });
    expect(engine.throttle).toBeCloseTo(0.8, 1);
    run(engine, 3, { throttleTarget: 0 });
    expect(engine.throttle).toBeLessThan(0.1);
  });
});

describe("FlightEngine — vuelo", () => {
  it("entra en pérdida al quedarse sin velocidad, se hunde y se recupera al picar", () => {
    const engine = new FlightEngine();
    airborne(engine, { altitude: 400, airspeed: 30 });
    engine.setInput({ pitch: 0, roll: 0, yaw: 0, throttle: 0, throttleTarget: 0 });
    let stalledAt = null;
    for (let i = 0; i < 12 * 60; i++) {
      engine.update(1 / 60);
      if (engine.stalled && stalledAt === null) {
        stalledAt = { airspeed: engine.airspeed, verticalSpeed: engine.verticalSpeed };
      }
    }
    // La pérdida ocurrió, con el avión hundiéndose y por debajo de la
    // velocidad crítica…
    expect(stalledAt).not.toBeNull();
    expect(stalledAt.airspeed).toBeLessThan(FLIGHT.STALL_SPEED);
    // …y el morro cae solo: la picada regenera velocidad y el avión sale
    // de la pérdida sin intervención — justo lo que enseña la lección.
    expect(engine.stalled).toBe(false);
    expect(engine.airspeed).toBeGreaterThan(FLIGHT.STALL_SPEED);
    expect(engine.crashed).toBe(false);
  });

  it("el viraje coordinado cambia el rumbo al alabear", () => {
    const engine = new FlightEngine();
    airborne(engine, { altitude: 300, airspeed: 45 });
    const initialHeading = engine.heading;
    run(engine, 0.6, { roll: 1, throttle: 1 }); // inclinar a la derecha
    run(engine, 2.5, { throttle: 1 }); // mantener; la guiñada inducida vira
    const delta = Math.abs(((engine.heading - initialHeading + 540) % 360) - 180);
    expect(delta).toBeGreaterThan(5);
    expect(engine.crashed).toBe(false);
  });

  it("nivelar las alas detiene el viraje (tendencia auto-nivelante)", () => {
    const engine = new FlightEngine();
    airborne(engine, { altitude: 300, airspeed: 45 });
    run(engine, 0.5, { roll: 1, throttle: 1 });
    run(engine, 4, { throttle: 1 }); // sin orden de alabeo: debe auto-nivelar
    const headingA = engine.heading;
    run(engine, 1, { throttle: 1 });
    const headingB = engine.heading;
    const residualTurn = Math.abs(((headingB - headingA + 540) % 360) - 180);
    expect(residualTurn).toBeLessThan(3); // ya casi no vira
  });

  it("registra estadísticas de la sesión", () => {
    const engine = new FlightEngine();
    run(engine, 8, { throttle: 1, pitch: 1 });
    expect(engine.maxAltitude).toBeGreaterThan(0);
    expect(engine.distance).toBeGreaterThan(0);
  });
});

describe("FlightEngine — terreno (pistas y límite del mapa)", () => {
  // Pista de prueba: franja de 40 m de ancho a lo largo de −Z/+Z
  const terrain = {
    mapRadius: 500,
    isSafeZone: (x, z) => Math.abs(x) <= 20 && z >= -300 && z <= 300,
  };

  /** Descenso suave: morro ligeramente abajo, potencia mantenida. */
  function gentleDescent(engine) {
    run(engine, 0.15, { pitch: -0.3, throttleTarget: 0.3 });
    run(engine, 8, { throttleTarget: 0.3 });
  }

  it("sin terreno registrado, aterrizar en cualquier sitio sigue valiendo", () => {
    const engine = new FlightEngine();
    airborne(engine, { altitude: 4, airspeed: 18 });
    engine.position.x = 200; // "fuera de pista", pero no hay terreno
    gentleDescent(engine);
    expect(engine.grounded).toBe(true);
    expect(engine.crashed).toBe(false);
  });

  it("con terreno, aterrizar dentro de la pista es válido", () => {
    const engine = new FlightEngine();
    engine.setTerrain(terrain);
    airborne(engine, { altitude: 4, airspeed: 18 });
    gentleDescent(engine);
    expect(engine.grounded).toBe(true);
    expect(engine.crashed).toBe(false);
  });

  it("con terreno, tocar fuera de la pista es accidente 'water'", () => {
    const engine = new FlightEngine();
    engine.setTerrain(terrain);
    airborne(engine, { altitude: 4, airspeed: 18 });
    engine.position.x = 200; // sobre el agua
    gentleDescent(engine);
    expect(engine.crashed).toBe(true);
    expect(engine.crashReason).toBe("water");
  });

  it("salir del radio del mapa es accidente 'bounds' a cualquier altitud", () => {
    const engine = new FlightEngine();
    engine.setTerrain(terrain);
    airborne(engine, { altitude: 200, airspeed: 40 });
    engine.position.x = 600; // más allá de mapRadius = 500
    engine.update(1 / 60);
    expect(engine.crashed).toBe(true);
    expect(engine.crashReason).toBe("bounds");
  });

  it("reset() conserva el terreno (reintento en el mismo escenario)", () => {
    const engine = new FlightEngine();
    engine.setTerrain(terrain);
    engine.reset();
    expect(engine.terrain).toBe(terrain);
    expect(engine.crashReason).toBe(null);
  });
});

describe("FlightEngine — impactos", () => {
  it("picar contra el suelo rompe el avión", () => {
    const engine = new FlightEngine();
    airborne(engine, { altitude: 120, airspeed: 50 });
    run(engine, 6, { pitch: -1, throttle: 1 }); // morro abajo sostenido
    expect(engine.crashed).toBe(true);
  });

  it("tras el crash la física se congela", () => {
    const engine = new FlightEngine();
    airborne(engine, { altitude: 120, airspeed: 50 });
    run(engine, 6, { pitch: -1, throttle: 1 });
    const position = engine.position.clone();
    run(engine, 2, { throttle: 1, pitch: 1 });
    expect(engine.position.equals(position)).toBe(true);
  });
});

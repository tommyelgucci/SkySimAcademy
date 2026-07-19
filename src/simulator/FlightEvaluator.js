/**
 * FlightEvaluator — evaluación de aproximación y aterrizaje (estilo ILS).
 *
 * Puro y sin dependencias, como MissionTracker: lee el FlightEngine por
 * frame y expone dos cosas:
 *
 *  - `approach`: estado de la senda de planeo de 3° hacia la pista más
 *    cercana ("onCourse" | "high" | "low") mientras te acercas alineado.
 *  - `consumeLanding()`: al completar un aterrizaje (tocar pista y frenar),
 *    entrega UNA vez el informe con nota de 1 a 5 estrellas.
 *
 * Umbrales calibrados a NUESTRA física (CRASH_SINK = −9 m/s), no a un
 * avión real: 5★ exige tocar con menos de 2 m/s de descenso, centrado y
 * alineado; desde ahí las bandas se relajan hasta el aterrizaje "duro"
 * que roza el límite de rotura.
 */
const GLIDESLOPE_TAN = Math.tan((3 * Math.PI) / 180); // senda de 3°
const APPROACH_MAX_DIST = 1500; // m hasta el umbral para activar la senda
const APPROACH_MIN_DIST = 25;
const APPROACH_MAX_LATERAL = 60; // m fuera del eje para considerarte "en aproximación"
const ROLLOUT_SPEED = 5; // m/s: por debajo, el aterrizaje se da por completado

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** Coordenadas del avión en el sistema local de una pista (x lateral, z longitudinal). */
function toRunwayLocal(runway, x, z) {
  const cos = Math.cos(runway.rotationY);
  const sin = Math.sin(runway.rotationY);
  const dx = x - runway.x;
  const dz = z - runway.z;
  return { localX: dx * cos - dz * sin, localZ: dx * sin + dz * cos };
}

export class FlightEvaluator {
  /** @param {{runways?: Array}|null} terrain Descriptor de SceneManager.getTerrain(). */
  constructor(terrain) {
    this.runways = terrain?.runways ?? [];
    /** @type {{active: boolean, status: "onCourse"|"high"|"low", deviation: number}} */
    this.approach = { active: false, status: "onCourse", deviation: 0 };
    this._touchdown = null; // métricas capturadas en el instante del toque
    this._landing = null; // informe final, pendiente de consumir
    this._wasGrounded = true;
  }

  /**
   * @param {import("./FlightEngine.js").FlightEngine} engine
   */
  update(engine) {
    if (this.runways.length === 0 || engine.crashed) {
      this.approach.active = false;
      return;
    }

    // --- Senda de planeo (en el aire, acercándote a una cabecera) --------
    if (!engine.grounded) {
      this.approach = this.#evaluateGlideslope(engine);
    } else {
      this.approach = { active: false, status: "onCourse", deviation: 0 };
    }

    // --- Toque: capturar métricas en el instante aire → suelo ------------
    if (this._wasGrounded === false && engine.grounded) {
      const runway = this.#nearestRunway(engine.position.x, engine.position.z);
      const { localX } = toRunwayLocal(runway, engine.position.x, engine.position.z);
      // Alineación: diferencia entre el rumbo y el eje de pista (ambos sentidos)
      const runwayHeading = ((-runway.rotationY * 180) / Math.PI + 360) % 360;
      const diff = Math.abs(((engine.heading - runwayHeading + 540) % 360) - 180);
      const headingOff = Math.min(diff, 180 - diff);
      this._touchdown = {
        verticalSpeed: Math.abs(engine.verticalSpeed),
        offCenter: Math.abs(localX),
        headingOff,
      };
    }
    // Despegar de nuevo antes de frenar descarta el toque (touch & go)
    if (this._wasGrounded === true && !engine.grounded) this._touchdown = null;

    // --- Fin de rodadura: emitir el informe ------------------------------
    if (this._touchdown && engine.grounded && engine.airspeed < ROLLOUT_SPEED) {
      this._landing = this.#grade(this._touchdown);
      this._touchdown = null;
    }

    this._wasGrounded = engine.grounded;
  }

  /** Devuelve el informe de aterrizaje una sola vez (o null). */
  consumeLanding() {
    const landing = this._landing;
    this._landing = null;
    return landing;
  }

  #nearestRunway(x, z) {
    let best = this.runways[0];
    let bestDist = Infinity;
    for (const runway of this.runways) {
      const d = Math.hypot(x - runway.x, z - runway.z);
      if (d < bestDist) {
        bestDist = d;
        best = runway;
      }
    }
    return best;
  }

  #evaluateGlideslope(engine) {
    const inactive = { active: false, status: "onCourse", deviation: 0 };
    const runway = this.#nearestRunway(engine.position.x, engine.position.z);
    const { localX, localZ } = toRunwayLocal(
      runway,
      engine.position.x,
      engine.position.z
    );

    // Distancia hasta la cabecera más próxima a lo largo del eje
    const distToThreshold = Math.abs(localZ) - runway.length / 2;
    if (
      distToThreshold < APPROACH_MIN_DIST ||
      distToThreshold > APPROACH_MAX_DIST ||
      Math.abs(localX) > APPROACH_MAX_LATERAL
    ) {
      return inactive;
    }

    // Solo cuenta como aproximación si el morro apunta hacia la pista
    const towardRunway = Math.sign(-localZ); // sentido hacia el centro
    const headingToRunway =
      ((Math.atan2(
        runway.x - engine.position.x,
        -(runway.z - engine.position.z)
      ) *
        180) /
        Math.PI +
        360) %
      360;
    const headingDiff = Math.abs(
      ((engine.heading - headingToRunway + 540) % 360) - 180
    );
    if (headingDiff > 60 || towardRunway === 0) return inactive;

    // Desviación respecto a la senda de 3°: + = alto, − = bajo
    const ideal = distToThreshold * GLIDESLOPE_TAN;
    const deviation = engine.altitude - ideal;
    const tolerance = Math.max(8, distToThreshold * 0.022);
    const status =
      deviation > tolerance ? "high" : deviation < -tolerance ? "low" : "onCourse";
    return { active: true, status, deviation: Math.round(deviation) };
  }

  /**
   * Nota de 1 a 5 estrellas a partir de las métricas del toque.
   * @param {{verticalSpeed:number, offCenter:number, headingOff:number}} touch
   */
  #grade(touch) {
    const { verticalSpeed, offCenter, headingOff } = touch;
    const centered = offCenter <= 4;
    const aligned = headingOff <= 12;
    let stars;
    if (verticalSpeed <= 2 && centered && aligned) stars = 5;
    else if (verticalSpeed <= 3.5 && offCenter <= 7 && headingOff <= 20) stars = 4;
    else if (verticalSpeed <= 5.5) stars = 3;
    else if (verticalSpeed <= 7.5) stars = 2;
    else stars = 1; // tocó sin romperse, pero rozando el límite
    return {
      stars: clamp(stars, 1, 5),
      verticalSpeed: Math.round(verticalSpeed * 10) / 10,
      offCenter: Math.round(offCenter),
      centered,
      aligned,
    };
  }
}

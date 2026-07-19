/**
 * FlightEngine — física de vuelo arcade simplificada.
 *
 * Sin dependencia de React ni del renderer: solo matemáticas (Vector3 y
 * Quaternion de three). Esto permite testearlo aislado y reutilizarlo con
 * cualquier capa de render.
 *
 * Modelo (intencionadamente simple, no realista):
 *  - La velocidad persigue `throttle * MAX_SPEED`; subir resta velocidad,
 *    picar la regala (intercambio energía potencial/cinética).
 *  - Los mandos pierden autoridad a baja velocidad (factor de efectividad).
 *  - Por debajo de STALL_SPEED el ala "entra en pérdida": el avión se hunde
 *    y baja el morro — exactamente lo que enseña el módulo de teoría.
 *  - Alabear induce guiñada coordinada (el avión vira al inclinarse).
 *
 * Terreno (opcional, vía setTerrain):
 *  - Sin terreno registrado, el comportamiento es el de siempre: cualquier
 *    toque suave y nivelado en el suelo (y = GROUND_Y) es un aterrizaje
 *    válido, sin importar dónde.
 *  - Con terreno registrado (SceneManager.getTerrain()), tocar el suelo
 *    fuera de una zona segura (agua, terreno irregular) también es un
 *    accidente, y alejarse más de `mapRadius` del centro —a cualquier
 *    altitud— se considera vuelo perdido sobre mar abierto.
 */
import { Vector3, Quaternion } from "three";

export const FLIGHT = {
  MAX_SPEED: 60, // m/s a máxima potencia
  STALL_SPEED: 14, // m/s — por debajo, pérdida
  ROTATE_SPEED: 20, // m/s — velocidad mínima para despegar
  GROUND_Y: 0.6, // altura del "tren de aterrizaje"
  THROTTLE_RATE: 0.5, // variación de gases por segundo
  PITCH_RATE: 0.85, // rad/s con mando a fondo
  ROLL_RATE: 1.5,
  YAW_RATE: 0.6,
  TURN_ASSIST: 0.7, // guiñada inducida por alabeo
  CLIMB_BLEED: 9, // pérdida de velocidad al subir (m/s² con morro 90° arriba)
  CRASH_SINK: -9, // velocidad vertical de impacto que rompe el avión
  CRASH_BANK: 0.42, // inclinación lateral máxima al tocar suelo (~25°)
};

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

// Ejes locales reutilizados en cada frame (evita crear objetos en el loop)
const AXIS_X = new Vector3(1, 0, 0);
const AXIS_Y = new Vector3(0, 1, 0);
const AXIS_FWD = new Vector3(0, 0, -1);
const _q = new Quaternion();
const _forward = new Vector3();
const _right = new Vector3();
const _velocity = new Vector3();

export class FlightEngine {
  constructor() {
    this.position = new Vector3();
    this.quaternion = new Quaternion();
    /**
     * Entradas normalizadas: pitch/roll/yaw ∈ [-1,1].
     * Gases: `throttle` ∈ {-1,0,1} (dirección de cambio, teclado) o
     * `throttleTarget` ∈ [0,1] (valor absoluto, slider táctil). Si
     * throttleTarget no es null, tiene prioridad.
     */
    this.input = { pitch: 0, roll: 0, yaw: 0, throttle: 0, throttleTarget: null };
    /**
     * Terreno del escenario actual (ver setTerrain). Vive fuera de reset()
     * a propósito: un reintento en el mismo vuelo no debe perder el mapa.
     * @type {{mapRadius?: number, isSafeZone?: (x:number,z:number)=>boolean}|null}
     */
    this.terrain = null;
    this.reset();
  }

  reset() {
    this.position.set(0, FLIGHT.GROUND_Y, 0);
    this.quaternion.identity();
    this.input.pitch = this.input.roll = this.input.yaw = this.input.throttle = 0;
    this.input.throttleTarget = null;
    this.airspeed = 0;
    this.throttle = 0;
    this.verticalSpeed = 0;
    this.grounded = true;
    this.stalled = false;
    this.crashed = false;
    // "water" | "bounds" | "bank" | "impact" | null — motivo del accidente,
    // útil para mostrar el mensaje correcto en la UI.
    this.crashReason = null;
    // Estadísticas de la sesión
    this.maxAltitude = 0;
    this.distance = 0; // metros recorridos en horizontal
  }

  /**
   * Registra el terreno del escenario actual. Se lo pasa SceneManager tras
   * elegir uno al azar: `flightEngine.setTerrain(sceneManager.getTerrain())`.
   * Pasar `null` (o no llamarlo nunca) restaura el comportamiento anterior.
   * @param {{mapRadius?: number, isSafeZone?: (x:number,z:number)=>boolean}|null} terrain
   */
  setTerrain(terrain) {
    this.terrain = terrain ?? null;
  }

  /** @param {Partial<{pitch:number, roll:number, yaw:number, throttle:number}>} partial */
  setInput(partial) {
    Object.assign(this.input, partial);
  }

  /**
   * Avanza la simulación.
   * @param {number} dt Delta de tiempo en segundos (se acota para estabilidad).
   */
  update(dt) {
    if (this.crashed) return;
    dt = clamp(dt, 0, 0.05);

    // --- Potencia y velocidad -------------------------------------------
    if (this.input.throttleTarget != null) {
      // Táctil: la palanca persigue el valor absoluto del slider
      const target = clamp(this.input.throttleTarget, 0, 1);
      const maxStep = FLIGHT.THROTTLE_RATE * 2 * dt;
      this.throttle += clamp(target - this.throttle, -maxStep, maxStep);
    } else {
      this.throttle = clamp(
        this.throttle + this.input.throttle * FLIGHT.THROTTLE_RATE * dt,
        0,
        1
      );
    }
    const targetSpeed = this.throttle * FLIGHT.MAX_SPEED;
    this.airspeed += (targetSpeed - this.airspeed) * 0.45 * dt;

    _forward.copy(AXIS_FWD).applyQuaternion(this.quaternion);
    _right.copy(AXIS_X).applyQuaternion(this.quaternion);

    // Subir cuesta velocidad; descender la devuelve
    if (!this.grounded) this.airspeed -= _forward.y * FLIGHT.CLIMB_BLEED * dt;
    this.airspeed = clamp(this.airspeed, 0, FLIGHT.MAX_SPEED * 1.25);

    // --- Actitud ---------------------------------------------------------
    // La autoridad de los mandos crece con la velocidad del aire
    const authority = clamp(this.airspeed / FLIGHT.ROTATE_SPEED, 0, 1);

    if (this.grounded) {
      // En pista: solo dirección con la guiñada; se despega con velocidad + tirar
      this.#rotateLocal(AXIS_Y, this.input.yaw * FLIGHT.YAW_RATE * 0.8 * dt);
      if (this.airspeed > FLIGHT.ROTATE_SPEED && this.input.pitch > 0.1) {
        this.#rotateLocal(AXIS_X, this.input.pitch * FLIGHT.PITCH_RATE * 0.5 * dt);
      }
    } else {
      this.#rotateLocal(AXIS_X, this.input.pitch * FLIGHT.PITCH_RATE * authority * dt);
      this.#rotateLocal(AXIS_FWD, this.input.roll * FLIGHT.ROLL_RATE * authority * dt);
      this.#rotateLocal(AXIS_Y, this.input.yaw * FLIGHT.YAW_RATE * authority * dt);
      // Viraje coordinado: el alabeo induce guiñada hacia el lado bajo
      this.#rotateLocal(AXIS_Y, _right.y * FLIGHT.TURN_ASSIST * authority * dt);
      // Tendencia suave a nivelar alas si no hay orden de alabeo (vuelo dócil).
      // Ángulo positivo sobre el eje longitudinal = alabeo a la derecha, y
      // _right.y > 0 significa ala derecha arriba (inclinado a la izquierda).
      if (Math.abs(this.input.roll) < 0.05) {
        this.#rotateLocal(AXIS_FWD, _right.y * 0.8 * dt);
      }
    }

    // --- Pérdida (stall) -------------------------------------------------
    this.stalled = !this.grounded && this.airspeed < FLIGHT.STALL_SPEED;
    let sink = 0;
    if (this.stalled) {
      sink = -(FLIGHT.STALL_SPEED - this.airspeed) * 0.9;
      this.#rotateLocal(AXIS_X, -0.5 * dt); // el morro cae solo
    }

    // --- Integración -----------------------------------------------------
    _forward.copy(AXIS_FWD).applyQuaternion(this.quaternion);
    _velocity.copy(_forward).multiplyScalar(this.airspeed);
    _velocity.y += sink;
    this.verticalSpeed = _velocity.y;
    this.position.addScaledVector(_velocity, dt);
    this.distance +=
      Math.hypot(_velocity.x, _velocity.z) * dt * (this.grounded ? 0 : 1);

    // --- Límite del mapa ---------------------------------------------------
    // Todos los escenarios están rodeados de océano abierto: alejarse
    // demasiado del centro, a cualquier altitud, es vuelo perdido sobre
    // mar abierto. Sin terreno registrado esto no hace nada (mapRadius
    // no existe), igual que antes.
    if (this.terrain?.mapRadius != null && !this.crashed) {
      const distFromCenter = Math.hypot(this.position.x, this.position.z);
      if (distFromCenter > this.terrain.mapRadius) {
        this.crashed = true;
        this.crashReason = "bounds";
      }
    }

    // --- Suelo -----------------------------------------------------------
    if (this.position.y <= FLIGHT.GROUND_Y) {
      const hardImpact = this.verticalSpeed < FLIGHT.CRASH_SINK;
      const tooBanked = Math.abs(_right.y) > FLIGHT.CRASH_BANK;
      // Sin terreno registrado, cualquier sitio vale (comportamiento de
      // siempre). Con terreno, solo se puede tocar tierra dentro de una
      // pista: fuera de ahí es agua (o terreno irregular), y eso también
      // es un accidente — así no se puede "aterrizar" flotando en el mar.
      const offSafeZone = this.terrain?.isSafeZone
        ? !this.terrain.isSafeZone(this.position.x, this.position.z)
        : false;
      if (!this.grounded && !this.crashed && (hardImpact || tooBanked || offSafeZone)) {
        this.crashed = true;
        this.crashReason = offSafeZone ? "water" : tooBanked ? "bank" : "impact";
      }
      this.position.y = FLIGHT.GROUND_Y;
      this.grounded = true;
      if (!this.crashed) this.#levelOnGround(dt);
    } else {
      this.grounded = false;
    }

    this.maxAltitude = Math.max(this.maxAltitude, this.altitude);
  }

  /** Altitud sobre el terreno, en metros. */
  get altitude() {
    return Math.max(0, this.position.y - FLIGHT.GROUND_Y);
  }

  /** Rumbo aeronáutico en grados (0 = norte = −Z). */
  get heading() {
    _forward.copy(AXIS_FWD).applyQuaternion(this.quaternion);
    const deg = (Math.atan2(_forward.x, -_forward.z) * 180) / Math.PI;
    return (deg + 360) % 360;
  }

  /** Cabeceo en grados (+ = morro arriba). Alimenta el horizonte artificial. */
  get pitchAngle() {
    _forward.copy(AXIS_FWD).applyQuaternion(this.quaternion);
    return (Math.asin(clamp(_forward.y, -1, 1)) * 180) / Math.PI;
  }

  /** Alabeo en grados (+ = inclinado a la derecha). */
  get bankAngle() {
    _right.copy(AXIS_X).applyQuaternion(this.quaternion);
    return (-Math.asin(clamp(_right.y, -1, 1)) * 180) / Math.PI;
  }

  /** Rotación alrededor de un eje LOCAL del avión. */
  #rotateLocal(axis, angle) {
    if (angle === 0) return;
    _q.setFromAxisAngle(axis, angle);
    this.quaternion.multiply(_q).normalize();
  }

  /** Rodando por el suelo: aplana cabeceo y alabeo progresivamente. */
  #levelOnGround(dt) {
    _forward.copy(AXIS_FWD).applyQuaternion(this.quaternion);
    _right.copy(AXIS_X).applyQuaternion(this.quaternion);
    const k = clamp(6 * dt, 0, 1);
    if (_forward.y < 0) this.#rotateLocal(AXIS_X, -_forward.y * k);
    this.#rotateLocal(AXIS_FWD, _right.y * k);
  }
}

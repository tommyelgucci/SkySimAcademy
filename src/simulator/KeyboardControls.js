/**
 * KeyboardControls — traduce el teclado a entradas normalizadas del motor.
 *
 * Mapeo (código físico de tecla, funciona igual en QWERTY/QWERTZ/AZERTY):
 *   W/S  o  ↑/↓   → cabeceo (W = morro abajo, S = tirar/morro arriba)
 *   A/D  o  ←/→   → alabeo
 *   Q/E           → guiñada (timón)
 *   Shift / Ctrl  → más / menos gases
 */
const BINDINGS = {
  KeyW: { axis: "pitch", value: -1 },
  ArrowUp: { axis: "pitch", value: -1 },
  KeyS: { axis: "pitch", value: 1 },
  ArrowDown: { axis: "pitch", value: 1 },
  KeyA: { axis: "roll", value: -1 },
  ArrowLeft: { axis: "roll", value: -1 },
  KeyD: { axis: "roll", value: 1 },
  ArrowRight: { axis: "roll", value: 1 },
  KeyQ: { axis: "yaw", value: 1 },
  KeyE: { axis: "yaw", value: -1 },
  ShiftLeft: { axis: "throttle", value: 1 },
  ShiftRight: { axis: "throttle", value: 1 },
  ControlLeft: { axis: "throttle", value: -1 },
  ControlRight: { axis: "throttle", value: -1 },
};

export class KeyboardControls {
  constructor() {
    this.pressed = new Set();
    this.onKeyDown = (event) => this.#handle(event, true);
    this.onKeyUp = (event) => this.#handle(event, false);
  }

  attach() {
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
  }

  detach() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    this.pressed.clear();
  }

  #handle(event, isDown) {
    if (!BINDINGS[event.code]) return;
    event.preventDefault(); // evita hacer scroll con las flechas
    if (isDown) this.pressed.add(event.code);
    else this.pressed.delete(event.code);
  }

  /** Estado agregado de los ejes: cada uno en [-1, 1]. */
  getInput() {
    const input = { pitch: 0, roll: 0, yaw: 0, throttle: 0 };
    for (const code of this.pressed) {
      const { axis, value } = BINDINGS[code];
      input[axis] = Math.max(-1, Math.min(1, input[axis] + value));
    }
    return input;
  }
}

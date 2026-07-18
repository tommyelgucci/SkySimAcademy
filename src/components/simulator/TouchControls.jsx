/**
 * TouchControls — mandos táctiles en pantalla para el simulador.
 *
 * Diseño (metáfora de palanca real):
 *  - Joystick izquierdo: arrastrar = cabeceo (abajo = tirar → morro arriba)
 *    y alabeo (izquierda/derecha).
 *  - Slider vertical derecho: palanca de gases con valor absoluto 0-100 %.
 *  - Dos botones inferiores: timón de dirección (guiñada).
 *
 * No usa estado de React para las entradas: escribe directamente en
 * `inputRef.current`, que el game loop lee en cada frame. Así arrastrar el
 * joystick no fuerza re-renders a 60 fps. Pointer Events cubren tanto dedo
 * como ratón, y `touch-action: none` (en CSS) evita el scroll de la página.
 */
import { useRef, useState } from "react";
import { MoveLeft, MoveRight } from "lucide-react";
import { useTranslation } from "react-i18next";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/** ¿El dispositivo tiene entrada táctil / puntero grueso? */
export function hasCoarsePointer() {
  return (
    window.matchMedia?.("(pointer: coarse)").matches ||
    navigator.maxTouchPoints > 0
  );
}

export default function TouchControls({ inputRef }) {
  const { t } = useTranslation("simulator");

  return (
    <div className="touch-controls">
      <Joystick inputRef={inputRef} />
      <div className="touch-controls__yaw">
        <YawButton inputRef={inputRef} direction={1} label={t("controls.yaw")}>
          <MoveLeft size={22} aria-hidden="true" />
        </YawButton>
        <YawButton inputRef={inputRef} direction={-1} label={t("controls.yaw")}>
          <MoveRight size={22} aria-hidden="true" />
        </YawButton>
      </div>
      <ThrottleSlider inputRef={inputRef} label={t("controls.throttle")} />
    </div>
  );
}

/** Joystick: cabeceo + alabeo. */
function Joystick({ inputRef }) {
  const baseRef = useRef(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });

  const move = (event) => {
    const rect = baseRef.current.getBoundingClientRect();
    const radius = rect.width / 2;
    const dx = clamp((event.clientX - rect.left - radius) / radius, -1, 1);
    const dy = clamp((event.clientY - rect.top - radius) / radius, -1, 1);
    // Arrastrar hacia abajo = tirar de la palanca = morro arriba (pitch +)
    inputRef.current.roll = dx;
    inputRef.current.pitch = dy;
    setThumb({ x: dx, y: dy });
  };

  const release = (event) => {
    event.currentTarget.releasePointerCapture?.(event.pointerId);
    inputRef.current.roll = 0;
    inputRef.current.pitch = 0;
    setThumb({ x: 0, y: 0 });
  };

  return (
    <div
      ref={baseRef}
      className="joystick"
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) move(event);
      }}
      onPointerUp={release}
      onPointerCancel={release}
    >
      <div
        className="joystick__thumb"
        style={{ transform: `translate(${thumb.x * 34}px, ${thumb.y * 34}px)` }}
      />
    </div>
  );
}

/** Palanca de gases: valor absoluto 0 (abajo) → 1 (arriba). */
function ThrottleSlider({ inputRef, label }) {
  const trackRef = useRef(null);
  const [value, setValue] = useState(0);

  const move = (event) => {
    const rect = trackRef.current.getBoundingClientRect();
    const v = clamp(1 - (event.clientY - rect.top) / rect.height, 0, 1);
    inputRef.current.throttleTarget = v;
    setValue(v);
  };

  return (
    <div
      ref={trackRef}
      className="throttle-slider"
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        move(event);
      }}
      onPointerMove={(event) => {
        if (event.currentTarget.hasPointerCapture?.(event.pointerId)) move(event);
      }}
    >
      <div className="throttle-slider__fill" style={{ height: `${value * 100}%` }} />
      <div className="throttle-slider__grip" style={{ bottom: `${value * 100}%` }} />
    </div>
  );
}

/** Botón de timón: guiñada mientras se mantiene pulsado. */
function YawButton({ inputRef, direction, label, children }) {
  const press = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    inputRef.current.yaw = direction;
  };
  const release = () => {
    inputRef.current.yaw = 0;
  };
  return (
    <button
      className="yaw-button"
      aria-label={label}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onContextMenu={(event) => event.preventDefault()}
    >
      {children}
    </button>
  );
}

/**
 * Gauges — los cinco relojes SVG paramétricos del avión (cero imágenes,
 * cero copyright), compartidos entre el cuadro de instrumentos del
 * simulador (InstrumentPanel.jsx) y las flashcards visuales de
 * reconocimiento de instrumentos (FlashcardsView.jsx). Un único sitio para
 * las "imágenes creadas por nosotros mismos" de cada instrumento.
 *
 * Escalas calibradas a NUESTRA física (FLIGHT), no a un avión real:
 * pérdida a 14 m/s, rotación a 20, máximo 60.
 */
import { useRef } from "react";
import { FLIGHT } from "../../simulator/FlightEngine.js";

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

/**
 * Ángulo acumulado: convierte un ángulo cíclico (0–360) en uno continuo
 * tomando siempre el camino corto. Evita que la transición CSS haga girar
 * la brújula (o el altímetro) una vuelta entera al cruzar el norte.
 */
function useContinuousAngle(angle) {
  const ref = useRef(angle);
  const delta = ((angle - (ref.current % 360) + 540) % 360) - 180;
  ref.current += delta;
  return ref.current;
}

/** Punto sobre un círculo (ángulo en grados, 0 = arriba, horario). */
function polar(cx, cy, radius, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
}

/** Arco SVG entre dos ángulos (grados, 0 = arriba, horario). */
function arcPath(cx, cy, radius, startDeg, endDeg) {
  const [x1, y1] = polar(cx, cy, radius, startDeg);
  const [x2, y2] = polar(cx, cy, radius, endDeg);
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
}

/** Esfera común: bisel + fondo + marca de rótulo. */
function Bezel({ children, label }) {
  return (
    <svg viewBox="0 0 100 100" className="gauge" role="img" aria-label={label}>
      <circle cx="50" cy="50" r="49" fill="#0a0d13" />
      <circle cx="50" cy="50" r="46" fill="#11151d" stroke="#2a3242" strokeWidth="1.5" />
      {children}
    </svg>
  );
}

/** Aguja con transición CSS (el suavizado entre muestras del HUD). */
function Needle({ angle, length = 34, width = 2.4, color = "#f2f2f0" }) {
  return (
    <g className="gauge__needle" style={{ transform: `rotate(${angle}deg)` }}>
      <polygon
        points={`${50 - width} 54, 50 ${50 - length}, ${50 + width} 54`}
        fill={color}
      />
      <circle cx="50" cy="50" r="4" fill="#3a4356" stroke="#0a0d13" strokeWidth="1" />
    </g>
  );
}

/** Anemómetro: 0–75 m/s en 270°, arcos verde/amarillo y raya roja de pérdida. */
export function AirspeedIndicator({ value, label }) {
  const MAX = FLIGHT.MAX_SPEED * 1.25;
  const angle = (v) => -135 + (clamp(v, 0, MAX) / MAX) * 270;
  const ticks = [];
  for (let v = 0; v <= MAX; v += 10) {
    const [x1, y1] = polar(50, 50, 40, angle(v));
    const [x2, y2] = polar(50, 50, 34, angle(v));
    ticks.push(<line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cfd6e4" strokeWidth="1.6" />);
  }
  const [sx1, sy1] = polar(50, 50, 43, angle(FLIGHT.STALL_SPEED));
  const [sx2, sy2] = polar(50, 50, 31, angle(FLIGHT.STALL_SPEED));
  return (
    <Bezel label={label}>
      <path d={arcPath(50, 50, 37, angle(FLIGHT.ROTATE_SPEED), angle(FLIGHT.MAX_SPEED))} stroke="#35c759" strokeWidth="4" fill="none" />
      <path d={arcPath(50, 50, 37, angle(FLIGHT.MAX_SPEED), angle(MAX))} stroke="#ffb703" strokeWidth="4" fill="none" />
      {ticks}
      <line x1={sx1} y1={sy1} x2={sx2} y2={sy2} stroke="#ff4d4d" strokeWidth="3" />
      <text x="50" y="74" textAnchor="middle" fontSize="9" fill="#9fb0c9">m/s</text>
      <Needle angle={angle(value)} />
    </Bezel>
  );
}

/** Horizonte artificial: cielo/tierra que cabecea y alabea; avión fijo. */
export function AttitudeIndicator({ pitch, bank, label }) {
  const pitchShift = clamp(pitch, -35, 35) * 1.1; // px por grado
  return (
    <Bezel label={label}>
      <g clipPath="url(#att-clip)">
        <g
          className="gauge__horizon"
          style={{ transform: `rotate(${-bank}deg) translateY(${pitchShift}px)` }}
        >
          <rect x="-40" y="-130" width="180" height="180" fill="#3d8fd1" />
          <rect x="-40" y="50" width="180" height="180" fill="#8a5a2b" />
          <line x1="-40" y1="50" x2="140" y2="50" stroke="#f2f2f0" strokeWidth="1.6" />
          {[10, 20].map((p) => (
            <g key={p}>
              <line x1="38" y1={50 - p * 1.1} x2="62" y2={50 - p * 1.1} stroke="#f2f2f0" strokeWidth="1" />
              <line x1="38" y1={50 + p * 1.1} x2="62" y2={50 + p * 1.1} stroke="#f2f2f0" strokeWidth="1" />
            </g>
          ))}
        </g>
      </g>
      <clipPath id="att-clip">
        <circle cx="50" cy="50" r="42" />
      </clipPath>
      {/* Referencia fija del avión */}
      <line x1="26" y1="50" x2="42" y2="50" stroke="#ffb703" strokeWidth="3" />
      <line x1="58" y1="50" x2="74" y2="50" stroke="#ffb703" strokeWidth="3" />
      <circle cx="50" cy="50" r="2.4" fill="#ffb703" />
    </Bezel>
  );
}

/** Altímetro: una vuelta = 1000 m, con lectura digital. */
export function Altimeter({ value, label, locale }) {
  const angle = useContinuousAngle(((value % 1000) / 1000) * 360);
  const ticks = [];
  for (let i = 0; i < 10; i++) {
    const [x1, y1] = polar(50, 50, 40, i * 36);
    const [x2, y2] = polar(50, 50, 33, i * 36);
    ticks.push(<line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cfd6e4" strokeWidth="1.8" />);
  }
  return (
    <Bezel label={label}>
      {ticks}
      <text x="50" y="76" textAnchor="middle" fontSize="10" fill="#eef3fb" fontWeight="700">
        {Math.round(value).toLocaleString(locale)}
      </text>
      <text x="50" y="85" textAnchor="middle" fontSize="7" fill="#9fb0c9">m</text>
      <Needle angle={angle} />
    </Bezel>
  );
}

/** Variómetro: ±10 m/s; 0 a la izquierda, subir gira hacia arriba. */
export function Variometer({ value, label }) {
  const angle = -90 + (clamp(value, -10, 10) / 10) * 80;
  const marks = [-10, -5, 0, 5, 10].map((v) => {
    const a = -90 + (v / 10) * 80;
    const [x1, y1] = polar(50, 50, 40, a);
    const [x2, y2] = polar(50, 50, 33, a);
    return <line key={v} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cfd6e4" strokeWidth="1.8" />;
  });
  return (
    <Bezel label={label}>
      {marks}
      <text x="70" y="38" fontSize="8" fill="#35c759">▲</text>
      <text x="70" y="68" fontSize="8" fill="#ff4d4d">▼</text>
      <Needle angle={angle} />
    </Bezel>
  );
}

/** Brújula: rosa giratoria bajo una línea de fe fija. */
export function CompassGauge({ heading, label, cardinals }) {
  const continuous = useContinuousAngle(heading);
  const points = [
    [0, cardinals.n], [90, cardinals.e], [180, cardinals.s], [270, cardinals.w],
  ];
  return (
    <Bezel label={label}>
      <g className="gauge__card" style={{ transform: `rotate(${-continuous}deg)` }}>
        {points.map(([deg, letter]) => {
          const [x, y] = polar(50, 50, 34, deg);
          return (
            <text key={deg} x={x} y={y + 3} textAnchor="middle" fontSize="10"
              fontWeight="700" fill={deg === 0 ? "#ff8f5c" : "#eef3fb"}
              transform={`rotate(${deg} ${x} ${y})`}>
              {letter}
            </text>
          );
        })}
        {Array.from({ length: 12 }, (_, i) => i * 30).map((deg) => {
          const [x1, y1] = polar(50, 50, 44, deg);
          const [x2, y2] = polar(50, 50, 41, deg);
          return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#cfd6e4" strokeWidth="1.4" />;
        })}
      </g>
      <polygon points="50 4, 47 12, 53 12" fill="#ffb703" />
    </Bezel>
  );
}

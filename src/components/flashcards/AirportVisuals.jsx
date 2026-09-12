/**
 * AirportVisuals — SVG propios (cero imágenes, cero copyright) para el mazo
 * de flashcards "Señales y luces de aeródromo": señales de calle de rodaje
 * por color, el patrón de un PAPI, y el patrón de color de un faro
 * giratorio. Mismo criterio que Gauges.jsx: geometría paramétrica simple,
 * sin depender de ningún asset externo.
 *
 * Reutiliza la clase CSS "gauge" (ver index.css) para heredar el tamaño de
 * `.flashcards__visual .gauge` sin sumar reglas nuevas — el viewBox propio
 * de cada visual controla su proporción interna.
 */

/** Señal de aeródromo: roja/blanca (obligatoria), amarilla/negra (ubicación)
 *  o negra/amarilla con flecha opcional (dirección). */
export function AirportSign({ kind, text, arrow, label }) {
  const palette = {
    mandatory: { fill: "#c81e33", stroke: "#7a0f1e", text: "#ffffff" },
    location: { fill: "#f5c518", stroke: "#a9860a", text: "#14171c" },
    direction: { fill: "#14171c", stroke: "#3a4356", text: "#f5c518" },
  }[kind];

  const arrowPoints =
    arrow === "left" ? "18 20, 6 30, 18 40" : arrow === "right" ? "82 20, 94 30, 82 40" : null;

  return (
    <svg viewBox="0 0 100 60" className="gauge" role="img" aria-label={label}>
      <rect
        x="3"
        y="6"
        width="94"
        height="48"
        rx="4"
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth="3"
      />
      {arrowPoints && <polygon points={arrowPoints} fill={palette.text} />}
      <text
        x="50"
        y="38"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill={palette.text}
        fontFamily="system-ui, sans-serif"
      >
        {text}
      </text>
    </svg>
  );
}

const PAPI_COLORS = { white: "#f2f2f0", red: "#ff4d4d" };

/** Fila de 4 luces de un PAPI: blanco/rojo según se esté alto, bajo o en
 *  senda. `pattern` es un array de 4 valores "white" | "red". */
export function PapiLights({ pattern, label }) {
  return (
    <svg viewBox="0 0 100 40" className="gauge" role="img" aria-label={label}>
      <rect x="2" y="2" width="96" height="36" rx="4" fill="#0a0d13" stroke="#2a3242" />
      {pattern.map((color, i) => (
        <circle
          key={i}
          cx={16 + i * 23}
          cy="20"
          r="8.5"
          fill={PAPI_COLORS[color]}
          stroke="#11151d"
          strokeWidth="1.5"
        />
      ))}
    </svg>
  );
}

const BEACON_COLORS = {
  white: "#f2f2f0",
  green: "#35c759",
  yellow: "#ffb703",
};

/** Faro giratorio: dos destellos de color alternos (o dos destellos blancos
 *  próximos entre sí para el patrón militar, `double`). */
export function BeaconFlash({ colors, double, label }) {
  const [a, b] = colors;
  const gap = double ? 14 : 30;
  const cx1 = 50 - gap / 2;
  const cx2 = 50 + gap / 2;
  return (
    <svg viewBox="0 0 100 100" className="gauge" role="img" aria-label={label}>
      <circle cx="50" cy="50" r="49" fill="#0a0d13" />
      <circle cx="50" cy="50" r="46" fill="#11151d" stroke="#2a3242" strokeWidth="1.5" />
      {[cx1, cx2].map((cx, i) => (
        <g key={i}>
          {[0, 45, 90, 135].map((deg) => (
            <line
              key={deg}
              x1={cx}
              y1="50"
              x2={cx + 16 * Math.cos((deg * Math.PI) / 180)}
              y2={50 + 16 * Math.sin((deg * Math.PI) / 180)}
              stroke={BEACON_COLORS[i === 0 ? a : b]}
              strokeWidth="1.5"
              opacity="0.55"
            />
          ))}
          <circle cx={cx} cy="50" r="9" fill={BEACON_COLORS[i === 0 ? a : b]} />
        </g>
      ))}
    </svg>
  );
}

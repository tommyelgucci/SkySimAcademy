/**
 * LessonDiagram — ilustraciones de las lecciones, dibujadas a mano en SVG.
 *
 * Misma política que los iconos y los relojes del simulador: cero imágenes,
 * cero assets externos, cero copyright. Todo es geometría paramétrica.
 *
 * Los TEXTOS no viven aquí: cada diagrama pide sus etiquetas por i18next con
 * la clave `theory:diagrams.<id>.<etiqueta>`, igual que el resto del curso,
 * así que se traducen a los 5 idiomas como cualquier otra cadena.
 *
 * Un diagrama se ata a una lección con `"diagram": "<id>"` en el JSON de
 * estructura del módulo (ver src/content/modules/). Si el id no existe aquí
 * no se rompe nada: simplemente no se dibuja nada.
 *
 * Sobre RTL: el SVG NO se voltea con `dir`. Es deliberado — un perfil alar
 * con el viento relativo entrando por la izquierda, o una senda de planeo
 * descendiendo hacia la derecha, son convenciones técnicas que se dibujan
 * igual en cualquier idioma; espejarlas confundiría más que ayudar. Lo que
 * sí se traduce son las etiquetas.
 */
import { useTranslation } from "react-i18next";
import { DIAGRAM_IDS } from "../../content/diagrams.js";

/** Punta de flecha reutilizada por todos los diagramas. */
function ArrowDefs({ id, color }) {
  return (
    <defs>
      <marker
        id={id}
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="5.5"
        markerHeight="5.5"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill={color} />
      </marker>
    </defs>
  );
}

/** Silueta de avión vista desde el lado, mirando a la derecha. */
function SideAircraft({ x, y, scale = 1, fill = "#dbe6f5" }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} fill={fill}>
      <ellipse cx="0" cy="0" rx="34" ry="7" />
      <path d="M 34 0 L 48 0 L 34 -5 z" />
      <path d="M -6 -2 L 10 -2 L 2 -20 L -6 -20 z" />
      <path d="M -34 -2 L -20 -2 L -20 -14 L -30 -14 z" />
      <rect x="-14" y="4" width="20" height="4" rx="2" />
    </g>
  );
}

/** Las cuatro fuerzas sobre un avión en vuelo recto y nivelado. */
function FourForces({ t }) {
  const LIFT = "#4da3ff";
  const WEIGHT = "#ff8f5c";
  const THRUST = "#35c759";
  const DRAG = "#ff5d5d";
  return (
    <svg viewBox="0 0 420 260" className="lesson-diagram__svg" role="img"
      aria-label={t("diagrams.four-forces.alt")}>
      <ArrowDefs id="fd-lift" color={LIFT} />
      <ArrowDefs id="fd-weight" color={WEIGHT} />
      <ArrowDefs id="fd-thrust" color={THRUST} />
      <ArrowDefs id="fd-drag" color={DRAG} />
      <SideAircraft x={210} y={130} />

      <line x1="210" y1="118" x2="210" y2="42" stroke={LIFT} strokeWidth="4"
        markerEnd="url(#fd-lift)" />
      <text x="210" y="32" textAnchor="middle" fill={LIFT} fontSize="15" fontWeight="700">
        {t("diagrams.four-forces.lift")}
      </text>

      <line x1="210" y1="142" x2="210" y2="218" stroke={WEIGHT} strokeWidth="4"
        markerEnd="url(#fd-weight)" />
      <text x="210" y="240" textAnchor="middle" fill={WEIGHT} fontSize="15" fontWeight="700">
        {t("diagrams.four-forces.weight")}
      </text>

      <line x1="252" y1="130" x2="344" y2="130" stroke={THRUST} strokeWidth="4"
        markerEnd="url(#fd-thrust)" />
      <text x="300" y="118" textAnchor="middle" fill={THRUST} fontSize="15" fontWeight="700">
        {t("diagrams.four-forces.thrust")}
      </text>

      <line x1="168" y1="130" x2="76" y2="130" stroke={DRAG} strokeWidth="4"
        markerEnd="url(#fd-drag)" />
      <text x="120" y="118" textAnchor="middle" fill={DRAG} fontSize="15" fontWeight="700">
        {t("diagrams.four-forces.drag")}
      </text>
    </svg>
  );
}

/** Perfil alar con cuerda, viento relativo y el ángulo entre ambos. */
function AngleOfAttack({ t }) {
  const WIND = "#4da3ff";
  const CHORD = "#ffb703";
  // El perfil se dibuja inclinado 16° respecto al viento, que llega horizontal
  return (
    <svg viewBox="0 0 420 240" className="lesson-diagram__svg" role="img"
      aria-label={t("diagrams.angle-of-attack.alt")}>
      <ArrowDefs id="aoa-wind" color={WIND} />

      {[70, 110, 150].map((y) => (
        <line key={y} x1="14" y1={y} x2="120" y2={y} stroke={WIND} strokeWidth="3"
          markerEnd="url(#aoa-wind)" opacity="0.85" />
      ))}
      <text x="60" y="176" fill={WIND} fontSize="14" fontWeight="700">
        {t("diagrams.angle-of-attack.relativeWind")}
      </text>

      <g transform="rotate(-16 250 118)">
        {/* Perfil: borde de ataque redondo, borde de salida afilado */}
        <path d="M 170 118 C 190 96, 250 92, 300 108 C 322 114, 336 118, 344 118
                 C 320 124, 250 134, 200 130 C 182 128, 174 123, 170 118 z"
          fill="#dbe6f5" />
        <line x1="170" y1="118" x2="344" y2="118" stroke={CHORD} strokeWidth="2.5"
          strokeDasharray="7 5" />
        <text x="258" y="152" textAnchor="middle" fill={CHORD} fontSize="14" fontWeight="700">
          {t("diagrams.angle-of-attack.chord")}
        </text>
      </g>

      {/* Arco del ángulo entre viento relativo y cuerda */}
      <path d="M 210 118 A 46 46 0 0 0 208 105" fill="none" stroke="#ffffff" strokeWidth="2.5" />
      <line x1="164" y1="118" x2="360" y2="118" stroke="#ffffff" strokeWidth="1.6"
        strokeDasharray="5 5" opacity="0.55" />
      <text x="268" y="212" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="700">
        {t("diagrams.angle-of-attack.angle")}
      </text>
    </svg>
  );
}

/** Los tres ejes del avión y el mando que gobierna cada uno. */
function ThreeAxes({ t }) {
  const ROLL = "#4da3ff";
  const PITCH = "#35c759";
  const YAW = "#ffb703";
  return (
    <svg viewBox="0 0 420 250" className="lesson-diagram__svg" role="img"
      aria-label={t("diagrams.three-axes.alt")}>
      <ArrowDefs id="ax-roll" color={ROLL} />
      <ArrowDefs id="ax-pitch" color={PITCH} />
      <ArrowDefs id="ax-yaw" color={YAW} />

      {/* Avión visto desde arriba */}
      <g fill="#dbe6f5">
        <ellipse cx="210" cy="125" rx="12" ry="62" />
        <path d="M 198 118 L 22 132 L 22 142 L 198 140 z" />
        <path d="M 222 118 L 398 132 L 398 142 L 222 140 z" />
        <path d="M 200 178 L 128 186 L 128 192 L 200 190 z" />
        <path d="M 220 178 L 292 186 L 292 192 L 220 190 z" />
      </g>

      {/* Eje longitudinal (alabeo) */}
      <line x1="210" y1="52" x2="210" y2="200" stroke={ROLL} strokeWidth="3"
        strokeDasharray="8 5" markerStart="url(#ax-roll)" markerEnd="url(#ax-roll)" />
      <text x="210" y="42" textAnchor="middle" fill={ROLL} fontSize="14" fontWeight="700">
        {t("diagrams.three-axes.roll")}
      </text>

      {/* Eje lateral (cabeceo) */}
      <line x1="52" y1="136" x2="368" y2="136" stroke={PITCH} strokeWidth="3"
        strokeDasharray="8 5" markerStart="url(#ax-pitch)" markerEnd="url(#ax-pitch)" />
      <text x="26" y="118" fill={PITCH} fontSize="14" fontWeight="700">
        {t("diagrams.three-axes.pitch")}
      </text>

      {/* Eje vertical (guiñada): se ve como un punto, se marca con un círculo */}
      <circle cx="210" cy="136" r="17" fill="none" stroke={YAW} strokeWidth="3"
        strokeDasharray="7 5" />
      <text x="292" y="228" textAnchor="middle" fill={YAW} fontSize="14" fontWeight="700">
        {t("diagrams.three-axes.yaw")}
      </text>
      <line x1="228" y1="150" x2="278" y2="214" stroke={YAW} strokeWidth="2" opacity="0.7" />
    </svg>
  );
}

/** Relación de planeo: altura perdida frente a distancia recorrida. */
function GlideRatio({ t }) {
  const PATH = "#4da3ff";
  return (
    <svg viewBox="0 0 420 240" className="lesson-diagram__svg" role="img"
      aria-label={t("diagrams.glide-ratio.alt")}>
      <ArrowDefs id="gr-alt" color="#ffb703" />
      <ArrowDefs id="gr-dist" color="#35c759" />

      {/* Suelo */}
      <line x1="20" y1="192" x2="404" y2="192" stroke="#6b7c95" strokeWidth="3" />
      {/* Trayectoria de planeo */}
      <line x1="56" y1="52" x2="380" y2="192" stroke={PATH} strokeWidth="4" />
      <SideAircraft x={92} y={62} scale={0.55} />

      {/* Altura */}
      <line x1="34" y1="52" x2="34" y2="192" stroke="#ffb703" strokeWidth="3"
        markerStart="url(#gr-alt)" markerEnd="url(#gr-alt)" />
      <text x="44" y="126" fill="#ffb703" fontSize="14" fontWeight="700">
        {t("diagrams.glide-ratio.height")}
      </text>

      {/* Distancia */}
      <line x1="56" y1="214" x2="380" y2="214" stroke="#35c759" strokeWidth="3"
        markerStart="url(#gr-dist)" markerEnd="url(#gr-dist)" />
      <text x="218" y="234" textAnchor="middle" fill="#35c759" fontSize="14" fontWeight="700">
        {t("diagrams.glide-ratio.distance")}
      </text>

      <text x="238" y="104" fill={PATH} fontSize="14" fontWeight="700">
        {t("diagrams.glide-ratio.ratio")}
      </text>
    </svg>
  );
}

/** Senda de planeo de 3°: alto, en senda y bajo. */
function Glideslope({ t }) {
  const ON = "#35c759";
  const HIGH = "#ffb703";
  const LOW = "#ff5d5d";
  return (
    <svg viewBox="0 0 420 230" className="lesson-diagram__svg" role="img"
      aria-label={t("diagrams.glideslope.alt")}>
      {/* Suelo y pista */}
      <line x1="16" y1="186" x2="404" y2="186" stroke="#6b7c95" strokeWidth="2" />
      <rect x="312" y="180" width="86" height="12" rx="2" fill="#3a4356" />
      <text x="355" y="212" textAnchor="middle" fill="#9fb0c9" fontSize="13">
        {t("diagrams.glideslope.runway")}
      </text>

      {/* Senda correcta */}
      <line x1="40" y1="96" x2="316" y2="182" stroke={ON} strokeWidth="4" />
      <SideAircraft x={128} y={122} scale={0.5} />
      <text x="150" y="152" fill={ON} fontSize="14" fontWeight="700">
        {t("diagrams.glideslope.onCourse")}
      </text>

      {/* Demasiado alto */}
      <line x1="40" y1="52" x2="316" y2="182" stroke={HIGH} strokeWidth="2.5"
        strokeDasharray="8 6" />
      <text x="52" y="44" fill={HIGH} fontSize="14" fontWeight="700">
        {t("diagrams.glideslope.high")}
      </text>

      {/* Demasiado bajo */}
      <line x1="40" y1="146" x2="316" y2="182" stroke={LOW} strokeWidth="2.5"
        strokeDasharray="8 6" />
      <text x="52" y="168" fill={LOW} fontSize="14" fontWeight="700">
        {t("diagrams.glideslope.low")}
      </text>
    </svg>
  );
}

/** Momento = peso × brazo, y el centro de gravedad resultante. */
function MomentBalance({ t }) {
  const ARM = "#4da3ff";
  return (
    <svg viewBox="0 0 420 230" className="lesson-diagram__svg" role="img"
      aria-label={t("diagrams.moment.alt")}>
      <ArrowDefs id="mb-arm" color={ARM} />

      {/* Fuselaje esquemático */}
      <rect x="40" y="92" width="340" height="26" rx="13" fill="#dbe6f5" />
      {/* Datum */}
      <line x1="60" y1="60" x2="60" y2="160" stroke="#ffb703" strokeWidth="3" />
      <text x="60" y="52" textAnchor="middle" fill="#ffb703" fontSize="13" fontWeight="700">
        {t("diagrams.moment.datum")}
      </text>

      {/* Dos cargas */}
      {[
        { x: 150, label: t("diagrams.moment.front") },
        { x: 300, label: t("diagrams.moment.rear") },
      ].map((load) => (
        <g key={load.x}>
          <rect x={load.x - 20} y="60" width="40" height="30" rx="5" fill="#2a3b58"
            stroke="#4da3ff" strokeWidth="2" />
          <text x={load.x} y="80" textAnchor="middle" fill="#eef3fb" fontSize="12">
            {load.label}
          </text>
          <line x1="60" y1={load.x === 150 ? 140 : 164} x2={load.x}
            y2={load.x === 150 ? 140 : 164} stroke={ARM} strokeWidth="2.5"
            markerStart="url(#mb-arm)" markerEnd="url(#mb-arm)" />
          <text x={(60 + load.x) / 2} y={load.x === 150 ? 134 : 158} textAnchor="middle"
            fill={ARM} fontSize="12" fontWeight="700">
            {t("diagrams.moment.arm")}
          </text>
        </g>
      ))}

      {/* Centro de gravedad resultante */}
      <g transform="translate(228 105)">
        <circle r="13" fill="#eef3fb" />
        <path d="M -13 0 A 13 13 0 0 1 0 -13 L 0 0 z" fill="#11151d" />
        <path d="M 13 0 A 13 13 0 0 1 0 13 L 0 0 z" fill="#11151d" />
      </g>
      <text x="228" y="146" textAnchor="middle" fill="#eef3fb" fontSize="13" fontWeight="700">
        {t("diagrams.moment.cg")}
      </text>
      <text x="210" y="212" textAnchor="middle" fill="#9fb0c9" fontSize="14">
        {t("diagrams.moment.formula")}
      </text>
    </svg>
  );
}

/** Clases de espacio aéreo apiladas por altura. */
function AirspaceClasses({ t }) {
  const bands = [
    { y: 30, h: 42, fill: "rgba(77,163,255,0.28)", key: "upper" },
    { y: 72, h: 48, fill: "rgba(77,163,255,0.20)", key: "middle" },
    { y: 120, h: 56, fill: "rgba(77,163,255,0.12)", key: "lower" },
  ];
  return (
    <svg viewBox="0 0 420 230" className="lesson-diagram__svg" role="img"
      aria-label={t("diagrams.airspace.alt")}>
      {bands.map((band) => (
        <g key={band.key}>
          <rect x="40" y={band.y} width="300" height={band.h} fill={band.fill}
            stroke="#4da3ff" strokeWidth="1.5" />
          <text x="190" y={band.y + band.h / 2 + 5} textAnchor="middle" fill="#eef3fb"
            fontSize="14" fontWeight="700">
            {t(`diagrams.airspace.${band.key}`)}
          </text>
        </g>
      ))}
      {/* Suelo y aeródromo */}
      <line x1="20" y1="176" x2="400" y2="176" stroke="#6b7c95" strokeWidth="3" />
      <rect x="150" y="170" width="80" height="8" rx="2" fill="#3a4356" />
      <text x="190" y="200" textAnchor="middle" fill="#9fb0c9" fontSize="13">
        {t("diagrams.airspace.ground")}
      </text>
      {/* Escala de altura */}
      <text x="356" y="46" fill="#9fb0c9" fontSize="12">
        {t("diagrams.airspace.higher")}
      </text>
      <text x="356" y="168" fill="#9fb0c9" fontSize="12">
        {t("diagrams.airspace.lower")}
      </text>
    </svg>
  );
}

const DIAGRAMS = {
  "four-forces": FourForces,
  "angle-of-attack": AngleOfAttack,
  "three-axes": ThreeAxes,
  "glide-ratio": GlideRatio,
  glideslope: Glideslope,
  moment: MomentBalance,
  airspace: AirspaceClasses,
};

// La lista de ids vive en `src/content/diagrams.js` para que la pueda leer
// `check-i18n.mjs` (Node, sin JSX). Si alguna vez se declara un id ahí y se
// olvida implementarlo aquí, salta en desarrollo en vez de renderizar nada.
if (import.meta.env?.DEV) {
  const missing = DIAGRAM_IDS.filter((id) => !DIAGRAMS[id]);
  if (missing.length) {
    console.error(`LessonDiagram: diagramas declarados sin implementar: ${missing.join(", ")}`);
  }
}

export default function LessonDiagram({ id }) {
  const { t } = useTranslation("theory");
  const Diagram = DIAGRAMS[id];
  if (!Diagram) return null;
  return (
    <figure className="lesson-diagram">
      <Diagram t={t} />
      <figcaption>{t(`diagrams.${id}.caption`)}</figcaption>
    </figure>
  );
}

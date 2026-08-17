/**
 * MiniMap — vista cenital pequeña con la posición del avión, el límite del
 * área de vuelo y las pistas del escenario.
 *
 * Canvas 2D normal (no un segundo renderer Three.js): el contenido es
 * trivial y se redibuja al ritmo del HUD (~10 Hz, ver SimulatorView), no a
 * 60 fps — mismo criterio de coste que el resto de la interfaz en vuelo.
 * Norte arriba, sin zoom ni rotación de mapa: se ve TODO `mapRadius` a la
 * vez, centrado en el origen del mundo (no en el avión). En vuelo libre eso
 * es lo que deja ver dónde están las otras pistas del archipiélago desde
 * lejos — un mapa que solo mostrara el entorno cercano del avión perdería
 * esa referencia, así que no se recorta ni se hace panning.
 *
 * Con un mapa de miles de metros de radio cada pista puede caer en muy
 * pocos píxeles: `RUNWAY_MARKER_MIN` fuerza un punto mínimo visible además
 * del rectángulo real, para que nunca desaparezca por escala.
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDraggableHud } from "./useDraggableHud.js";

const SIZE = 130; // px CSS; el buffer real se escala por devicePixelRatio
/** Radio mínimo (px) del punto que marca cada pista, sin importar la escala. */
const RUNWAY_MARKER_MIN = 3;

export default function MiniMap({ terrain, posX, posZ, heading, nearBoundary }) {
  const { t } = useTranslation("simulator");
  const canvasRef = useRef(null);
  const { ref: dragRef, style: dragStyle, handlers } = useDraggableHud("aerolearn.hudPos.minimap");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !terrain?.mapRadius) return;
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== SIZE * dpr) {
      canvas.width = SIZE * dpr;
      canvas.height = SIZE * dpr;
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const scale = (SIZE / 2 - 6) / terrain.mapRadius;
    // Mundo → mapa: +Z (sur) queda abajo, norte arriba, sin rotación.
    const toMap = (x, z) => [cx + x * scale, cy + z * scale];

    // Fondo
    ctx.fillStyle = "rgba(8, 14, 26, 0.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Límite del área de vuelo
    ctx.strokeStyle = nearBoundary ? "#f2545b" : "rgba(148, 163, 184, 0.55)";
    ctx.lineWidth = nearBoundary ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, SIZE / 2 - 6, 0, Math.PI * 2);
    ctx.stroke();

    // Pistas: el rectángulo real a escala, más un punto de tamaño mínimo
    // encima para que ninguna quede invisible en mapas grandes (vuelo libre).
    //
    // Con rotationY = 0, el LARGO de la pista corre en Z (norte-sur en el
    // mundo 3D) y el ANCHO en X — por eso el largo va en el eje LOCAL-Y del
    // rectángulo (vertical antes de rotar) y no en el X. El signo de la
    // rotación también se invierte: `ctx.rotate` gira el canvas en sentido
    // horario para un ángulo positivo, lo opuesto al giro en Y de Three.js
    // visto desde arriba. Sin las dos correcciones juntas, una pista que en
    // el mundo se ve vertical terminaba dibujada horizontal en el mapa.
    ctx.fillStyle = "rgba(226, 232, 240, 0.85)";
    for (const runway of terrain.runways ?? []) {
      const [rx, rz] = toMap(runway.x, runway.z);
      const runwayLength = runway.length * scale;
      const runwayWidth = Math.max(2, runway.width * scale);
      ctx.save();
      ctx.translate(rx, rz);
      ctx.rotate(-runway.rotationY);
      ctx.fillRect(-runwayWidth / 2, -runwayLength / 2, runwayWidth, runwayLength);
      ctx.restore();

      ctx.beginPath();
      ctx.arc(rx, rz, RUNWAY_MARKER_MIN, 0, Math.PI * 2);
      ctx.fill();
    }

    // Avión (triángulo apuntando al rumbo actual)
    const [px, pz] = toMap(posX, posZ);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate((heading * Math.PI) / 180);
    ctx.fillStyle = "#4da3ff";
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(4, 5);
    ctx.lineTo(-4, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [terrain, posX, posZ, heading, nearBoundary]);

  return (
    <div ref={dragRef} className="mini-map-wrap hud-draggable" style={dragStyle} {...handlers}>
      <canvas
        ref={canvasRef}
        className="mini-map"
        role="img"
        aria-label={t("minimap.title")}
        style={{ width: SIZE, height: SIZE }}
      />
    </div>
  );
}

/**
 * MiniMap — vista cenital pequeña con la posición del avión, el límite del
 * área de vuelo y las pistas del escenario.
 *
 * Canvas 2D normal (no un segundo renderer Three.js): el contenido es
 * trivial y se redibuja al ritmo del HUD (~10 Hz, ver SimulatorView), no a
 * 60 fps — mismo criterio de coste que el resto de la interfaz en vuelo.
 * Norte arriba, sin rotación de mapa.
 *
 * Mapa LOCAL centrado en el avión, no una vista fija de todo `mapRadius`:
 * en vuelo libre el mapa real puede tener miles de metros de radio (varias
 * pistas repartidas en un archipiélago), así que mostrar todo a la vez
 * dejaba cada pista en un rectángulo de menos de un píxel — invisible
 * aunque se estuviera aterrizando encima. Con radio local fijo, el avión
 * queda siempre en el centro y una pista "aparece" (crece a tamaño legible)
 * a medida que se la sobrevuela, como el radar de cualquier simulador.
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useDraggableHud } from "./useDraggableHud.js";

const SIZE = 130; // px CSS; el buffer real se escala por devicePixelRatio
/** Radio real (metros) que se ve alrededor del avión, como mucho. */
const LOCAL_RADIUS = 1000;

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
    // Nunca se hace zoom MÁS lejos que el propio mapa: en un escenario
    // pequeño (p. ej. la plataforma marina) se prefiere mostrarlo entero.
    const localRadius = Math.min(LOCAL_RADIUS, terrain.mapRadius);
    const scale = (SIZE / 2 - 6) / localRadius;
    // Mundo → mapa, centrado en el AVIÓN (no en el origen del mundo): +Z
    // (sur) queda abajo, norte arriba, sin rotación.
    const toMap = (x, z) => [cx + (x - posX) * scale, cy + (z - posZ) * scale];

    // Fondo
    ctx.fillStyle = "rgba(8, 14, 26, 0.85)";
    ctx.beginPath();
    ctx.arc(cx, cy, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Límite del área de vuelo: círculo centrado en el origen del mundo,
    // no en el avión — se dibuja donde caiga relativo a la vista local.
    const [boundaryX, boundaryY] = toMap(0, 0);
    ctx.strokeStyle = nearBoundary ? "#f2545b" : "rgba(148, 163, 184, 0.55)";
    ctx.lineWidth = nearBoundary ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(boundaryX, boundaryY, terrain.mapRadius * scale, 0, Math.PI * 2);
    ctx.stroke();

    // Pistas
    ctx.fillStyle = "rgba(226, 232, 240, 0.8)";
    for (const runway of terrain.runways ?? []) {
      const [rx, rz] = toMap(runway.x, runway.z);
      const w = runway.length * scale;
      const h = Math.max(2, runway.width * scale);
      ctx.save();
      ctx.translate(rx, rz);
      ctx.rotate(runway.rotationY);
      ctx.fillRect(-w / 2, -h / 2, w, h);
      ctx.restore();
    }

    // Avión (triángulo apuntando al rumbo actual) — siempre en el centro
    ctx.save();
    ctx.translate(cx, cy);
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

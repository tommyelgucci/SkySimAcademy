/**
 * MiniMap — vista cenital pequeña con la posición del avión, el límite del
 * área de vuelo y las pistas del escenario.
 *
 * Canvas 2D normal (no un segundo renderer Three.js): el contenido es
 * trivial y se redibuja al ritmo del HUD (~10 Hz, ver SimulatorView), no a
 * 60 fps — mismo criterio de coste que el resto de la interfaz en vuelo.
 * Norte arriba, sin zoom ni rotación de mapa.
 */
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const SIZE = 130; // px CSS; el buffer real se escala por devicePixelRatio

export default function MiniMap({ terrain, posX, posZ, heading, nearBoundary }) {
  const { t } = useTranslation("simulator");
  const canvasRef = useRef(null);

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
    <canvas
      ref={canvasRef}
      className="mini-map"
      role="img"
      aria-label={t("minimap.title")}
      style={{ width: SIZE, height: SIZE }}
    />
  );
}

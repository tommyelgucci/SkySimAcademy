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
/** Cuántas posiciones de estela se recuerdan, y cada cuántos px de mapa se suma una. */
const TRAIL_MAX = 48;
const TRAIL_STEP_PX = 2.5;

export default function MiniMap({ terrain, posX, posZ, heading, nearBoundary }) {
  const { t } = useTranslation("simulator");
  const canvasRef = useRef(null);
  /** Estela del avión en coordenadas de mundo; vive en un ref porque dibujarla no debe re-renderizar. */
  const trailRef = useRef([]);
  const { ref: dragRef, style: dragStyle, handlers } = useDraggableHud("aerolearn.hudPos.minimap");

  // Un vuelo nuevo (otro terreno) empieza sin estela del anterior.
  useEffect(() => {
    trailRef.current = [];
  }, [terrain]);

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

    const outer = SIZE / 2 - 6;

    // Fondo: degradado radial, más claro al centro, para dar profundidad.
    const bg = ctx.createRadialGradient(cx, cy, 4, cx, cy, SIZE / 2);
    bg.addColorStop(0, "rgba(20, 34, 56, 0.9)");
    bg.addColorStop(1, "rgba(6, 11, 20, 0.92)");
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(cx, cy, SIZE / 2 - 2, 0, Math.PI * 2);
    ctx.fill();

    // Anillos de distancia (tercios del radio) y cruz de ejes: referencia de
    // escala sin texto, que sería ilegible a este tamaño.
    ctx.strokeStyle = "rgba(148, 163, 184, 0.14)";
    ctx.lineWidth = 1;
    for (const f of [1 / 3, 2 / 3]) {
      ctx.beginPath();
      ctx.arc(cx, cy, outer * f, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(cx - outer, cy);
    ctx.lineTo(cx + outer, cy);
    ctx.moveTo(cx, cy - outer);
    ctx.lineTo(cx, cy + outer);
    ctx.stroke();

    // Límite del área de vuelo (con halo cuando el avión se acerca)
    ctx.save();
    if (nearBoundary) {
      ctx.shadowColor = "#f2545b";
      ctx.shadowBlur = 8;
    }
    ctx.strokeStyle = nearBoundary ? "#f2545b" : "rgba(148, 163, 184, 0.55)";
    ctx.lineWidth = nearBoundary ? 2.5 : 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, outer, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // Marca de norte: la única pista de orientación del mapa, que no rota.
    ctx.fillStyle = "#ff8f5c";
    ctx.beginPath();
    ctx.moveTo(cx, cy - outer - 1);
    ctx.lineTo(cx - 3.5, cy - outer + 6);
    ctx.lineTo(cx + 3.5, cy - outer + 6);
    ctx.closePath();
    ctx.fill();

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
      // Eje central discontinuo: distingue una pista de una mancha clara.
      if (runwayLength > 8) {
        ctx.strokeStyle = "rgba(8, 14, 26, 0.7)";
        ctx.lineWidth = 0.8;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(0, -runwayLength / 2 + 1);
        ctx.lineTo(0, runwayLength / 2 - 1);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();

      ctx.beginPath();
      ctx.arc(rx, rz, RUNWAY_MARKER_MIN, 0, Math.PI * 2);
      ctx.fill();
    }

    // Estela: se suma un punto solo si el avión se movió lo suficiente en
    // pantalla, para que a baja velocidad no se apilen puntos idénticos.
    const trail = trailRef.current;
    const last = trail[trail.length - 1];
    if (!last || Math.hypot((posX - last[0]) * scale, (posZ - last[1]) * scale) >= TRAIL_STEP_PX) {
      trail.push([posX, posZ]);
      if (trail.length > TRAIL_MAX) trail.shift();
    }
    ctx.lineCap = "round";
    ctx.lineWidth = 1.6;
    for (let i = 1; i < trail.length; i++) {
      const [x0, z0] = toMap(trail[i - 1][0], trail[i - 1][1]);
      const [x1, z1] = toMap(trail[i][0], trail[i][1]);
      ctx.strokeStyle = `rgba(77, 163, 255, ${(i / trail.length) * 0.55})`;
      ctx.beginPath();
      ctx.moveTo(x0, z0);
      ctx.lineTo(x1, z1);
      ctx.stroke();
    }

    // Avión (flecha con muesca apuntando al rumbo actual, con halo)
    const [px, pz] = toMap(posX, posZ);
    ctx.save();
    ctx.translate(px, pz);
    ctx.rotate((heading * Math.PI) / 180);
    ctx.shadowColor = "rgba(77, 163, 255, 0.9)";
    ctx.shadowBlur = 6;
    ctx.fillStyle = "#4da3ff";
    ctx.strokeStyle = "#e8f3ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.lineTo(4.5, 5.5);
    ctx.lineTo(0, 3);
    ctx.lineTo(-4.5, 5.5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
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

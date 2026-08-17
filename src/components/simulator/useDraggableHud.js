/**
 * useDraggableHud — arrastre táctil/mouse para un elemento flotante del HUD
 * (mini-mapa, barra de iconos, cuadro de instrumentos), para que el jugador
 * pueda apartarlo si le tapa la vista.
 *
 * Por debajo de DRAG_THRESHOLD px de movimiento el gesto se trata como un
 * click/tap normal (no se activa el arrastre) — así los botones dentro del
 * elemento arrastrable (pausa, cámara, sonido, ajustes) siguen funcionando
 * con un tap simple. La posición elegida se persiste en localStorage por
 * `storageKey` y se reajusta si la ventana cambia de tamaño (rotar el
 * móvil, redimensionar) para que el elemento no quede fuera de pantalla.
 *
 * Uso: spread `handlers` sobre el elemento raíz, asignar `ref`, y mezclar
 * `style` (solo tiene contenido una vez que el usuario arrastró al menos
 * una vez — antes de eso, la posición por defecto la da el CSS).
 */
import { useCallback, useEffect, useRef, useState } from "react";

const DRAG_THRESHOLD = 6; // px

function loadPosition(key) {
  try {
    const parsed = JSON.parse(localStorage.getItem(key));
    if (typeof parsed?.x === "number" && typeof parsed?.y === "number") return parsed;
  } catch {
    /* sin almacenamiento o valor corrupto: se usa la posición por defecto */
  }
  return null;
}

function savePosition(key, pos) {
  try {
    localStorage.setItem(key, JSON.stringify(pos));
  } catch {
    /* sin almacenamiento: la posición elegida no persiste entre sesiones */
  }
}

export function useDraggableHud(storageKey) {
  const ref = useRef(null);
  const [pos, setPos] = useState(() => loadPosition(storageKey));
  const drag = useRef(null);
  const lastPos = useRef(pos);
  const suppressClick = useRef(false);

  const clamp = useCallback((x, y) => {
    const rect = ref.current?.getBoundingClientRect();
    const w = rect?.width ?? 0;
    const h = rect?.height ?? 0;
    const maxX = Math.max(0, window.innerWidth - w);
    const maxY = Math.max(0, window.innerHeight - h);
    return { x: Math.min(Math.max(0, x), maxX), y: Math.min(Math.max(0, y), maxY) };
  }, []);

  // Si la ventana cambia de tamaño con una posición ya elegida, la reajusta
  // para que el elemento siga estando dentro de la pantalla visible.
  useEffect(() => {
    if (!pos) return;
    const onResize = () => setPos((p) => (p ? clamp(p.x, p.y) : p));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pos, clamp]);

  const onPointerDown = useCallback((event) => {
    if (event.button != null && event.button !== 0) return; // solo click izq / touch / pen
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    drag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: rect.left,
      originY: rect.top,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback(
    (event) => {
      const d = drag.current;
      if (!d || d.pointerId !== event.pointerId) return;
      const dx = event.clientX - d.startX;
      const dy = event.clientY - d.startY;
      if (!d.moved) {
        if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
        d.moved = true;
        ref.current?.setPointerCapture(event.pointerId);
      }
      event.preventDefault();
      const next = clamp(d.originX + dx, d.originY + dy);
      lastPos.current = next;
      setPos(next);
    },
    [clamp],
  );

  const endDrag = useCallback(
    (event) => {
      const d = drag.current;
      if (!d || d.pointerId !== event.pointerId) return;
      if (d.moved) {
        savePosition(storageKey, lastPos.current);
        // El mismo gesto de soltar dispara un "click" sintético justo
        // después: se marca para que el próximo click sobre este elemento
        // (el botón que se acababa de arrastrar) no ejecute su acción.
        suppressClick.current = true;
      }
      drag.current = null;
    },
    [storageKey],
  );

  const onClickCapture = useCallback((event) => {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }, []);

  // `right`/`bottom` explícitos en "auto": el CSS por defecto de estos
  // elementos ancla algunos por el borde opuesto (p. ej. el cuadro de
  // instrumentos usa `inset-block-end` porque nace centrado abajo). Si acá
  // solo se pisara `left`/`top`, ese anclaje opuesto seguiría activo y con
  // los dos bordes fijados a la vez (sin alto/ancho explícito) el navegador
  // ESTIRA la caja para cumplir ambos — el fondo del panel arrastrado
  // "crecía" en vez de moverse. Fijar los cuatro lados corta ese conflicto.
  const style = pos
    ? {
        position: "fixed",
        left: pos.x,
        top: pos.y,
        right: "auto",
        bottom: "auto",
        transform: "none",
      }
    : undefined;

  return {
    ref,
    style,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onClickCapture,
    },
  };
}

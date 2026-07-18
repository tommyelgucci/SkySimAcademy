/**
 * SimulatorView — orquesta motor de física + escena 3D + HUD + sesión de 5 min.
 *
 * Rendimiento: el game loop corre en requestAnimationFrame FUERA de React
 * (el estado de React solo se actualiza ~10 veces/segundo para el HUD),
 * así el render 3D nunca espera a un re-render de la interfaz.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Flag, PlaneTakeoff, TriangleAlert } from "lucide-react";
import * as THREE from "three";
import { FlightEngine } from "../../simulator/FlightEngine.js";
import { SceneManager } from "../../simulator/SceneManager.js";
import { KeyboardControls } from "../../simulator/KeyboardControls.js";
import Hud from "./Hud.jsx";

/** Duración máxima de una sesión de vuelo, en segundos. */
const SESSION_SECONDS = 5 * 60;
const HUD_INTERVAL = 0.1; // s entre actualizaciones del HUD

export default function SimulatorView({ onExit }) {
  const { t } = useTranslation("simulator");
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  /** 'briefing' → 'flying' → ('crashed' | 'timeUp') */
  const [phase, setPhase] = useState("briefing");
  const [hud, setHud] = useState(null);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (phase !== "flying") return;

    const engine = new FlightEngine();
    const scene = new SceneManager(canvasRef.current);
    const controls = new KeyboardControls();
    controls.attach();

    const clock = new THREE.Clock();
    let elapsed = 0;
    let hudTimer = 0;
    let frameId = 0;

    const resize = () => {
      const { clientWidth, clientHeight } = containerRef.current;
      scene.resize(clientWidth, clientHeight);
    };
    resize();
    window.addEventListener("resize", resize);

    const endSession = (finalPhase) => {
      setStats({
        maxAltitude: Math.round(engine.maxAltitude),
        distanceKm: (engine.distance / 1000).toFixed(1),
      });
      setPhase(finalPhase);
    };

    const loop = () => {
      const dt = clock.getDelta();
      elapsed += dt;

      engine.setInput(controls.getInput());
      engine.update(dt);
      scene.update(engine, dt);
      scene.render();

      hudTimer += dt;
      if (hudTimer >= HUD_INTERVAL) {
        hudTimer = 0;
        setHud({
          speed: Math.round(engine.airspeed),
          altitude: Math.round(engine.altitude),
          heading: Math.round(engine.heading),
          throttle: Math.round(engine.throttle * 100),
          timeLeft: Math.max(0, Math.ceil(SESSION_SECONDS - elapsed)),
          stalled: engine.stalled,
        });
      }

      if (engine.crashed) return endSession("crashed");
      if (elapsed >= SESSION_SECONDS) return endSession("timeUp");
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      controls.detach();
      scene.dispose();
    };
  }, [phase]);

  const restart = () => {
    setHud(null);
    setStats(null);
    setPhase("flying");
  };

  return (
    <div className="simulator" ref={containerRef}>
      <canvas ref={canvasRef} className="simulator__canvas" />

      {phase === "flying" && hud && <Hud hud={hud} />}

      {phase === "briefing" && (
        <Overlay
          title={t("briefing.title")}
          body={t("briefing.body")}
          actions={
            <>
              <button className="button button--primary" onClick={restart}>
                <PlaneTakeoff size={18} className="rtl-flip" aria-hidden="true" />{" "}
                {t("briefing.start")}
              </button>
              <button className="button button--ghost" onClick={onExit}>
                {t("exit")}
              </button>
            </>
          }
        >
          <ControlsHelp />
        </Overlay>
      )}

      {(phase === "crashed" || phase === "timeUp") && (
        <Overlay
          title={
            <>
              {phase === "crashed" ? (
                <TriangleAlert size={24} className="overlay-icon is-wrong" aria-hidden="true" />
              ) : (
                <Flag size={24} className="overlay-icon" aria-hidden="true" />
              )}{" "}
              {phase === "crashed" ? t("crash.title") : t("timeUp.title")}
            </>
          }
          body={phase === "crashed" ? t("crash.body") : t("timeUp.body")}
          actions={
            <>
              <button className="button button--primary" onClick={restart}>
                {t("restart")}
              </button>
              <button className="button button--ghost" onClick={onExit}>
                {t("exit")}
              </button>
            </>
          }
        >
          {stats && (
            <p className="simulator__stats">
              {t("stats.maxAltitude", { value: stats.maxAltitude })}
              {" · "}
              {t("stats.distance", { value: stats.distanceKm })}
            </p>
          )}
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ title, body, actions, children }) {
  return (
    <div className="simulator__overlay">
      <div className="simulator__panel">
        <h1>{title}</h1>
        <p>{body}</p>
        {children}
        <div className="simulator__panel-actions">{actions}</div>
      </div>
    </div>
  );
}

/** Tabla de controles, íntegramente traducida. */
function ControlsHelp() {
  const { t } = useTranslation("simulator");
  const rows = [
    { keys: "W / S", label: t("controls.pitch") },
    { keys: "A / D", label: t("controls.roll") },
    { keys: "Q / E", label: t("controls.yaw") },
    { keys: "Ctrl / Shift", label: t("controls.throttle") },
  ];
  return (
    <div className="controls-help">
      <h2>{t("controls.title")}</h2>
      <dl>
        {rows.map(({ keys, label }) => (
          <div key={keys} className="controls-help__row">
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

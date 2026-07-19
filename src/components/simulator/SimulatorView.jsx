/**
 * SimulatorView — orquesta motor de física + escena 3D + HUD + misiones.
 *
 * Flujo: selección de misión (briefing) → vuelo → fin por objetivo cumplido,
 * crash o límite de 5 minutos. Las misiones con `requiresModule` se
 * desbloquean al aprobar el quiz del módulo de teoría correspondiente.
 *
 * Rendimiento: el game loop corre en requestAnimationFrame FUERA de React
 * (el estado de React solo se actualiza ~10 veces/segundo para el HUD),
 * así el render 3D nunca espera a un re-render de la interfaz.
 */
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  CircleCheck,
  Flag,
  Lock,
  PlaneTakeoff,
  SwitchCamera,
  Target,
  TriangleAlert,
  Volume2,
  VolumeX,
} from "lucide-react";
import * as THREE from "three";
import { FlightEngine } from "../../simulator/FlightEngine.js";
import {
  SceneManager,
  SCENARIOS,
  TIMES_OF_DAY,
} from "../../simulator/SceneManager.js";
import { KeyboardControls } from "../../simulator/KeyboardControls.js";
import { MissionTracker } from "../../simulator/MissionTracker.js";
import { SoundEngine } from "../../simulator/SoundEngine.js";
import TouchControls, { hasCoarsePointer } from "./TouchControls.jsx";
import { MISSIONS } from "../../content/missions";
import {
  isMissionComplete,
  isModulePassed,
  recordMissionComplete,
} from "../../storage.js";
import { ContentIcon } from "../icons.jsx";
import Hud from "./Hud.jsx";

/** Duración máxima de una sesión de vuelo, en segundos. */
const SESSION_SECONDS = 5 * 60;
const HUD_INTERVAL = 0.1; // s entre actualizaciones del HUD
const SCENARIO_KEY = "aerolearn.scenario";
const TIME_KEY = "aerolearn.timeofday";
/** Fracción del radio del mapa a partir de la cual se avisa del límite. */
const BOUNDARY_WARN_RATIO = 0.8;

/** Preferencia persistida con lista de valores válidos. */
function loadPref(key, valid, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return valid.includes(saved) ? saved : fallback;
  } catch {
    return fallback;
  }
}
function savePref(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* sin almacenamiento: solo dura la sesión */
  }
}

export default function SimulatorView({ onExit }) {
  const { t } = useTranslation(["simulator", "theory"]);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  /** 'briefing' → 'flying' → ('crashed' | 'timeUp' | 'missionComplete') */
  const [phase, setPhase] = useState("briefing");
  const [mission, setMission] = useState(null);
  const [hud, setHud] = useState(null);
  const [stats, setStats] = useState(null);
  const [crashReason, setCrashReason] = useState(null);

  // Escenario y hora del día elegidos (persistentes entre sesiones)
  const [scenario, setScenario] = useState(() =>
    loadPref(SCENARIO_KEY, SCENARIOS, SCENARIOS[0])
  );
  const selectScenario = (id) => {
    setScenario(id);
    savePref(SCENARIO_KEY, id);
  };
  const [timeOfDay, setTimeOfDay] = useState(() =>
    loadPref(TIME_KEY, TIMES_OF_DAY, TIMES_OF_DAY[0])
  );
  const selectTimeOfDay = (id) => {
    setTimeOfDay(id);
    savePref(TIME_KEY, id);
  };

  // Vista de cámara (exterior/cabina); la escena viva se controla por ref
  const [cameraView, setCameraView] = useState("external");
  const sceneRef = useRef(null);
  const toggleCameraView = () => {
    setCameraView((view) => {
      const next = view === "external" ? "cockpit" : "external";
      sceneRef.current?.setCameraView(next);
      return next;
    });
  };

  // Entradas táctiles: el overlay escribe aquí y el loop las lee por frame
  const touchRef = useRef({ pitch: 0, roll: 0, yaw: 0, throttleTarget: null });
  const touchDevice = hasCoarsePointer();

  // Sonido sintetizado: una instancia por montaje del simulador
  const soundRef = useRef(null);
  if (!soundRef.current) soundRef.current = new SoundEngine();
  const [muted, setMuted] = useState(soundRef.current.muted);
  useEffect(() => () => soundRef.current?.dispose(), []);

  const toggleMuted = () => {
    const next = !soundRef.current.muted;
    soundRef.current.setMuted(next);
    setMuted(next);
  };

  useEffect(() => {
    if (phase !== "flying") return;

    const engine = new FlightEngine();
    const tracker = new MissionTracker(mission);
    const scene = new SceneManager(canvasRef.current, scenario, timeOfDay);
    sceneRef.current = scene;
    setCameraView("external");
    engine.setTerrain(scene.getTerrain()); // pistas + límite del mapa
    const controls = new KeyboardControls();
    controls.attach();

    // Tecla C: alternar vista exterior/cabina (además del botón)
    const onKeyDown = (event) => {
      if (event.code === "KeyC") toggleCameraView();
    };
    window.addEventListener("keydown", onKeyDown);

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
      if (finalPhase === "crashed") soundRef.current?.crash();
      if (finalPhase === "missionComplete") soundRef.current?.success();
      setCrashReason(engine.crashReason);
      setStats({
        maxAltitude: Math.round(engine.maxAltitude),
        distanceKm: (engine.distance / 1000).toFixed(1),
      });
      setPhase(finalPhase);
    };

    const clampAxis = (v) => Math.max(-1, Math.min(1, v));
    const loop = () => {
      const dt = clock.getDelta();
      elapsed += dt;

      // Fusionar teclado + táctil: los ejes se suman, los gases táctiles
      // (valor absoluto) tienen prioridad cuando el slider se ha usado
      const kb = controls.getInput();
      const tc = touchRef.current;
      engine.setInput({
        pitch: clampAxis(kb.pitch + tc.pitch),
        roll: clampAxis(kb.roll + tc.roll),
        yaw: clampAxis(kb.yaw + tc.yaw),
        throttle: kb.throttle,
        throttleTarget: tc.throttleTarget,
      });
      engine.update(dt);
      tracker.update(engine, dt);
      scene.update(engine, dt);
      scene.render();
      soundRef.current?.update(engine);

      hudTimer += dt;
      if (hudTimer >= HUD_INTERVAL) {
        hudTimer = 0;
        // Aviso de límite del mapa: cerca del borde, antes del accidente
        const mapRadius = engine.terrain?.mapRadius;
        const nearBoundary =
          mapRadius != null &&
          Math.hypot(engine.position.x, engine.position.z) >
            mapRadius * BOUNDARY_WARN_RATIO;
        setHud({
          speed: Math.round(engine.airspeed),
          altitude: Math.round(engine.altitude),
          heading: Math.round(engine.heading),
          throttle: Math.round(engine.throttle * 100),
          timeLeft: Math.max(0, Math.ceil(SESSION_SECONDS - elapsed)),
          stalled: engine.stalled,
          nearBoundary,
        });
      }

      if (engine.crashed) return endSession("crashed");
      if (tracker.done) {
        recordMissionComplete(mission.id);
        return endSession("missionComplete");
      }
      if (elapsed >= SESSION_SECONDS) return endSession("timeUp");
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", onKeyDown);
      controls.detach();
      scene.dispose();
      if (sceneRef.current === scene) sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, mission, scenario, timeOfDay]);

  const fly = (selectedMission) => {
    soundRef.current?.start(); // gesto del usuario: el AudioContext puede arrancar
    setMission(selectedMission);
    setHud(null);
    setStats(null);
    touchRef.current = { pitch: 0, roll: 0, yaw: 0, throttleTarget: null };
    setPhase("flying");
  };

  const backToMissions = () => {
    setHud(null);
    setStats(null);
    setPhase("briefing");
  };

  // Mensaje de crash según la causa (agua, límite del mapa, o impacto/alabeo)
  const crashKey =
    crashReason === "water" || crashReason === "bounds"
      ? `crash.${crashReason}`
      : "crash";

  const endOverlays = {
    crashed: {
      icon: <TriangleAlert size={24} className="overlay-icon is-wrong" aria-hidden="true" />,
      title: t(`${crashKey}.title`),
      body: t(`${crashKey}.body`),
    },
    timeUp: {
      icon: <Flag size={24} className="overlay-icon" aria-hidden="true" />,
      title: t("timeUp.title"),
      body: t("timeUp.body"),
    },
    missionComplete: {
      icon: <CircleCheck size={24} className="overlay-icon is-correct" aria-hidden="true" />,
      title: t("missions.success.title"),
      body: t("missions.success.body"),
    },
  };
  const ended = endOverlays[phase];

  return (
    <div className="simulator" ref={containerRef}>
      <canvas ref={canvasRef} className="simulator__canvas" />

      {phase === "flying" && hud && (
        <>
          <Hud hud={hud} />
          {mission?.goal && (
            <div className="hud-objective">
              <Target size={16} aria-hidden="true" />{" "}
              {t(`missions.${mission.id}.objective`)}
            </div>
          )}
          <button
            className="sound-toggle sound-toggle--camera"
            aria-label={cameraView === "external" ? t("view.cockpit") : t("view.external")}
            onClick={toggleCameraView}
          >
            <SwitchCamera size={20} aria-hidden="true" />
          </button>
          <button
            className="sound-toggle"
            aria-label={muted ? t("sound.unmute") : t("sound.mute")}
            onClick={toggleMuted}
          >
            {muted ? (
              <VolumeX size={20} aria-hidden="true" />
            ) : (
              <Volume2 size={20} aria-hidden="true" />
            )}
          </button>
          {touchDevice && <TouchControls inputRef={touchRef} />}
        </>
      )}

      {phase === "briefing" && (
        <div className="simulator__overlay">
          <div className="simulator__panel simulator__panel--wide">
            <h1>{t("briefing.title")}</h1>
            <p>{t("briefing.body")}</p>

            <h2 className="mission-list__heading">{t("scenarioTitle")}</h2>
            <div className="scenario-picker" role="radiogroup" aria-label={t("scenarioTitle")}>
              {SCENARIOS.map((id) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={scenario === id}
                  className={`scenario-chip ${scenario === id ? "scenario-chip--active" : ""}`}
                  onClick={() => selectScenario(id)}
                >
                  {t(`scenarios.${id}`)}
                </button>
              ))}
            </div>

            <h2 className="mission-list__heading">{t("timeTitle")}</h2>
            <div className="scenario-picker" role="radiogroup" aria-label={t("timeTitle")}>
              {TIMES_OF_DAY.map((id) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={timeOfDay === id}
                  className={`scenario-chip ${timeOfDay === id ? "scenario-chip--active" : ""}`}
                  onClick={() => selectTimeOfDay(id)}
                >
                  {t(`times.${id}`)}
                </button>
              ))}
            </div>

            <h2 className="mission-list__heading">{t("missions.title")}</h2>
            <div className="mission-list">
              {MISSIONS.map((m) => {
                const locked =
                  m.requiresModule && !isModulePassed(m.requiresModule);
                const done = isMissionComplete(m.id);
                return (
                  <button
                    key={m.id}
                    className={`mission-card ${locked ? "mission-card--locked" : ""}`}
                    disabled={locked}
                    onClick={() => fly(m)}
                  >
                    <span className="mission-card__icon">
                      {locked ? (
                        <Lock size={20} aria-hidden="true" />
                      ) : (
                        <ContentIcon name={m.icon} size={20} />
                      )}
                    </span>
                    <span className="mission-card__text">
                      <span className="mission-card__title">
                        {t(`missions.${m.id}.title`)}
                        {done && (
                          <CircleCheck
                            size={15}
                            className="mission-card__done"
                            aria-label={t("missions.completed")}
                          />
                        )}
                      </span>
                      <span className="mission-card__objective">
                        {locked
                          ? t("missions.locked", {
                              module: t(`theory:modules.${m.requiresModule}.title`),
                            })
                          : t(`missions.${m.id}.objective`)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <ControlsHelp />
            <div className="simulator__panel-actions">
              <button className="button button--ghost" onClick={onExit}>
                {t("exit")}
              </button>
            </div>
          </div>
        </div>
      )}

      {ended && (
        <Overlay
          title={
            <>
              {ended.icon} {ended.title}
            </>
          }
          body={ended.body}
          actions={
            <>
              <button className="button button--primary" onClick={() => fly(mission)}>
                <PlaneTakeoff size={18} className="rtl-flip" aria-hidden="true" />{" "}
                {t("restart")}
              </button>
              <button className="button button--secondary" onClick={backToMissions}>
                {t("missions.backToList")}
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

/** Tabla de controles, íntegramente traducida (versión táctil o teclado). */
function ControlsHelp() {
  const { t } = useTranslation("simulator");
  if (hasCoarsePointer()) {
    return (
      <div className="controls-help">
        <h2>{t("controls.title")}</h2>
        <p className="controls-help__touch">{t("controls.touch")}</p>
      </div>
    );
  }
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

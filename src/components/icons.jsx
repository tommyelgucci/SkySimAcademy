/**
 * Iconografía de la app — exclusivamente Lucide Icons (licencia ISC, open
 * source). Nada de emojis de sistema ni imágenes con copyright: los iconos
 * se compilan como SVG inline, sin peticiones a CDNs externos.
 *
 * `CONTENT_ICONS` traduce los nombres declarados en los datos de contenido
 * (módulos de teoría y misiones del simulador, campo `icon`) a componentes.
 * Así el contenido sigue siendo datos puros y agnósticos del renderer.
 */
import {
  CircleHelp,
  CloudSun,
  Compass,
  Gauge,
  Joystick,
  Map,
  PlaneLanding,
  PlaneTakeoff,
  RadioTower,
} from "lucide-react";

const CONTENT_ICONS = {
  "plane-takeoff": PlaneTakeoff,
  "plane-landing": PlaneLanding,
  gauge: Gauge,
  joystick: Joystick,
  compass: Compass,
  "cloud-sun": CloudSun,
  "radio-tower": RadioTower,
  map: Map,
};

/** Icono declarado en datos de contenido; CircleHelp como fallback visible. */
export function ContentIcon({ name, ...props }) {
  const Icon = CONTENT_ICONS[name] ?? CircleHelp;
  return <Icon aria-hidden="true" {...props} />;
}

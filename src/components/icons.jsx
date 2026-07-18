/**
 * Iconografía de la app — exclusivamente Lucide Icons (licencia ISC, open
 * source). Nada de emojis de sistema ni imágenes con copyright: los iconos
 * se compilan como SVG inline, sin peticiones a CDNs externos.
 *
 * `MODULE_ICONS` traduce los nombres declarados en los JSON de contenido
 * (src/content/modules/*.json, campo `icon`) a componentes. Así el contenido
 * sigue siendo datos puros y agnósticos del renderer.
 */
import { CircleHelp, Gauge, PlaneTakeoff } from "lucide-react";

const MODULE_ICONS = {
  "plane-takeoff": PlaneTakeoff,
  gauge: Gauge,
};

/** Icono de un módulo de teoría; CircleHelp como fallback visible en dev. */
export function ModuleIcon({ name, ...props }) {
  const Icon = MODULE_ICONS[name] ?? CircleHelp;
  return <Icon aria-hidden="true" {...props} />;
}

/**
 * ProgressBar — barra fina de avance del quiz. Es puramente decorativa
 * (`aria-hidden`): el avance ya se anuncia en texto ("Pregunta 3 de 8"),
 * así que un lector de pantalla no necesita oírlo dos veces.
 */
export default function ProgressBar({ current, total }) {
  const percent = total > 0 ? Math.min(100, (current / total) * 100) : 0;
  return (
    <div className="progress-bar" aria-hidden="true">
      <div className="progress-bar__fill" style={{ width: `${percent}%` }} />
    </div>
  );
}

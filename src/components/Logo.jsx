/**
 * Logo — marca propia de SkySimAcademy: libro de vuelo/bitácora con un
 * avión despegando, en dorado sobre azul noche. Diseño original propio
 * (SVG vectorial, sin dependencias externas) — misma política de cero
 * copyright que el resto de la iconografía, pero como marca distintiva
 * en lugar de un icono genérico de Lucide.
 */
export default function Logo({ size = 28, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 600 600"
      aria-hidden="true"
      {...props}
    >
      <defs>
        <linearGradient id="skysim-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F6D583" />
          <stop offset="100%" stopColor="#A9750F" />
        </linearGradient>
      </defs>
      <rect x="20" y="20" width="560" height="560" rx="120" fill="#0A1526" />
      <path
        d="M160,180 L400,180 L400,440 C400,440 280,470 160,440 Z"
        fill="none"
        stroke="url(#skysim-logo-gradient)"
        strokeWidth="8"
      />
      <line x1="195" y1="225" x2="330" y2="225" stroke="url(#skysim-logo-gradient)" strokeWidth="6" />
      <line x1="195" y1="257" x2="310" y2="257" stroke="url(#skysim-logo-gradient)" strokeWidth="6" />
      <line x1="195" y1="289" x2="330" y2="289" stroke="url(#skysim-logo-gradient)" strokeWidth="6" />
      <circle cx="220" cy="395" r="34" fill="url(#skysim-logo-gradient)" />
      <path
        d="M220,378 L226,393 L242,396 L226,399 L220,414 L214,399 L198,396 L214,393 Z"
        fill="#0A1526"
      />
      <line
        x1="400"
        y1="300"
        x2="330"
        y2="330"
        stroke="url(#skysim-logo-gradient)"
        strokeWidth="6"
        strokeDasharray="2,10"
        strokeLinecap="round"
      />
      <g transform="translate(440,255) rotate(-20)">
        <polygon points="0,0 -170,32 -135,0 -170,-32" fill="url(#skysim-logo-gradient)" />
      </g>
    </svg>
  );
}

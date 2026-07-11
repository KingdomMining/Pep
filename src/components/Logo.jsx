// ---------------------------------------------------------------------------
// <Logo /> — temporary wordmark for AEGIS Research. A clean sans wordmark over
// a red→violet spectrum underline (styled after the reference's bar), rendered
// as inline SVG so it's crisp, theme-aware, and needs no image asset.
// ---------------------------------------------------------------------------

export default function Logo({ className = '', showText = true, height = 30 }) {
  const w = showText ? 132 : 40;
  return (
    <svg
      className={className}
      width={(w / 44) * height}
      height={height}
      viewBox={`0 0 ${w} 44`}
      fill="none"
      role="img"
      aria-label="AEGIS Research"
    >
      <defs>
        <linearGradient id="aegis-spectrum" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff5a5f" />
          <stop offset="0.5" stopColor="#ff8a3d" />
          <stop offset="0.75" stopColor="#7c6cff" />
          <stop offset="1" stopColor="#3fd6c9" />
        </linearGradient>
        <linearGradient id="aegis-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3fd6c9" />
          <stop offset="1" stopColor="#2f9bff" />
        </linearGradient>
      </defs>

      {/* Æ monogram mark */}
      <rect x="0" y="6" width="34" height="34" rx="9" fill="url(#aegis-mark)" />
      <text
        x="17"
        y="30"
        textAnchor="middle"
        fontFamily="Inter, system-ui, sans-serif"
        fontWeight="800"
        fontSize="19"
        fill="#050608"
      >
        Æ
      </text>

      {showText && (
        <>
          <text
            x="44"
            y="26"
            fontFamily="Inter, system-ui, sans-serif"
            fontWeight="800"
            fontSize="18"
            letterSpacing="1.5"
            className="fill-content"
          >
            AEGIS
          </text>
          {/* spectrum underline bar with a subtle "barcode" tail */}
          <rect x="44" y="31" width="70" height="3" rx="1.5" fill="url(#aegis-spectrum)" />
          {[0, 4, 8, 13, 19, 26].map((dx, i) => (
            <rect
              key={i}
              x={116 + dx}
              y="31"
              width={i % 2 ? 1.4 : 2.2}
              height="3"
              rx="0.7"
              fill="url(#aegis-spectrum)"
              opacity={0.85 - i * 0.1}
            />
          ))}
        </>
      )}
    </svg>
  );
}

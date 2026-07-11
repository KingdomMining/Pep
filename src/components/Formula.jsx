// ---------------------------------------------------------------------------
// <Formula /> — renders a molecular formula with numeric subscripts
// (e.g. "C14H24N6O4·Cu" → C₁₄H₂₄N₆O₄·Cu). Charges (+ / -) stay superscript-ish
// inline. Non-formula placeholders like "—" render as-is.
// ---------------------------------------------------------------------------

export default function Formula({ value, className = '' }) {
  if (!value || value === '—') return <span className={className}>{value || '—'}</span>;
  // Split into letters/symbols vs digit runs.
  const parts = String(value).match(/([A-Za-z·().+\-]+|\d+)/g) || [value];
  return (
    <span className={className}>
      {parts.map((p, i) =>
        /^\d+$/.test(p) ? <sub key={i}>{p}</sub> : <span key={i}>{p}</span>
      )}
    </span>
  );
}

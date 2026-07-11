import { useMemo } from 'react';

// ---------------------------------------------------------------------------
// <Molecule2D /> — an ILLUSTRATIVE 2D structure schematic. It draws a
// deterministic peptide-backbone-style graph (zig-zag chain + side branches +
// ring motifs) seeded from the product id, tinted with the product color.
// It is decorative/for-identification framing only — not an accurate depiction
// of the actual chemical structure.
// ---------------------------------------------------------------------------

function seeded(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return () => {
    h += 0x6d2b79f5;
    let t = Math.imul(h ^ (h >>> 15), 1 | h);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export default function Molecule2D({ product, className = '' }) {
  const { nodes, bonds, rings } = useMemo(() => {
    const rand = seeded(product.id);
    const n = 6 + Math.floor(rand() * 4); // backbone length
    const nodes = [];
    const bonds = [];
    let x = 26;
    const midY = 90;
    for (let i = 0; i < n; i++) {
      const y = midY + (i % 2 ? -22 : 22);
      nodes.push({ x, y, kind: rand() > 0.7 ? 'hetero' : 'carbon' });
      if (i > 0) bonds.push([i - 1, i, rand() > 0.75 ? 2 : 1]);
      // occasional side branch
      if (rand() > 0.55) {
        const bx = x + (rand() > 0.5 ? 10 : -10);
        const by = y + (i % 2 ? 26 : -26);
        nodes.push({ x: bx, y: by, kind: rand() > 0.6 ? 'hetero' : 'carbon' });
        bonds.push([nodes.length - 2, nodes.length - 1, 1]);
      }
      x += 30;
    }
    // a ring motif near the start
    const rings = [];
    if (rand() > 0.3) rings.push({ cx: 40, cy: midY + 34, r: 13 });
    if (rand() > 0.6) rings.push({ cx: x - 30, cy: midY - 34, r: 12 });
    return { nodes, bonds, rings };
  }, [product.id]);

  const color = product.liquidColor || '#3fd6c9';
  const w = 26 + (Math.max(...nodes.map((p) => p.x)) || 300) + 26;

  return (
    <div className={className}>
      <svg
        viewBox={`0 0 ${w} 180`}
        width="100%"
        className="rounded-xl"
        role="img"
        aria-label={`Illustrative 2D structure of ${product.name}`}
      >
        <rect x="0" y="0" width={w} height="180" fill="transparent" />
        {rings.map((r, i) => (
          <circle
            key={'r' + i}
            cx={r.cx}
            cy={r.cy}
            r={r.r}
            fill="none"
            stroke={color}
            strokeOpacity="0.7"
            strokeWidth="2"
          />
        ))}
        {bonds.map(([a, b, order], i) => {
          const A = nodes[a];
          const B = nodes[b];
          return (
            <g key={'b' + i} stroke="currentColor" className="text-muted" strokeWidth="2">
              {order === 2 ? (
                <>
                  <line x1={A.x} y1={A.y - 2.5} x2={B.x} y2={B.y - 2.5} />
                  <line x1={A.x} y1={A.y + 2.5} x2={B.x} y2={B.y + 2.5} />
                </>
              ) : (
                <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} />
              )}
            </g>
          );
        })}
        {nodes.map((p, i) => (
          <circle
            key={'n' + i}
            cx={p.x}
            cy={p.y}
            r={p.kind === 'hetero' ? 5 : 3.5}
            fill={p.kind === 'hetero' ? color : 'currentColor'}
            className={p.kind === 'hetero' ? '' : 'text-content'}
          />
        ))}
      </svg>
      <p className="mt-2 text-center text-[11px] text-muted">
        Illustrative schematic · formula {product.props?.formula || '—'}
      </p>
    </div>
  );
}

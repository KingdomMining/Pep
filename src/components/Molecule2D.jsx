import { useMemo } from 'react';
import { getStructure } from '../data/structures.js';
import Formula from './Formula.jsx';

// ---------------------------------------------------------------------------
// <Molecule2D /> — the real 2D structure for a compound, rendered from an
// authoritative structure via OpenChemLib (see data/structures.js). Carbon
// bonds inherit the theme color; heteroatoms keep their standard colors. When
// no reliable single structure exists, a clear fallback is shown instead.
// ---------------------------------------------------------------------------

export default function Molecule2D({ product, className = '' }) {
  const struct = useMemo(() => getStructure(product.id), [product.id]);

  if (!struct) {
    const seq = product.props?.sequence;
    const isBlend = product.category === 'Peptide Blends';
    return (
      <div className={className}>
        <div className="grid min-h-[180px] place-items-center rounded-xl border border-dashed border-line/15 bg-content/[0.02] p-6 text-center">
          <div>
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="mx-auto text-muted">
              <circle cx="7" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="17" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <circle cx="12" cy="16" r="2.2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M8.8 9.2l2.4 5M15.2 9.2l-2.4 5M9 8h6" stroke="currentColor" strokeWidth="1.4" />
            </svg>
            <p className="mt-3 text-sm text-muted">
              {isBlend
                ? 'Multi-component blend — see individual components.'
                : 'A 2D structure is not shown for this preparation.'}
            </p>
            {seq && seq !== '—' && (
              <p className="mt-2 break-words text-xs text-muted/80">Sequence: {seq}</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div
        className="text-content [&_svg]:mx-auto [&_svg]:max-h-[220px] [&_svg]:w-full"
        // OpenChemLib output is self-contained SVG; carbon bonds use currentColor.
        dangerouslySetInnerHTML={{ __html: struct.svg }}
      />
      <p className="mt-2 text-center text-[11px] text-muted">
        <Formula value={struct.formula} /> · {struct.mw.toFixed(1)} g/mol
        {struct.note ? ` · ${struct.note}` : ''}
      </p>
    </div>
  );
}

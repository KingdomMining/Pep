import { CATEGORY_ACCENT } from '../data/products.js';

// Reusable compliance copy blocks. These strings are hard requirements and are
// intentionally centralized so the exact wording appears verbatim everywhere.

export const RUO_LINE =
  'For laboratory research use only. Not for human or animal consumption.';

export const FDA_LINE =
  'These statements have not been evaluated by the Food and Drug Administration. These products are not intended to diagnose, treat, cure, or prevent any disease.';

export const AGE_LINE = 'You must be 21+ and a qualified researcher.';

/** Small inline "Research Use Only" pill. */
export function RuoPill({ className = '' }) {
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-wideish text-slate-300 ' +
        className
      }
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent-teal" />
      Research use only
    </span>
  );
}

/** Category badge, accent-colored per research category. */
export function CategoryBadge({ category, className = '' }) {
  const color = CATEGORY_ACCENT[category] || '#94a3b8';
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wideish ' +
        className
      }
      style={{
        color,
        borderColor: `${color}55`,
        backgroundColor: `${color}12`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {category}
    </span>
  );
}

/** Full RUO + FDA disclaimer block for product pages and the footer. */
export function DisclaimerBlock({ className = '' }) {
  return (
    <div
      className={
        'rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs leading-relaxed text-slate-400 ' +
        className
      }
    >
      <p className="font-medium text-slate-300">{RUO_LINE}</p>
      <p className="mt-2">{FDA_LINE}</p>
    </div>
  );
}

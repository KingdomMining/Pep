// ---------------------------------------------------------------------------
// Product catalog (research use only).
//
// Copy here is deliberately factual and research-framed. There are NO
// therapeutic, performance, aesthetic, or benefit claims, and NO dosing or
// usage instructions anywhere — that is a hard compliance requirement.
//
// Descriptions and additional SKUs on the source catalog are gated behind
// account login; add them manually here once available. The shape below leaves
// room to expand (variants, specs, extra fields).
// ---------------------------------------------------------------------------

export const CATEGORIES = [
  'Peptides',
  'Peptide Blends',
  'Bioregulators',
  'Modulators',
  'Powders',
];

// Accent color keyed to each research category. Used for badges, ambient
// fields, and UI accenting so each category reads as visually distinct.
export const CATEGORY_ACCENT = {
  Peptides: '#3fd6c9', // cool teal / cyan
  'Peptide Blends': '#ffb14e', // contrasting warm (blend of currents)
  Bioregulators: '#ffb14e', // warm amber ripple
  Modulators: '#b57cff', // violet waveform
  Powders: '#cbd5e1', // muted white / silver
};

// A short, neutral, research-oriented one-liner per category. No claims.
export const CATEGORY_BLURB = {
  Peptides: 'Single-sequence research peptides.',
  'Peptide Blends': 'Multi-component research blends.',
  Bioregulators: 'Short-chain research bioregulator sequences.',
  Modulators: 'Research modulator compounds.',
  Powders: 'Lyophilized research powders.',
};

// Default spec block applied to every product unless overridden. Neutral,
// laboratory-facing attributes only.
const DEFAULT_SPEC = {
  purity: '≥ 98% (HPLC)',
  form: 'Lyophilized powder',
  storage: 'Store at -20°C, protect from light; reconstitute per lab protocol',
};

/**
 * Build a set of size/variant options from a min/max price range. This keeps
 * the seed data compact while giving the detail page a real variant selector.
 */
function variantsFromRange(min, max) {
  if (min === max) {
    return [{ size: '5 mg', price: min }];
  }
  const mid = Math.round((min + max) / 2);
  return [
    { size: '2 mg', price: min },
    { size: '5 mg', price: mid },
    { size: '10 mg', price: max },
  ];
}

// Raw seed catalog (real public catalog data provided with the build brief).
const seed = [
  {
    id: '3-ruo',
    name: '3-RUO',
    category: 'Peptides',
    priceMin: 38,
    priceMax: 190,
    liquidColor: '#3fd6c9',
    description:
      'Research peptide supplied as a lyophilized powder for in-vitro laboratory investigation. Handle per standard laboratory protocol.',
  },
  {
    id: 'ghk-cu',
    name: 'GHK-Cu',
    category: 'Bioregulators',
    priceMin: 26,
    priceMax: 42,
    liquidColor: '#2f9bff',
    description:
      'Copper-peptide research bioregulator supplied as a lyophilized powder. Intended for laboratory research characterization only.',
  },
  {
    id: 'bpc-157',
    name: 'BPC-157',
    category: 'Peptides',
    priceMin: 26,
    priceMax: 38,
    liquidColor: '#6ee7a8',
    description:
      'Synthetic research peptide supplied as a lyophilized powder for controlled in-vitro study. Not characterized for any in-vivo application.',
  },
  {
    id: 'mots-c',
    name: 'MOTS-c',
    category: 'Modulators',
    priceMin: 36,
    priceMax: 88,
    liquidColor: '#b57cff',
    description:
      'Mitochondrial-derived research peptide supplied as a lyophilized powder for laboratory research use.',
  },
  {
    id: 'bpc-tb',
    name: 'BPC-157 + TB-500 5mg/5mg',
    category: 'Peptide Blends',
    price: 48,
    liquidColor: '#ffb14e',
    description:
      'Two-component research blend supplied as a lyophilized powder for in-vitro laboratory investigation.',
  },
];

// Normalize the seed into a consistent shape the UI can rely on:
//   - always has priceMin / priceMax (single-price items collapse to equal)
//   - always has a variants array
//   - always has a spec block
export const products = seed.map((p) => {
  const priceMin = p.priceMin ?? p.price;
  const priceMax = p.priceMax ?? p.price;
  return {
    ...p,
    priceMin,
    priceMax,
    variants: p.variants ?? variantsFromRange(priceMin, priceMax),
    spec: { ...DEFAULT_SPEC, ...(p.spec ?? {}) },
  };
});

export function getProduct(id) {
  return products.find((p) => p.id === id);
}

/** Format a product's price as a single value or a range. */
export function formatPriceRange(product) {
  if (product.priceMin === product.priceMax) {
    return `$${product.priceMin}`;
  }
  return `$${product.priceMin} – $${product.priceMax}`;
}

export function formatUSD(value) {
  return `$${Number(value).toFixed(2)}`;
}

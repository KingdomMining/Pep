// ---------------------------------------------------------------------------
// Product catalog (research use only).
//
// Copy is deliberately factual and research-framed — NO therapeutic,
// performance, aesthetic, or benefit claims, and NO dosing/usage instructions.
//
// Pricing: base numbers reflect the reference catalog where known (the rest
// are placeholders). Every price is then marked up by PRICE_MULTIPLIER (+30%)
// in the normalizer, per request.
//
// Properties/CAS/formula are provided for identification/reference only; where
// a value isn't confirmed it is shown as "—".
// ---------------------------------------------------------------------------

const PRICE_MULTIPLIER = 1.3; // "+30%"

export const CATEGORIES = [
  'Peptides',
  'Peptide Blends',
  'Bioregulators',
  'Modulators',
  'Powders',
];

export const CATEGORY_ACCENT = {
  Peptides: '#3fd6c9',
  'Peptide Blends': '#ffb14e',
  Bioregulators: '#ffb14e',
  Modulators: '#b57cff',
  Powders: '#cbd5e1',
};

export const CATEGORY_BLURB = {
  Peptides: 'Single-sequence research peptides.',
  'Peptide Blends': 'Multi-component research blends.',
  Bioregulators: 'Short-chain research bioregulator sequences.',
  Modulators: 'Research modulator compounds.',
  Powders: 'Lyophilized research powders and reconstitution supplies.',
};

const DEFAULT_SPEC = {
  purity: '≥ 98% (HPLC)',
  form: 'Lyophilized powder',
  storage: 'Store at -20°C, protect from light; reconstitute per lab protocol',
};

// Neutral physical/reference properties applied unless a product overrides.
const DEFAULT_PROPS = {
  cas: '—',
  formula: '—',
  molarMass: '—',
  sequence: '—',
  appearance: 'White to off-white lyophilized powder',
  solubility: 'Soluble in bacteriostatic or sterile water',
  purity: '≥ 98% (HPLC)',
  storage: '-20°C, protect from light',
};

// Known reference properties keyed by product id (identification only).
const PROPS = {
  '3-ruo': { cas: '2409584-19-0', formula: 'C46H60N14O11', molarMass: '985.1 g/mol' },
  'ghk-cu': { cas: '89030-95-5', formula: 'C14H24N6O4·Cu', molarMass: '403.9 g/mol', sequence: 'Gly-His-Lys · Cu(II)' },
  'bpc-157': { cas: '137525-51-0', formula: 'C62H98N16O22', molarMass: '1419.5 g/mol', sequence: 'Gly-Glu-Pro-Pro-Pro-Gly-Lys-Pro-Ala-Asp-Asp-Ala-Gly-Leu-Val' },
  'mots-c': { cas: '1627580-64-6', formula: 'C101H152N28O22S2', molarMass: '2174.5 g/mol', sequence: 'Met-Arg-Trp-Gln-Glu-Met-Gly-Tyr-Ile-Phe-Tyr-Pro-Arg-Lys-Leu-Arg' },
  'tb-500': { cas: '77591-33-4', formula: 'C212H350N56O78S', molarMass: '4963.4 g/mol', sequence: 'Ac-SDKP (Thymosin β4 fragment)' },
  ipamorelin: { cas: '170851-70-4', formula: 'C38H49N9O5', molarMass: '711.9 g/mol', sequence: 'Aib-His-D-2-Nal-D-Phe-Lys-NH2' },
  'cjc-1295': { cas: '863288-34-0', formula: 'C165H269N51O49', molarMass: '3647.2 g/mol' },
  semax: { cas: '80714-61-0', formula: 'C37H51N9O10S', molarMass: '813.9 g/mol', sequence: 'Met-Glu-His-Phe-Pro-Gly-Pro' },
  selank: { cas: '129954-34-3', formula: 'C33H57N11O9', molarMass: '751.9 g/mol', sequence: 'Thr-Lys-Pro-Arg-Pro-Gly-Pro' },
  epithalon: { cas: '307297-39-8', formula: 'C14H22N4O9', molarMass: '390.3 g/mol', sequence: 'Ala-Glu-Asp-Gly' },
  'nad-plus': { cas: '53-84-9', formula: 'C21H27N7O14P2', molarMass: '663.4 g/mol', appearance: 'White crystalline powder' },
  '5-amino-1mq': { cas: '42464-96-0', formula: 'C10H12N2', molarMass: '160.2 g/mol', appearance: 'Off-white to pale powder' },
  retatrutide: { cas: '2381089-83-2', formula: 'C221H342N46O68', molarMass: '4731.3 g/mol' },
  'bac-water': { cas: '7732-18-5', formula: 'H₂O + 0.9% benzyl alcohol', molarMass: '18.02 g/mol', appearance: 'Clear sterile solution', solubility: 'Miscible; used to reconstitute lyophilized material', storage: 'Room temperature, protect from light' },
};

function variantsFromRange(min, max) {
  if (min === max) return [{ size: '5 mg', price: min }];
  const mid = Math.round((min + max) / 2);
  return [
    { size: '2 mg', price: min },
    { size: '5 mg', price: mid },
    { size: '10 mg', price: max },
  ];
}

// Raw seed catalog. `popular: true` marks the featured "Popular" tab items.
const seed = [
  { id: '3-ruo', name: '3-RUO', category: 'Peptides', priceMin: 38, priceMax: 190, liquidColor: '#3fd6c9', popular: true,
    description: 'Research peptide supplied as a lyophilized powder for in-vitro laboratory investigation. Handle per standard laboratory protocol.' },
  { id: 'ghk-cu', name: 'GHK-Cu', category: 'Bioregulators', priceMin: 26, priceMax: 42, liquidColor: '#2f9bff', popular: true,
    description: 'Copper-peptide research bioregulator supplied as a lyophilized powder. Intended for laboratory research characterization only.' },
  { id: 'bpc-157', name: 'BPC-157', category: 'Peptides', priceMin: 26, priceMax: 38, liquidColor: '#6ee7a8', popular: true,
    description: 'Synthetic research peptide supplied as a lyophilized powder for controlled in-vitro study. Not characterized for any in-vivo application.' },
  { id: 'mots-c', name: 'MOTS-c', category: 'Modulators', priceMin: 36, priceMax: 88, liquidColor: '#b57cff', popular: true,
    description: 'Mitochondrial-derived research peptide supplied as a lyophilized powder for laboratory research use.' },
  { id: 'bpc-tb', name: 'BPC-157 + TB-500 5mg/5mg', category: 'Peptide Blends', price: 48, liquidColor: '#ffb14e', popular: true,
    description: 'Two-component research blend supplied as a lyophilized powder for in-vitro laboratory investigation.' },
  { id: 'retatrutide', name: 'Retatrutide', category: 'Modulators', priceMin: 64, priceMax: 190, liquidColor: '#c58cff', popular: true,
    description: 'Synthetic research peptide supplied as a lyophilized powder for in-vitro laboratory investigation only.' },

  // Peptides
  { id: 'tb-500', name: 'TB-500', category: 'Peptides', priceMin: 30, priceMax: 120, liquidColor: '#5ad1ff' },
  { id: 'ipamorelin', name: 'Ipamorelin', category: 'Peptides', priceMin: 28, priceMax: 62, liquidColor: '#7ee0c0' },
  { id: 'cjc-1295', name: 'CJC-1295', category: 'Peptides', priceMin: 32, priceMax: 130, liquidColor: '#49c2ff' },
  { id: 'semax', name: 'Semax', category: 'Peptides', priceMin: 34, priceMax: 92, liquidColor: '#8be27a' },
  { id: 'selank', name: 'Selank', category: 'Peptides', priceMin: 34, priceMax: 92, liquidColor: '#a7e06b' },
  { id: 'aod-9604', name: 'AOD-9604', category: 'Peptides', priceMin: 30, priceMax: 78, liquidColor: '#6fe3d1' },
  { id: 'thymosin-a1', name: 'Thymosin Alpha-1', category: 'Peptides', priceMin: 40, priceMax: 150, liquidColor: '#4dd6b0' },
  { id: 'ghrp-6', name: 'GHRP-6', category: 'Peptides', priceMin: 26, priceMax: 70, liquidColor: '#57e0a8' },

  // Peptide Blends
  { id: 'glow-blend', name: 'GHK-Cu + BPC-157 + TB-500', category: 'Peptide Blends', price: 62, liquidColor: '#ff9f68' },
  { id: 'cjc-ipa', name: 'CJC-1295 + Ipamorelin', category: 'Peptide Blends', price: 54, liquidColor: '#66d0ff' },

  // Bioregulators
  { id: 'epithalon', name: 'Epithalon', category: 'Bioregulators', priceMin: 30, priceMax: 70, liquidColor: '#ffcf6b' },
  { id: 'thymalin', name: 'Thymalin', category: 'Bioregulators', priceMin: 34, priceMax: 80, liquidColor: '#ffbf5e' },

  // Modulators
  { id: 'ss-31', name: 'SS-31', category: 'Modulators', priceMin: 40, priceMax: 110, liquidColor: '#c58cff' },
  { id: 'humanin', name: 'Humanin', category: 'Modulators', priceMin: 38, priceMax: 96, liquidColor: '#a97cff' },

  // Powders & supplies
  { id: '5-amino-1mq', name: '5-Amino-1MQ', category: 'Powders', priceMin: 40, priceMax: 95, liquidColor: '#dfe6ee' },
  { id: 'nad-plus', name: 'NAD+', category: 'Powders', priceMin: 45, priceMax: 120, liquidColor: '#e8eef6' },
  { id: 'bac-water', name: 'Bacteriostatic Water', category: 'Powders', price: 12, liquidColor: '#cfe8ff',
    description: 'Sterile bacteriostatic water for reconstitution of lyophilized research material. Laboratory use only.' },
];

const markup = (n) => Math.round(n * PRICE_MULTIPLIER);

export const products = seed.map((p) => {
  const rawMin = p.priceMin ?? p.price;
  const rawMax = p.priceMax ?? p.price;
  const priceMin = markup(rawMin);
  const priceMax = markup(rawMax);
  const variants = (p.variants ?? variantsFromRange(rawMin, rawMax)).map((v) => ({
    ...v,
    price: markup(v.price),
  }));
  return {
    ...p,
    priceMin,
    priceMax,
    variants,
    popular: !!p.popular,
    description:
      p.description ??
      `${CATEGORY_BLURB[p.category] || 'Research reference material.'} Supplied as a lyophilized powder for in-vitro laboratory research use.`,
    spec: { ...DEFAULT_SPEC, ...(p.spec ?? {}) },
    props: { ...DEFAULT_PROPS, ...(PROPS[p.id] ?? {}) },
  };
});

export function getProduct(id) {
  return products.find((p) => p.id === id);
}

export const popularProducts = products.filter((p) => p.popular);

/** Products in the same category (excluding the given one), for "Related". */
export function relatedProducts(product, limit = 4) {
  return products
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, limit);
}

export function formatPriceRange(product) {
  if (product.priceMin === product.priceMax) return `$${product.priceMin}`;
  return `$${product.priceMin} – $${product.priceMax}`;
}

export function formatUSD(value) {
  return `$${Number(value).toFixed(2)}`;
}

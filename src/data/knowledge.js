// ---------------------------------------------------------------------------
// Local knowledge base for the peptide research assistant.
//
// This is NOT a live LLM — it answers from baked-in, research-framed facts.
// Hard rule: it must never provide dosing, administration, human/animal-use,
// or health/benefit information. Any such request is redirected to the
// research-use-only disclaimer.
// ---------------------------------------------------------------------------

// Neutral, identity-level notes per compound (class/what it is — no effects).
export const NOTES = {
  '3-ruo': 'a synthetic research peptide supplied as a lyophilized powder.',
  'ghk-cu': 'a copper-binding tripeptide (glycyl-L-histidyl-L-lysine) complexed with copper(II).',
  'bpc-157': 'a synthetic 15-amino-acid research peptide (a pentadecapeptide).',
  'mots-c': 'a 16-amino-acid mitochondrial-derived research peptide.',
  'bpc-tb': 'a two-component research blend of BPC-157 and TB-500.',
  retatrutide: 'a synthetic multi-receptor research peptide supplied as a lyophilized powder.',
  'tb-500': 'a synthetic fragment related to the protein Thymosin β4.',
  ipamorelin: 'a synthetic pentapeptide research compound.',
  'cjc-1295': 'a synthetic research peptide analog.',
  semax: 'a synthetic heptapeptide research compound.',
  selank: 'a synthetic heptapeptide research compound.',
  'aod-9604': 'a synthetic peptide fragment research compound.',
  'thymosin-a1': 'a synthetic 28-amino-acid research peptide.',
  'ghrp-6': 'a synthetic hexapeptide research compound.',
  epithalon: 'a synthetic tetrapeptide (Ala-Glu-Asp-Gly) research bioregulator.',
  thymalin: 'a peptide research bioregulator preparation.',
  'ss-31': 'a synthetic mitochondria-targeted research tetrapeptide.',
  humanin: 'a small mitochondrial-derived research peptide.',
  '5-amino-1mq': 'a small-molecule research compound supplied as a powder.',
  'nad-plus': 'nicotinamide adenine dinucleotide, supplied as a research powder.',
  'bac-water': 'sterile bacteriostatic water used to reconstitute lyophilized research material.',
  'glow-blend': 'a research blend of GHK-Cu, BPC-157, and TB-500.',
  'cjc-ipa': 'a research blend of CJC-1295 and Ipamorelin.',
};

const RUO_LINE =
  'For laboratory research use only — not for human or animal consumption. I can only share identity, handling, storage, and verification information.';

// Requests we must NOT answer (dosing / human use / health claims).
const BLOCKED = /\b(dose|dosage|dosing|how much|how many|inject|injection|administer|take it|take this|use it|usage|cycle|protocol|mg\s*(per|\/)|per day|reconstitut\w*\s+for\s+(me|use)|human|body|muscle|fat loss|weight loss|bodybuild|anti[-\s]?ag|heal|cure|treat|therapy|therapeutic|benefit|side effect|safe to (use|take)|is it safe|results|gains)\b/i;

const GREET = /\b(hi|hello|hey|yo|good (morning|afternoon|evening))\b/i;

// General FAQ (checked before product lookup).
const FAQ = [
  {
    test: /\bwhat (is|are)\b.*\bpeptide/i,
    answer:
      'A peptide is a short chain of amino acids linked by peptide bonds. Everything in this catalog is supplied as reference material for in-vitro laboratory research. ' +
      RUO_LINE,
  },
  {
    test: /\b(coa|certificate|lab (test|result)|tested|purity|third[-\s]?party|verif)/i,
    answer:
      'Every lot is third-party tested. On each product page you can open the Certificate of Analysis — it reports chromatographic purity (HPLC-UV/VIS), quantity, endotoxins (LAL) and sterility (USP <71>), with historical and full reports plus a downloadable copy.',
  },
  {
    test: /\b(sds|safety data|hazard)/i,
    answer:
      'Each product page has a Safety Data Sheet you can view or download, covering identification, handling, storage, and disposal for laboratory use.',
  },
  {
    test: /\b(store|storage|keep|fridge|freezer|temperature)/i,
    answer:
      'Lyophilized research material is typically stored at -20°C, protected from light. Exact storage is listed in each product’s Properties and Specifications. ' +
      RUO_LINE,
  },
  {
    test: /\b(bac\s*water|bacteriostatic|reconstitut|diluent|sterile water)/i,
    answer:
      'Bacteriostatic water is a sterile diluent used to reconstitute lyophilized material for laboratory work. We carry it under Powders & supplies. I can’t provide preparation amounts — those are determined by your lab protocol.',
  },
  {
    test: /\b(ship|shipping|deliver|order|payment|checkout|cost)/i,
    answer:
      'Shipping options (Standard, Express, Premium) and payment methods are shown at checkout. Prices are listed per product with size options.',
  },
  {
    test: /\b(structure|formula|molecular|molar mass|cas|sequence)/i,
    answer:
      'Each product page has a Properties panel (CAS number, molecular formula, molar mass, sequence where applicable) and an illustrative 2D structure, for identification and reference.',
  },
];

function findProduct(query, products) {
  const q = query.toLowerCase();
  // Prefer the longest matching name so "BPC-157 + TB-500" beats "BPC-157".
  let best = null;
  for (const p of products) {
    const name = p.name.toLowerCase();
    const idHit = q.includes(p.id.replace(/-/g, ' ')) || q.includes(p.id);
    const nameHit = q.includes(name) || name.split(/[\s+]+/).every((w) => w.length > 2 && q.includes(w));
    if (idHit || nameHit) {
      if (!best || p.name.length > best.name.length) best = p;
    }
  }
  return best;
}

/**
 * Produce an assistant reply. Returns { text, productId? }.
 */
export function answer(query, products) {
  const text = (query || '').trim();
  if (!text) return { text: 'Ask me about any compound in the catalog — its class, form, storage, or verification.' };

  if (BLOCKED.test(text)) {
    return {
      text:
        'I can’t help with dosing, administration, or any human/animal use — these products are for laboratory research only. ' +
        'I’m happy to share what a compound is, its properties, storage/handling, or its Certificate of Analysis.',
    };
  }

  if (GREET.test(text) && text.length < 24) {
    return {
      text:
        'Hi — I’m the AEGIS research assistant. Ask me what a compound is, its properties/CAS, storage, or how verification works. ' +
        RUO_LINE,
    };
  }

  const product = findProduct(text, products);
  if (product) {
    const note = NOTES[product.id];
    const parts = [];
    parts.push(`${product.name} is ${note || 'a research compound supplied as a lyophilized powder.'}`);
    if (product.props?.cas && product.props.cas !== '—')
      parts.push(`CAS ${product.props.cas}${product.props.formula && product.props.formula !== '—' ? `, ${product.props.formula}` : ''}.`);
    parts.push(`Category: ${product.category}. Form: ${product.spec.form}. Storage: ${product.spec.storage}.`);
    parts.push('You can open its Certificate of Analysis and SDS on the product page. ' + RUO_LINE);
    return { text: parts.join(' '), productId: product.id };
  }

  for (const f of FAQ) if (f.test.test(text)) return { text: f.answer };

  return {
    text:
      'I can share a compound’s identity, properties, storage, and verification. Try a name (e.g. “BPC-157”, “GHK-Cu”, “MOTS-c”) or ask about the Certificate of Analysis or SDS. ' +
      RUO_LINE,
  };
}

export const SUGGESTIONS = ['What is BPC-157?', 'GHK-Cu properties', 'How is purity verified?', 'What is bac water?'];

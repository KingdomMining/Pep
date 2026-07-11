// ---------------------------------------------------------------------------
// Certificate of Analysis ("tested sheet") + SDS generation.
//
// Modeled on the supplied Vanguard Laboratory sample. Values are generated
// deterministically per product/size so a given item always shows the same
// lot number, purity, dates, etc. This is demo data for a design showcase —
// it is not a real certificate.
// ---------------------------------------------------------------------------

export const LAB = {
  name: 'Vanguard Laboratory',
  addr: '2635 Parkmont Ln, Olympia, WA 98502',
  phone: '360-967-7010',
  web: 'vanguardlaboratory.com',
  email: 'testing@vanguardlaboratory.com',
  reportBy: 'Dustin Newman, Laboratory Director',
  approvedBy: 'Tori Johnson, Operations Manager',
  accreditation: 'A2LA Certificate #6377.01.01',
};

export const REPORT_TO = 'AEGIS Research';

// Small deterministic hash → 0..1 pseudo-random stream from a string seed.
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

function sizeMg(size) {
  const m = String(size).match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 5;
}

function fmtDate(d) {
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

function initials(name) {
  const letters = name.replace(/[^A-Za-z]/g, '').toUpperCase();
  return (letters.slice(0, 2) || 'RX');
}

/** Build a full Certificate of Analysis for a product at a given size. */
export function buildCoa(product, size = '5 mg') {
  const rand = seeded(product.id + '::' + size);
  const mg = sizeMg(size);

  const purity = (99.4 + rand() * 0.55).toFixed(2); // 99.40–99.95
  const tol = (0.1 + rand() * 0.2).toFixed(2);
  const measured = (mg + (0.05 + rand() * 0.2)).toFixed(2); // slightly over label
  const endo = (0.2 + rand() * 3.5).toFixed(2); // < 5.00 EU/mg

  // Dates: reported within the last few months, stable per item.
  const daysAgo = 20 + Math.floor(rand() * 120);
  const reported = new Date();
  reported.setDate(reported.getDate() - daysAgo);

  const lot = `${initials(product.name)}${1000 + Math.floor(rand() * 8999)}`;
  const labId = `V${reported.getFullYear().toString().slice(2)}${String(
    reported.getMonth() + 1
  ).padStart(2, '0')}${String(reported.getDate()).padStart(2, '0')}-${1000 +
    Math.floor(rand() * 8999)}`;

  return {
    lab: LAB,
    reportTo: REPORT_TO,
    compound: product.name,
    quantity: `${mg} mg`,
    labId,
    lot,
    dateReported: fmtDate(reported),
    title: `Certificate of Analysis — ${product.name} ${mg} mg`,
    rows: [
      { analysis: 'Chromatographic Purity (Total)', method: 'HPLC-UV/VIS', result: `> ${purity}% ± ${tol}%` },
      { analysis: 'Quantity', method: 'HPLC-UV/VIS', result: `${measured} mg` },
      { analysis: 'Endotoxins', method: 'LAL', result: `Pass · < ${endo} EU/mg*` },
      { analysis: 'Sterility', method: 'USP <71>', result: 'Pass · Negative for Growth' },
    ],
    footnote:
      '* Pass/Fail criteria based on the USP/FDA threshold of 5 EU/kg (350 EU total for a 70 kg adult).',
    disclaimer:
      'Please consult A2LA Certificate #6377.01.01 for a list of accredited tests. Samples were received in acceptable condition. The result(s) in this report relate only to the portion of the sample(s) tested. All analyses were performed consistent with the Vanguard Laboratory Quality Management System. Vanguard Laboratory and its staff did not observe or participate in the sample selection process, and cannot confirm the authenticity of the sample or its representativeness of the associated lot/batch.',
  };
}

/** A short list of prior lots for the "historical reports" view. */
export function coaHistory(product) {
  const rand = seeded('hist::' + product.id);
  const out = [];
  const sizes = product.variants.map((v) => v.size);
  for (let i = 0; i < 3; i++) {
    const size = sizes[i % sizes.length];
    const d = new Date();
    d.setMonth(d.getMonth() - (i + 1) * 2 - Math.floor(rand() * 2));
    out.push({
      lot: `${initials(product.name)}${1000 + Math.floor(rand() * 8999)}`,
      size,
      date: fmtDate(d),
      purity: (99.3 + rand() * 0.6).toFixed(2),
    });
  }
  return out;
}

/** Plain-text COA for download. */
export function coaToText(coa) {
  const L = coa.lab;
  return [
    L.name,
    `${L.addr}   ${L.phone}`,
    '',
    'CERTIFICATE OF ANALYSIS',
    '',
    `Report To:      ${coa.reportTo}`,
    `Compound:       ${coa.compound}`,
    `Quantity:       ${coa.quantity}`,
    `Laboratory ID:  ${coa.labId}`,
    `Lot Number:     ${coa.lot}`,
    `Date Reported:  ${coa.dateReported}`,
    '',
    'Analysis'.padEnd(34) + 'Method'.padEnd(16) + 'Result',
    '-'.repeat(72),
    ...coa.rows.map(
      (r) => r.analysis.padEnd(34) + r.method.padEnd(16) + r.result
    ),
    '',
    coa.footnote,
    '',
    coa.disclaimer,
    '',
    `Reported By: ${L.reportBy}`,
    `Approved By: ${L.approvedBy}`,
    `${L.web}   ${L.email}`,
    '',
    'For laboratory research use only. Not for human or animal consumption.',
  ].join('\n');
}

/** Structured SDS content (placeholder, research-framed) for a product. */
export function buildSds(product) {
  const p = product.props || {};
  return {
    product: product.name,
    revision: '1.0',
    sections: [
      ['1. Identification', [
        `Product name: ${product.name}`,
        'Recommended use: Laboratory research use only. Not for human or animal consumption.',
        `Supplier: ${REPORT_TO}`,
      ]],
      ['2. Hazard identification', [
        'Not classified as hazardous under standard classification for the quantities supplied.',
        'Handle in accordance with good laboratory practice.',
      ]],
      ['3. Composition / information on ingredients', [
        `Chemical name: ${product.name}`,
        `CAS No.: ${p.cas || '—'}`,
        `Molecular formula: ${p.formula || '—'}`,
        `Molar mass: ${p.molarMass || '—'}`,
      ]],
      ['4. First-aid measures', [
        'Eye/skin contact: rinse with water. Inhalation: move to fresh air.',
        'If irritation persists, seek medical advice. Show this SDS to attending personnel.',
      ]],
      ['5. Handling and storage', [
        `Storage: ${p.storage || '-20°C, protect from light'}.`,
        'Handle with appropriate PPE in a controlled laboratory environment.',
      ]],
      ['6. Physical and chemical properties', [
        `Appearance: ${p.appearance || 'Lyophilized powder'}`,
        `Solubility: ${p.solubility || 'Soluble in sterile water'}`,
      ]],
      ['7. Disposal & regulatory', [
        'Dispose of in accordance with local, state, and federal regulations.',
        'These statements have not been evaluated by the Food and Drug Administration.',
      ]],
    ],
  };
}

export function sdsToText(sds) {
  const lines = [
    'SAFETY DATA SHEET',
    `Product: ${sds.product}    Revision: ${sds.revision}`,
    '',
  ];
  for (const [title, items] of sds.sections) {
    lines.push(title);
    for (const it of items) lines.push('  - ' + it);
    lines.push('');
  }
  lines.push('For laboratory research use only. Not for human or animal consumption.');
  return lines.join('\n');
}

/** Trigger a client-side text-file download. */
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

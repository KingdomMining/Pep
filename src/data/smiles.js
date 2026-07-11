// ---------------------------------------------------------------------------
// SMILES definitions (pure data — no chemistry library imported here).
//
// Peptides are generated from their amino-acid sequence with a residue-fragment
// builder validated so the resulting molecular weights match published values.
// Small molecules use authoritative SMILES. Consumed at build time by
// scripts/gen-structures.mjs to pre-render 2D structures + formulas.
// ---------------------------------------------------------------------------

const SIDE = {
  A: 'C',
  R: 'CCCNC(N)=N',
  N: 'CC(N)=O',
  D: 'CC(O)=O',
  C: 'CS',
  E: 'CCC(O)=O',
  Q: 'CCC(N)=O',
  H: 'Cc1cnc[nH]1',
  I: 'C(C)CC',
  L: 'CC(C)C',
  K: 'CCCCN',
  M: 'CCSC',
  F: 'Cc1ccccc1',
  S: 'CO',
  T: 'C(O)C',
  W: 'Cc1c[nH]c2ccccc12',
  Y: 'Cc1ccc(O)cc1',
  V: 'C(C)C',
  '2Nal': 'Cc1ccc2ccccc2c1',
  Dmt: 'Cc1c(C)cc(O)cc1C',
};

function residue(tok) {
  let code = tok;
  let d = false;
  if (tok.endsWith('-D')) {
    d = true;
    code = tok.slice(0, -2);
  }
  if (code === 'G') return 'NCC(=O)';
  if (code === 'Aib') return 'NC(C)(C)C(=O)';
  if (code === 'P') return d ? 'N1CCC[C@H]1C(=O)' : 'N1CCC[C@@H]1C(=O)';
  const st = d ? '[C@H]' : '[C@@H]';
  return `N${st}(${SIDE[code]})C(=O)`;
}

function peptide(tokens, amide = false) {
  const arr = Array.isArray(tokens) ? tokens : tokens.split('');
  return arr.map(residue).join('') + (amide ? 'N' : 'O');
}

export const SMILES = {
  'bpc-157': peptide('GEPPPGKPADDAGLV'),
  'ghk-cu': peptide('GHK'),
  'mots-c': peptide('MRWQEMGYIFYPRKLR'),
  semax: peptide('MEHFPGP'),
  selank: peptide('TKPRPGP'),
  epithalon: peptide('AEDG'),
  'ghrp-6': peptide(['H', 'W-D', 'A', 'W', 'F-D', 'K'], true),
  ipamorelin: peptide(['Aib', 'H', '2Nal-D', 'F-D', 'K'], true),
  'ss-31': peptide(['R-D', 'Dmt', 'K', 'F'], true),
  humanin: peptide('MAPRGFSCLLLLTSEIDLPVKRRA'),
  'nad-plus':
    'NC(=O)c1ccc[n+](c1)[C@@H]1O[C@H](COP([O-])(=O)OP(O)(=O)OC[C@H]2O[C@@H](n3cnc4c(N)ncnc43)[C@H](O)[C@@H]2O)[C@@H](O)[C@H]1O',
  '5-amino-1mq': 'C[n+]1cccc2c(N)cccc12',
  'bac-water': 'O',
};

export const STRUCT_NOTE = {
  'ghk-cu': 'Shown: GHK tripeptide ligand; supplied as the copper(II) complex.',
  '5-amino-1mq': 'Shown: 5-amino-1-methylquinolinium cation.',
  'bac-water': 'Sterile water for reconstitution (0.9% benzyl alcohol).',
};

import { STRUCTURES } from './structures.generated.js';

// ---------------------------------------------------------------------------
// Browser-facing accessor for pre-rendered 2D structures.
//
// The actual depictions are generated at build time by
// scripts/gen-structures.mjs (OpenChemLib) and baked into
// structures.generated.js as static SVG strings — so no chemistry library is
// shipped to the browser. Each entry: { svg, formula, mw, note }.
//
// Returns null for compounds without a reliable single structure (very large /
// modified peptides, undefined preparations, and multi-component blends); the
// UI then shows a graceful fallback.
// ---------------------------------------------------------------------------

export function getStructure(id) {
  return STRUCTURES[id] || null;
}

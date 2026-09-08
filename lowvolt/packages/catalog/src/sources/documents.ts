import type { Provenance } from '@lowvolt/schema';

/**
 * DOCUMENT REGISTRY
 * -----------------
 * Every spec in the catalog points at one of these. `source_url: null` is the
 * honest state for a document we hold the values from but have not yet attached
 * a permanent link to — `lv catalog gaps` lists them, and the export policy
 * decides whether a null URL may drive a RED line.
 *
 * Guardrail #1: nothing in this file was rounded, interpolated or invented.
 * Anything not in a document is marked `unverified` and warns only.
 */

const RETRIEVED = '2026-09-08';

export type DocKey =
  | 'mercury_lp'
  | 'mercury_mr'
  | 'oo_nsc'
  | 'dna_matrix'
  | 'alta_acu'
  | 'alta_mercury_matrix'
  | 'verkada_ac'
  | 'lenels2_matrix'
  | 'tia568'
  | 'ieee8023'
  | 'nec_ch9_t1'
  | 'nec_ch9_t8'
  | 'sia_osdp'
  | 'field_policy'
  | 'pending';

interface DocDef {
  document_title: string;
  source_url: string | null;
  doc_rev: string | null;
  document_kind: Provenance['document_kind'];
}

export const DOCUMENTS: Record<DocKey, DocDef> = {
  mercury_lp: {
    document_title: 'Mercury Security LP Series Intelligent Controller Installation & Specifications',
    source_url: null,
    doc_rev: null,
    document_kind: 'manufacturer_doc',
  },
  mercury_mr: {
    document_title: 'Mercury Security MR Series Interface Panel Installation & Specifications',
    source_url: null,
    doc_rev: null,
    document_kind: 'manufacturer_doc',
  },
  oo_nsc: {
    document_title: 'Open Options NSC-100 / NSC-200 Network Sub-Controller Specifications',
    source_url: null,
    doc_rev: null,
    document_kind: 'manufacturer_doc',
  },
  dna_matrix: {
    document_title: 'Open Options DNA Fusion Hardware Compatibility Matrix',
    source_url: null,
    doc_rev: null,
    document_kind: 'head_end_matrix',
  },
  alta_acu: {
    document_title: 'Avigilon Alta Access — Access Control Unit & Expansion Board Datasheet',
    source_url: null,
    doc_rev: null,
    document_kind: 'manufacturer_doc',
  },
  alta_mercury_matrix: {
    document_title: 'Avigilon Alta Access — Supported Mercury Controller Matrix',
    source_url: null,
    doc_rev: null,
    document_kind: 'head_end_matrix',
  },
  verkada_ac: {
    document_title: 'Verkada AC41 / AC42 / AC62 Door Controller Datasheet',
    source_url: null,
    doc_rev: null,
    document_kind: 'manufacturer_doc',
  },
  lenels2_matrix: {
    document_title: 'LenelS2 OnGuard / NetBox Hardware Compatibility Matrix',
    source_url: null,
    doc_rev: null,
    document_kind: 'head_end_matrix',
  },
  tia568: {
    document_title: 'ANSI/TIA-568.1-D Commercial Building Telecommunications Cabling Standard',
    source_url: null,
    doc_rev: 'D',
    document_kind: 'standard',
  },
  ieee8023: {
    document_title: 'IEEE 802.3 — Power over Ethernet (Clause 33 / 145)',
    source_url: null,
    doc_rev: null,
    document_kind: 'standard',
  },
  nec_ch9_t1: {
    document_title: 'NFPA 70 National Electrical Code, Chapter 9 Table 1 (Conduit Fill)',
    source_url: null,
    doc_rev: null,
    document_kind: 'code',
  },
  nec_ch9_t8: {
    document_title: 'NFPA 70 National Electrical Code, Chapter 9 Table 8 (Conductor Properties)',
    source_url: null,
    doc_rev: null,
    document_kind: 'code',
  },
  sia_osdp: {
    document_title: 'SIA OSDP v2.2 Specification & Mercury RS-485 Wiring Practice',
    source_url: null,
    doc_rev: 'v2.2',
    document_kind: 'standard',
  },
  field_policy: {
    document_title: 'Low-Voltage Installation Standard Practice (company field policy)',
    source_url: null,
    doc_rev: '2026.1',
    document_kind: 'field_policy',
  },
  pending: {
    document_title: 'UNCONFIRMED — value carried from the project research brief, document not yet attached',
    source_url: null,
    doc_rev: null,
    document_kind: 'manufacturer_doc',
  },
};

/** Build a Provenance record. `note` is rendered verbatim in the tooltip. */
export function p(
  doc: DocKey,
  confidence: Provenance['confidence'] = 'verified',
  note?: string,
): Provenance {
  const d = DOCUMENTS[doc];
  return {
    source_url: d.source_url,
    document_title: d.document_title,
    doc_rev: d.doc_rev,
    retrieved: RETRIEVED,
    confidence,
    document_kind: d.document_kind,
    ...(note ? { note } : {}),
    conflicts_with: [],
  };
}

/** Shorthand for a value we do not have a document for at all. */
export const unverified = (note: string): Provenance => p('pending', 'unverified', note);

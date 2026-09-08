import { z } from 'zod';

/**
 * PROVENANCE
 * ----------
 * Guardrail #1: no fabricated specs. Every value that the rule engine can read
 * carries the document it came from. Guardrail #2: every rule cites a source
 * document with a revision and a retrieval date.
 *
 * `confidence` drives UI treatment and enforcement:
 *   verified   -> may drive a blocking violation
 *   inferred   -> warn only (derived from a verified value, e.g. unit conversion)
 *   unverified -> gray dashed in the UI, warn only, queued in "Specs to confirm"
 */
export const ConfidenceSchema = z.enum(['verified', 'inferred', 'unverified']);
export type Confidence = z.infer<typeof ConfidenceSchema>;

/**
 * A competing value from a different document. §Phase-0 rule 4: when a
 * manufacturer datasheet and a head-end compatibility matrix disagree, the
 * head-end matrix wins and BOTH are stored so the tooltip can show the conflict.
 */
export const ConflictNoteSchema = z.object({
  value: z.union([z.number(), z.string(), z.boolean()]),
  document_title: z.string().min(1),
  source_url: z.string().url().nullable(),
  doc_rev: z.string().nullable().default(null),
  /** Why this source lost. Rendered verbatim in the explanation card. */
  resolution: z.string().min(1),
});
export type ConflictNote = z.infer<typeof ConflictNoteSchema>;

export const ProvenanceSchema = z.object({
  /**
   * Direct link to the PDF/matrix. NULL is legal and honest: it means the value
   * is known but the document has not been attached to this catalog yet. It is
   * NOT the same as unverified. `citationGaps()` reports these, and the export
   * policy `blocking_requires_source_url` decides whether a null URL is allowed
   * to drive a red line in a deliverable.
   */
  source_url: z.string().url().nullable(),
  document_title: z.string().min(1),
  /** Manufacturer document revision, e.g. "Rev. E" / "3.2". */
  doc_rev: z.string().nullable().default(null),
  /** ISO-8601 date the document was pulled. */
  retrieved: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  confidence: ConfidenceSchema,
  /** Which kind of document this is; head_end_matrix outranks manufacturer_doc. */
  document_kind: z
    .enum(['manufacturer_doc', 'head_end_matrix', 'standard', 'code', 'field_policy'])
    .default('manufacturer_doc'),
  note: z.string().optional(),
  conflicts_with: z.array(ConflictNoteSchema).default([]),
});
export type Provenance = z.infer<typeof ProvenanceSchema>;

/** Units the engine understands. Adding one is a schema change, on purpose. */
export const UnitSchema = z.enum([
  'count',
  'ft',
  'm',
  'in',
  'mA',
  'A',
  'W',
  'VDC',
  'VAC',
  'Ah',
  'ohm',
  'degC',
  'degF',
  'deg',
  'percent',
  'minutes',
  'hours',
  'awg',
  'Mbps',
  'GB',
  'usd',
]);
export type Unit = z.infer<typeof UnitSchema>;

/**
 * Spec<T> — the only way a number or enum enters the catalog.
 * There is deliberately no way to write a bare `max_doors: 2`.
 */
export const specSchema = <T extends z.ZodTypeAny>(value: T) =>
  z.object({
    value,
    unit: UnitSchema.optional(),
    provenance: ProvenanceSchema,
  });

export interface Spec<T> {
  value: T;
  unit?: Unit;
  provenance: Provenance;
}

export const NumberSpecSchema = specSchema(z.number());
export const IntSpecSchema = specSchema(z.number().int());
export const BoolSpecSchema = specSchema(z.boolean());
export const StringSpecSchema = specSchema(z.string());

/** verified > inferred > unverified. Used to fold a resolution chain. */
const CONFIDENCE_RANK: Record<Confidence, number> = {
  verified: 2,
  inferred: 1,
  unverified: 0,
};

/** The weakest link wins: a derate from an unverified matrix is unverified. */
export function weakestConfidence(...values: Confidence[]): Confidence {
  return values.reduce<Confidence>(
    (worst, c) => (CONFIDENCE_RANK[c] < CONFIDENCE_RANK[worst] ? c : worst),
    'verified',
  );
}

/** True when this spec is allowed to raise a blocking (RED) violation. */
export function canBlock(
  p: Provenance,
  policy: { blocking_requires_source_url: boolean },
): boolean {
  if (p.confidence !== 'verified') return false;
  if (policy.blocking_requires_source_url && p.source_url === null) return false;
  return true;
}

/** Human-readable citation for the explanation card footer. */
export function citation(p: Provenance): string {
  const rev = p.doc_rev ? `, ${p.doc_rev}` : '';
  return `${p.document_title}${rev} (retrieved ${p.retrieved})`;
}

import { z } from 'zod';
import { ProvenanceSchema } from './provenance.js';
import { DeviceClassSchema } from './catalog.js';
import { NodeTypeSchema } from './design-graph.js';
import { PlatformIdSchema } from './platform.js';

/**
 * RULE DSL — rules are DATA, not code (Guardrail #7).
 * Adding a manufacturer must never require a code change.
 *
 * Rules live in /rules/access-control/*.json, are content-addressed and
 * versioned, and every rule ships with a passing and a failing fixture.
 * A rule with no test does not load (enforced by the loader in P2).
 */

export const SeveritySchema = z.enum([
  'blocking', // RED    — physically or contractually impossible
  'warning', // AMBER  — works, violates derate/best practice/headroom policy
  'info', // BLUE   — advisory (supersession, bundle savings, EOL)
  'unverified', // GRAY   — spec not confirmed; never blocks
]);
export type Severity = z.infer<typeof SeveritySchema>;

export const RuleCategorySchema = z.enum([
  'capacity',
  'power',
  'distance',
  'protocol',
  'licensing',
  'topology',
  'environmental',
  'code',
  'completeness',
]);
export type RuleCategory = z.infer<typeof RuleCategorySchema>;

/** Which nodes a rule binds to. Evaluated once per matching node. */
export const RuleSelectorSchema = z.object({
  node_type: z.array(NodeTypeSchema).optional(),
  class: z.array(DeviceClassSchema).optional(),
  sku_in: z.array(z.string()).optional(),
  sku_not_in: z.array(z.string()).optional(),
  /** Only evaluate when the system runs on one of these head-ends. */
  platform_in: z.array(PlatformIdSchema).optional(),
  /** Extra predicate; same expression grammar as `predicate`. */
  where: z.string().optional(),
});
export type RuleSelector = z.infer<typeof RuleSelectorSchema>;

/**
 * Expression grammar (evaluated by the pure evaluator in @lowvolt/rule-engine).
 * Deliberately small and total — no user code, no eval().
 *
 *   count(children where type='door')        -> number
 *   count(edges where type='serves_door')    -> number
 *   capacity('door')                         -> platform-resolved max | null
 *   attr('length_ft') / attr('door.lock_type')
 *   spec('power.draw_ma')                    -> catalog spec value
 *   standard('TIA-568.PERMANENT_LINK_M')
 *   sum(children.spec('power.draw_ma'))
 *   voltage_at_load()                        -> computed helper
 *   platform() / platform_version()
 *   licenses('door').purchased / .consumed
 *   Operators: > >= < <= == != and or not + - * / ( )
 */
export const PredicateSchema = z.string().min(1);

export const FixActionSchema = z.enum([
  'insert_sibling', // add another of the same SKU alongside
  'swap_model', // replace with a candidate that satisfies the constraint
  'reparent', // move overflow children to another parent
  'split_bus', // create a second bus / controller port
  'add_line_item', // e.g. license upgrade, larger switch
  'change_attr', // e.g. protocol wiegand -> osdp, upsize AWG
  'add_component', // e.g. missing REX, FAI module, local PSU
  'relocate', // move a panel to shorten a run
  'none', // "no automatic fix — requires design change" (Guardrail #5)
]);
export type FixAction = z.infer<typeof FixActionSchema>;

export const RuleFixSchema = z.object({
  id: z.string().min(1),
  /** Estimator-language label; may interpolate {sku}, {actual}, {max}, {overflow}. */
  label: z.string().min(1),
  action: FixActionSchema,
  /** Only offered when this predicate holds (e.g. bus has a free slot). */
  guard: PredicateSchema.optional(),
  /** For swap_model: how to find replacement SKUs in the catalog. */
  candidates_query: z.string().optional(),
  /** Declarative parameters for the mutation planner. */
  params: z.record(z.string(), z.unknown()).default({}),
  /** Human-readable BOM delta preview; the planner computes the real one. */
  bom_delta: z.array(z.string()).default([]),
  labor_hours: z.number().default(0),
  /** Values the mutation invalidates and must recompute. */
  recompute: z.array(z.string()).default([]),
  /** Ranking hint; the UI shows 1–3 fixes, cheapest-correct first. */
  rank: z.number().int().default(100),
});
export type RuleFix = z.infer<typeof RuleFixSchema>;

export const RuleSchema = z.object({
  id: z.string().regex(/^[A-Z]{2,4}-[A-Z]{3,4}-\d{3}$/), // AC-CAP-014
  version: z.number().int().positive(),
  category: RuleCategorySchema,
  severity: SeveritySchema,
  enabled: z.boolean().default(true),
  applies_to: RuleSelectorSchema,
  /** TRUE means the rule is VIOLATED. */
  predicate: PredicateSchema,
  /** Guardrail #4: estimator's language first... */
  message: z.string().min(1),
  /** ...then spec language, with interpolation. */
  detail: z.string().min(1),
  /** Downstream impact, for the explanation card. */
  affects: z.array(z.string()).default([]),
  /** Guardrail #5: at least one, or a single action:'none' entry. */
  fixes: z.array(RuleFixSchema).min(1),
  /**
   * Auto-demote to `warning` when any spec the predicate reads is not
   * `verified`. Guardrail #1: an unverified rule may warn, never hard-fail.
   */
  demote_if_unverified: z.boolean().default(true),
  provenance: ProvenanceSchema,
  /** Content hash over the rule body; rule sets are content-addressed. */
  hash: z.string().optional(),
});
export type Rule = z.infer<typeof RuleSchema>;

/** A rule with no fixture does not load. */
export const RuleFixtureSchema = z.object({
  rule_id: z.string().min(1),
  name: z.string().min(1),
  expect: z.enum(['pass', 'fail']),
  /** Inline design snapshot, or a path relative to the fixture file. */
  design: z.union([z.string(), z.record(z.string(), z.unknown())]),
  /** For 'fail': the exact detail string the engine must produce. */
  expect_detail: z.string().optional(),
  expect_severity: SeveritySchema.optional(),
  expect_fix_ids: z.array(z.string()).optional(),
});
export type RuleFixture = z.infer<typeof RuleFixtureSchema>;

export const RuleSetSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  trade: z.enum(['access_control', 'video', 'intercom', 'structured_cabling']),
  rules: z.array(RuleSchema),
  /** sha256 over the sorted rule hashes. */
  content_hash: z.string().optional(),
});
export type RuleSet = z.infer<typeof RuleSetSchema>;

/* ---------------------------- violations ---------------------------- */

export const ViolationSchema = z.object({
  /** Stable across revalidations so overrides and UI state survive: rule+node. */
  key: z.string().min(1),
  rule_id: z.string().min(1),
  rule_version: z.number().int(),
  category: RuleCategorySchema,
  severity: SeveritySchema,
  /** The constrained node — highlighted as PRIMARY red. */
  primary_node_id: z.string().min(1),
  /** The offending children — highlighted secondary (doors 3 and 4). */
  secondary_node_ids: z.array(z.string()).default([]),
  message: z.string(),
  detail: z.string(),
  affects: z.array(z.string()).default([]),
  /** Guardrail #2/#4: every red line traces to a document. */
  citations: z.array(ProvenanceSchema).default([]),
  fixes: z.array(RuleFixSchema).default([]),
  /** Set when severity was lowered because a spec was unverified. */
  demoted_from: SeveritySchema.nullable().default(null),
  /** Set when a user overrode a blocking violation with a written reason. */
  override: z
    .object({ reason: z.string(), actor: z.string(), ts: z.string() })
    .nullable()
    .default(null),
  /** Values the predicate read, for the tooltip and for debugging. */
  evidence: z.record(z.string(), z.unknown()).default({}),
});
export type Violation = z.infer<typeof ViolationSchema>;

export const HealthScoreSchema = z.object({
  score: z.number().min(0).max(100),
  by_category: z.record(RuleCategorySchema, z.number()),
  blocking_count: z.number().int().nonnegative(),
  warning_count: z.number().int().nonnegative(),
  unverified_count: z.number().int().nonnegative(),
  /** Export is blocked/watermarked while true and unoverridden (test #14). */
  export_blocked: z.boolean(),
});
export type HealthScore = z.infer<typeof HealthScoreSchema>;

/** Engine policy — the honest knob for provenance gaps. */
export const EnginePolicySchema = z.object({
  /**
   * false (default, Phase 1): a verified spec with a pending document URL may
   * still drive a RED line, but the validation report lists it as a citation gap.
   * true (recommended for customer-facing exports): a spec with no source_url
   * is demoted to `warning`.
   */
  blocking_requires_source_url: z.boolean().default(false),
  /** AMBER thresholds (§5.2 headroom policy). */
  bus_load_warn_pct: z.number().default(80),
  poe_budget_warn_pct: z.number().default(85),
  spare_capacity_warn_pct: z.number().default(10),
});
export type EnginePolicy = z.infer<typeof EnginePolicySchema>;

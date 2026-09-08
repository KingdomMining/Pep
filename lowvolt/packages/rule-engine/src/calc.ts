/**
 * PURE ENGINEERING CALCULATORS
 * ----------------------------
 * Zero dependencies, no I/O, no framework. Runnable in Node, in a Web Worker,
 * and in CI. The P2 evaluator calls these from rule predicates; the estimating
 * layer calls the same functions so a proposal and a validation never disagree.
 *
 * Every function takes explicit inputs. None of them reads the catalog — the
 * caller resolves platform-scoped values first and passes numbers in.
 */

/* ------------------------------- power ------------------------------- */

export interface VoltageDropInput {
  /** One-way run length in feet. The calculation doubles it for the return leg. */
  length_ft: number;
  /** Conductor DC resistance, ohms per 1000 ft (NEC Ch. 9 Table 8). */
  ohms_per_1000ft: number;
  /** Load current in amperes. */
  current_a: number;
  /** Nominal supply voltage at the source. */
  source_vdc: number;
}

export interface VoltageDropResult {
  drop_v: number;
  /** Voltage present at the load terminals. */
  terminal_vdc: number;
  drop_pct: number;
}

/** Two-conductor DC drop: V = 2 · L/1000 · R · I. */
export function voltageDrop(i: VoltageDropInput): VoltageDropResult {
  const drop_v = 2 * (i.length_ft / 1000) * i.ohms_per_1000ft * i.current_a;
  const terminal_vdc = i.source_vdc - drop_v;
  return {
    drop_v,
    terminal_vdc,
    drop_pct: i.source_vdc === 0 ? 0 : (drop_v / i.source_vdc) * 100,
  };
}

/**
 * Largest one-way run that still lands at or above `min_terminal_vdc`.
 * Powers the "relocate the panel" and "upsize the gauge" fixes.
 */
export function maxRunFt(i: Omit<VoltageDropInput, 'length_ft'> & { min_terminal_vdc: number }): number {
  const allowed = i.source_vdc - i.min_terminal_vdc;
  if (allowed <= 0 || i.current_a <= 0 || i.ohms_per_1000ft <= 0) return 0;
  return (allowed * 1000) / (2 * i.ohms_per_1000ft * i.current_a);
}

export interface PoeBudgetInput {
  /** Per-device PD wattage at the port. */
  loads_w: number[];
  /** Switch PSE budget in watts. */
  budget_w: number;
  /** AMBER above this fraction of the budget. */
  warn_pct: number;
}

export interface PoeBudgetResult {
  required_w: number;
  budget_w: number;
  headroom_w: number;
  used_pct: number;
  status: 'ok' | 'warn' | 'exceeded';
}

export function poeBudget(i: PoeBudgetInput): PoeBudgetResult {
  const required_w = i.loads_w.reduce((a, b) => a + b, 0);
  const used_pct = i.budget_w === 0 ? Infinity : (required_w / i.budget_w) * 100;
  return {
    required_w,
    budget_w: i.budget_w,
    headroom_w: i.budget_w - required_w,
    used_pct,
    status: required_w > i.budget_w ? 'exceeded' : used_pct > i.warn_pct ? 'warn' : 'ok',
  };
}

/** Standby battery sizing: Ah = (alarm + standby load) with a derate factor. */
export function batteryAh(i: {
  standby_load_a: number;
  standby_minutes: number;
  alarm_load_a: number;
  alarm_minutes: number;
  /** Aging/temperature derate, e.g. 1.25 for a 20% margin. */
  derate: number;
}): number {
  const standby = i.standby_load_a * (i.standby_minutes / 60);
  const alarm = i.alarm_load_a * (i.alarm_minutes / 60);
  return (standby + alarm) * i.derate;
}

/* ------------------------------ capacity ------------------------------ */

export interface LoadResult {
  used: number;
  max: number;
  used_pct: number;
  status: 'ok' | 'warn' | 'exceeded';
  overflow: number;
}

/** Shared shape behind every capacity/bus-loading rule. */
export function loadAgainst(used: number, max: number, warn_pct: number): LoadResult {
  const used_pct = max === 0 ? (used > 0 ? Infinity : 0) : (used / max) * 100;
  return {
    used,
    max,
    used_pct,
    overflow: Math.max(0, used - max),
    status: used > max ? 'exceeded' : used_pct > warn_pct ? 'warn' : 'ok',
  };
}

/* ------------------------------ pathway ------------------------------ */

/** NEC Ch. 9 Table 1 allowable fill fraction for a cable count. */
export function conduitFillPct(cableCount: number, pcts: { one: number; two: number; threePlus: number }): number {
  if (cableCount <= 0) return 0;
  if (cableCount === 1) return pcts.one;
  if (cableCount === 2) return pcts.two;
  return pcts.threePlus;
}

export function conduitFill(i: {
  conduit_area_in2: number;
  cable_od_in: number;
  cable_count: number;
  pcts: { one: number; two: number; threePlus: number };
}): { fill_in2: number; allowed_in2: number; used_pct: number; status: 'ok' | 'exceeded' } {
  const area = Math.PI * (i.cable_od_in / 2) ** 2;
  const fill_in2 = area * i.cable_count;
  const allowed_in2 = i.conduit_area_in2 * (conduitFillPct(i.cable_count, i.pcts) / 100);
  return {
    fill_in2,
    allowed_in2,
    used_pct: allowed_in2 === 0 ? Infinity : (fill_in2 / allowed_in2) * 100,
    status: fill_in2 > allowed_in2 ? 'exceeded' : 'ok',
  };
}

export const FT_PER_M = 3.280839895013123;
export const metersToFeet = (m: number): number => m * FT_PER_M;
export const feetToMeters = (ft: number): number => ft / FT_PER_M;

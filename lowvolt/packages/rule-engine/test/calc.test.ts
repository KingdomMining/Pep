import { describe, expect, it } from 'vitest';
import { batteryAh, conduitFill, loadAgainst, maxRunFt, poeBudget, voltageDrop } from '@lowvolt/rule-engine';

describe('voltage drop (acceptance test #7)', () => {
  // Maglock 500 mA, 18 AWG, 250 ft, 12 V. 18 AWG = 7.77 ohm/kFT (NEC Ch.9 T8).
  const r = voltageDrop({ length_ft: 250, ohms_per_1000ft: 7.77, current_a: 0.5, source_vdc: 12 });

  it('lands the lock below the 11.0 V minimum', () => {
    expect(r.drop_v).toBeCloseTo(1.9425, 4);
    expect(r.terminal_vdc).toBeCloseTo(10.0575, 4);
    expect(r.terminal_vdc).toBeLessThan(11.0);
  });

  it('still fails at 16 AWG — one gauge up is not enough', () => {
    const awg16 = voltageDrop({ length_ft: 250, ohms_per_1000ft: 4.89, current_a: 0.5, source_vdc: 12 });
    expect(awg16.terminal_vdc).toBeCloseTo(10.7775, 4);
    expect(awg16.terminal_vdc).toBeLessThan(11.0);
  });

  it('clears at 14 AWG (3.07 ohm/kFT) — the real upsize fix', () => {
    const awg14 = voltageDrop({ length_ft: 250, ohms_per_1000ft: 3.07, current_a: 0.5, source_vdc: 12 });
    expect(awg14.terminal_vdc).toBeCloseTo(11.2325, 4);
    expect(awg14.terminal_vdc).toBeGreaterThan(11.0);
  });

  it('clears on a 24 V lock at the same gauge and length', () => {
    const v24 = voltageDrop({ length_ft: 250, ohms_per_1000ft: 7.77, current_a: 0.5, source_vdc: 24 });
    expect(v24.terminal_vdc).toBeGreaterThan(22.0);
  });

  it('reports the longest legal run, for the relocate-panel fix', () => {
    const max = maxRunFt({ ohms_per_1000ft: 7.77, current_a: 0.5, source_vdc: 12, min_terminal_vdc: 11.0 });
    expect(max).toBeCloseTo(128.7, 1);
    const atLimit = voltageDrop({ length_ft: max, ohms_per_1000ft: 7.77, current_a: 0.5, source_vdc: 12 });
    expect(atLimit.terminal_vdc).toBeCloseTo(11.0, 6);
  });
});

describe('PoE budget (acceptance test #8)', () => {
  it('rejects 20 cameras at 25.5 W on a 370 W switch', () => {
    const r = poeBudget({ loads_w: Array(20).fill(25.5), budget_w: 370, warn_pct: 85 });
    expect(r.required_w).toBe(510);
    expect(r.status).toBe('exceeded');
    expect(r.headroom_w).toBe(-140);
  });

  it('warns rather than blocks at 86% of budget', () => {
    const r = poeBudget({ loads_w: [320], budget_w: 370, warn_pct: 85 });
    expect(r.status).toBe('warn');
  });
});

describe('capacity loading', () => {
  it('reports the overflow count so the message can name the offending doors', () => {
    // Acceptance test #1: 4 doors on an MR52 (max 2).
    const r = loadAgainst(4, 2, 80);
    expect(r).toMatchObject({ status: 'exceeded', overflow: 2 });
  });

  it('ambers a bus over the 80% headroom policy', () => {
    expect(loadAgainst(27, 32, 80).status).toBe('warn');
    expect(loadAgainst(25, 32, 80).status).toBe('ok');
  });

  it('treats any load on a zero-capacity device as exceeded', () => {
    expect(loadAgainst(1, 0, 80).status).toBe('exceeded');
  });
});

describe('battery and pathway calculators', () => {
  it('sizes standby Ah with a derate', () => {
    // 1.2 A standby for 4 h + 3 A alarm for 15 min, 25% margin.
    expect(batteryAh({ standby_load_a: 1.2, standby_minutes: 240, alarm_load_a: 3, alarm_minutes: 15, derate: 1.25 })).toBeCloseTo(6.9375, 4);
  });

  it('applies the 40% NEC fill for three or more cables', () => {
    const r = conduitFill({
      conduit_area_in2: 0.533, // 3/4" EMT
      cable_od_in: 0.2,
      cable_count: 6,
      pcts: { one: 53, two: 31, threePlus: 40 },
    });
    expect(r.allowed_in2).toBeCloseTo(0.2132, 4);
    expect(r.status).toBe('ok');
  });
});

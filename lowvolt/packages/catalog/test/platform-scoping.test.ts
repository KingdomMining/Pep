import { describe, expect, it } from 'vitest';
import { loadCatalog, capacityOf, citationGaps, devicesForPlatform } from '@lowvolt/catalog';
import { canBlock, resolveSupport, compareVersions, type PlatformContext } from '@lowvolt/schema';

const catalog = loadCatalog();
const alta: PlatformContext = { platform_id: 'avigilon_alta', platform_version: null };
const dna = (v: string | null = null): PlatformContext => ({ platform_id: 'dna_fusion', platform_version: v });

describe('the platform-derate insight (§2)', () => {
  it('reads 64 readers on an LP1502 natively under DNA Fusion', () => {
    const r = capacityOf(catalog, 'LP1502', 'reader', dna());
    expect(r.max).toBe(64);
    expect(r.source).toBe('device_base');
    expect(r.derated).toBe(false);
  });

  it('reads 32 entries on the SAME LP1502 under Alta Access, and says it is a derate', () => {
    const r = capacityOf(catalog, 'LP1502', 'entry', alta);
    expect(r.max).toBe(32);
    expect(r.source).toBe('platform_override');
    expect(r.derated).toBe(true);
    expect(r.native_max).toBe(64); // the native reader count it replaces
    expect(r.native_kind).toBe('reader');
  });

  it('derates an LP1501 to 8 entries under Alta', () => {
    expect(capacityOf(catalog, 'LP1501', 'entry', alta).max).toBe(8);
  });

  it('derates an LP2500 to 32 entries under Alta against a native 64 doors', () => {
    const r = capacityOf(catalog, 'LP2500', 'entry', alta);
    expect(r.max).toBe(32);
    expect(r.native_max).toBe(64);
    expect(r.native_kind).toBe('door');
  });

  it('keeps the override provenance ahead of the native one in the citation chain', () => {
    const r = capacityOf(catalog, 'LP1502', 'entry', alta);
    expect(r.provenance_chain[0]?.document_kind).toBe('head_end_matrix');
    expect(r.provenance_chain.some((p) => p.document_kind === 'manufacturer_doc')).toBe(true);
  });

  it('never lets a bare capacity be read without a platform', () => {
    // The only lookup APIs take a PlatformContext. This is a compile-time
    // guarantee; asserted here so a future refactor that adds a bare getter
    // has to delete this test on purpose.
    expect(capacityOf.length).toBe(4);
  });
});

describe('support resolution', () => {
  it('rejects Mercury hardware on Verkada Command', () => {
    const device = catalog.bySku.get('LP1502')!;
    const s = resolveSupport(device, { platform_id: 'verkada_command', platform_version: null });
    expect(s.supported).toBe(false);
  });

  it('rejects Alta hardware on DNA Fusion', () => {
    const device = catalog.bySku.get('OP-ACC')!;
    expect(resolveSupport(device, dna()).supported).toBe(false);
  });

  it('reports "not listed" for a SKU with no entry for that platform', () => {
    const cable = catalog.bySku.get('CBL-18-2-CMP')!;
    const s = resolveSupport(cable, dna());
    expect(s).toMatchObject({ supported: false, reason: 'not_listed' });
  });

  it('gates on the head-end minimum version', () => {
    const device = catalog.bySku.get('MR52')!;
    const below = resolveSupport(device, dna('6.4.0'));
    const ok = resolveSupport(device, dna('6.5.0.2'));
    const unknown = resolveSupport(device, dna(null));
    expect(below.supported && below.version_gate.status).toBe('below_min');
    expect(ok.supported && ok.version_gate.status).toBe('ok');
    expect(unknown.supported && unknown.version_gate.status).toBe('unknown');
  });

  it('compares dotted versions numerically, not lexically', () => {
    expect(compareVersions('6.5.0.2', '6.5.0.10')).toBe(-1);
    expect(compareVersions('6.10', '6.9')).toBe(1);
    expect(compareVersions('6.5', '6.5.0')).toBe(0);
  });
});

describe('guardrail #1 — no fabricated specs', () => {
  it('parses the whole catalog against the schema', () => {
    expect(catalog.devices.length).toBeGreaterThan(20);
    expect(new Set(catalog.devices.map((d) => d.sku)).size).toBe(catalog.devices.length);
  });

  it('gives every catalog device a provenance record', () => {
    for (const d of catalog.devices) {
      expect(d.provenance.document_title, d.sku).toBeTruthy();
      expect(d.provenance.retrieved, d.sku).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('gives every capacity value its own provenance, not just the device', () => {
    for (const d of catalog.devices) {
      for (const c of d.capacities) {
        expect(c.max.provenance.document_title, `${d.sku}.${c.of}`).toBeTruthy();
      }
      for (const support of Object.values(d.platform_support)) {
        for (const c of support.capacity_overrides) {
          expect(c.max.provenance.document_title, `${d.sku} override ${c.of}`).toBeTruthy();
        }
      }
    }
  });

  it('queues every unconfirmed spec instead of hiding it', () => {
    const gaps = citationGaps(catalog);
    expect(gaps.length).toBeGreaterThan(0);
    // The DNA Fusion 6.5.0.2 minimum is an example value, not a matrix reading.
    expect(gaps.some((g) => g.reason === 'unverified' && g.note?.includes('6.5.0.2'))).toBe(true);
    // Placeholder readers must be flagged as unverified, never quietly usable.
    expect(gaps.some((g) => g.sku === 'RDR-OSDP-PLACEHOLDER' && g.reason === 'unverified')).toBe(true);
  });

  it('refuses to let an unverified spec drive a RED line', () => {
    const placeholder = catalog.bySku.get('RDR-WIEGAND-PLACEHOLDER')!;
    expect(canBlock(placeholder.provenance, { blocking_requires_source_url: false })).toBe(false);
  });

  it('lets a verified spec block under the default policy, and demotes it under the strict one', () => {
    const mr52 = catalog.bySku.get('MR52')!;
    const doorCap = mr52.capacities.find((c) => c.of === 'door')!;
    expect(canBlock(doorCap.max.provenance, { blocking_requires_source_url: false })).toBe(true);
    // No source_url attached yet, so a customer-facing export demotes it.
    expect(canBlock(doorCap.max.provenance, { blocking_requires_source_url: true })).toBe(false);
  });
});

describe('fix-candidate queries', () => {
  it('lists only Alta-supported hardware for an Alta design', () => {
    const skus = devicesForPlatform(catalog, alta).map((d) => d.sku);
    expect(skus).toContain('OP-ACC');
    expect(skus).toContain('LP1502'); // Mercury under Alta — hybrid is the point
    expect(skus).not.toContain('AC42');
    expect(skus).not.toContain('MR52');
  });

  it('offers an AC62 as the 16-door upgrade path from an AC42 (test #4 fix)', () => {
    const verkada: PlatformContext = { platform_id: 'verkada_command', platform_version: null };
    const bigger = devicesForPlatform(catalog, verkada)
      .filter((d) => (capacityOf(catalog, d.sku, 'door', verkada).max ?? 0) >= 5)
      .map((d) => d.sku);
    expect(bigger).toEqual(['AC62']);
  });
});

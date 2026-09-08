import type { Capacity, CapacityKind, CatalogDevice, PlatformSupport } from './catalog.js';
import type { PlatformContext, PlatformId } from './platform.js';
import type { Confidence, Provenance, Spec } from './provenance.js';
import { weakestConfidence } from './provenance.js';

/**
 * PLATFORM-SCOPED RESOLUTION
 * --------------------------
 * There is intentionally no `device.capacities.find(c => c.of === 'door')` API
 * exposed anywhere else in the system. Capacity is a function of
 * (platform, platform_version, controller_model, firmware). Read it here.
 */

export type ResolutionSource =
  | 'platform_override' // head-end matrix derate/uprate — wins
  | 'device_base' // manufacturer native spec
  | 'absent'; // device declares no such capacity

export interface ResolvedCapacity {
  kind: CapacityKind;
  /** null when `source === 'absent'` or the device is unsupported. */
  max: number | null;
  unit?: string;
  scope: Capacity['scope'];
  scope_ref?: string;
  qualifier?: string;
  source: ResolutionSource;
  /** Effective confidence: the weakest link in the resolution chain. */
  confidence: Confidence;
  /** Every document consulted, most-authoritative first. For the tooltip. */
  provenance_chain: Provenance[];
  /** Present when the platform derates the native value — the §2 insight. */
  native_max?: number | null;
  /** The native capacity kind `native_max` was read from (Alta entry <- reader). */
  native_kind?: CapacityKind;
  derated: boolean;
}

export type SupportStatus =
  | { supported: true; support: PlatformSupport; version_gate: VersionGate }
  | { supported: false; reason: 'not_listed' | 'explicitly_unsupported'; provenance?: Provenance };

export interface VersionGate {
  /** ok = satisfied; below_min/above_max = violated; unknown = version not chosen. */
  status: 'ok' | 'below_min' | 'above_max' | 'unknown';
  required_min?: string | null;
  required_max?: string | null;
  actual?: string | null;
}

/** Dotted-numeric compare ("6.5.0.2" vs "6.5.1"). Returns -1 | 0 | 1. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-+]/).map((s) => Number.parseInt(s, 10));
  const pb = b.split(/[.\-+]/).map((s) => Number.parseInt(s, 10));
  const len = Math.max(pa.length, pb.length);
  for (let i = 0; i < len; i += 1) {
    const x = Number.isFinite(pa[i]) ? (pa[i] as number) : 0;
    const y = Number.isFinite(pb[i]) ? (pb[i] as number) : 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function checkVersionGate(support: PlatformSupport, actual: string | null): VersionGate {
  const min = support.min_platform_version;
  const max = support.max_platform_version;
  if (min === null && max === null) return { status: 'ok', required_min: null, required_max: null, actual };
  if (actual === null) return { status: 'unknown', required_min: min, required_max: max, actual };
  if (min !== null && compareVersions(actual, min) < 0)
    return { status: 'below_min', required_min: min, required_max: max, actual };
  if (max !== null && compareVersions(actual, max) > 0)
    return { status: 'above_max', required_min: min, required_max: max, actual };
  return { status: 'ok', required_min: min, required_max: max, actual };
}

/** Is this SKU usable on this head-end at all? */
export function resolveSupport(device: CatalogDevice, ctx: PlatformContext): SupportStatus {
  const support = device.platform_support[ctx.platform_id];
  if (!support) return { supported: false, reason: 'not_listed' };
  if (!support.supported)
    return { supported: false, reason: 'explicitly_unsupported', provenance: support.provenance };
  return { supported: true, support, version_gate: checkVersionGate(support, ctx.platform_version) };
}

function pickCapacity(list: Capacity[], kind: CapacityKind, scopeRef?: string): Capacity | undefined {
  return list.find((c) => c.of === kind && (scopeRef === undefined || c.scope_ref === scopeRef));
}

/**
 * THE lookup. Override beats base; both are reported so the UI can say
 * "native Mercury allows 64, Alta supports 32".
 */
export function resolveCapacity(
  device: CatalogDevice,
  kind: CapacityKind,
  ctx: PlatformContext,
  opts: { scope_ref?: string } = {},
): ResolvedCapacity {
  const base = pickCapacity(device.capacities, kind, opts.scope_ref);
  const support = device.platform_support[ctx.platform_id];
  const override = support ? pickCapacity(support.capacity_overrides, kind, opts.scope_ref) : undefined;

  const chain: Provenance[] = [];

  if (override) {
    // The head-end may rename the unit (Alta "entry" <- Mercury "reader").
    const nativeCounterpart =
      override.compares_to_native !== undefined
        ? pickCapacity(device.capacities, override.compares_to_native, opts.scope_ref)
        : base;
    const overrideNativeMax = nativeCounterpart ? nativeCounterpart.max.value : null;
    chain.push(override.max.provenance);
    if (support) chain.push(support.provenance);
    if (nativeCounterpart) chain.push(nativeCounterpart.max.provenance);
    return {
      kind,
      max: override.max.value,
      unit: override.max.unit,
      scope: override.scope,
      scope_ref: override.scope_ref,
      qualifier: override.qualifier ?? base?.qualifier,
      source: 'platform_override',
      confidence: weakestConfidence(
        override.max.provenance.confidence,
        support ? support.provenance.confidence : 'verified',
      ),
      provenance_chain: chain,
      native_max: overrideNativeMax,
      native_kind: override.compares_to_native ?? kind,
      derated: overrideNativeMax !== null && override.max.value < overrideNativeMax,
    };
  }

  const nativeMax = base ? base.max.value : null;

  if (base) {
    chain.push(base.max.provenance);
    if (support) chain.push(support.provenance);
    return {
      kind,
      max: base.max.value,
      unit: base.max.unit,
      scope: base.scope,
      scope_ref: base.scope_ref,
      qualifier: base.qualifier,
      source: 'device_base',
      confidence: weakestConfidence(
        base.max.provenance.confidence,
        support ? support.provenance.confidence : 'verified',
      ),
      provenance_chain: chain,
      native_max: nativeMax,
      derated: false,
    };
  }

  return {
    kind,
    max: null,
    scope: 'device',
    source: 'absent',
    confidence: 'unverified',
    provenance_chain: [],
    native_max: null,
    derated: false,
  };
}

/** License seats one instance of this SKU consumes on this platform. */
export function resolveLicensing(
  device: CatalogDevice,
  ctx: PlatformContext,
): PlatformSupport['licensing'] {
  return device.platform_support[ctx.platform_id]?.licensing ?? [];
}

/** Convenience for the "Specs to confirm" queue and export gating. */
export function specConfidence<T>(spec: Spec<T> | undefined): Confidence {
  return spec ? spec.provenance.confidence : 'unverified';
}

/** All platforms on which a SKU is usable — powers `swap_model` fix candidates. */
export function supportedPlatforms(device: CatalogDevice): PlatformId[] {
  return (Object.keys(device.platform_support) as PlatformId[]).filter(
    (p) => device.platform_support[p]?.supported === true,
  );
}

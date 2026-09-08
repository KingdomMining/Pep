import type { CapacityInput, CapacityKind, PortInput, PortType, Provenance, Spec, Unit } from '@lowvolt/schema';

export function spec<T>(value: T, provenance: Provenance, unit?: Unit): Spec<T> {
  return unit === undefined ? { value, provenance } : { value, unit, provenance };
}

export function cap(
  of: CapacityKind,
  max: number,
  provenance: Provenance,
  extra: Partial<Omit<CapacityInput, 'of' | 'max'>> = {},
): CapacityInput {
  return {
    of,
    max: spec(max, provenance, 'count'),
    scope: extra.scope ?? 'device',
    ...(extra.scope_ref ? { scope_ref: extra.scope_ref } : {}),
    ...(extra.qualifier ? { qualifier: extra.qualifier } : {}),
    ...(extra.compares_to_native ? { compares_to_native: extra.compares_to_native } : {}),
  };
}

export function port(
  id: string,
  type: PortType,
  count: number,
  provenance: Provenance,
  extra: Partial<Omit<PortInput, 'id' | 'type' | 'count'>> = {},
): PortInput {
  return {
    id,
    type,
    count: spec(count, provenance, 'count'),
    modes: extra.modes ?? [],
    ...(extra.rating ? { rating: extra.rating } : {}),
    ...(extra.notes ? { notes: extra.notes } : {}),
  };
}

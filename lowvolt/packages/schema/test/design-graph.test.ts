import { describe, expect, it } from 'vitest';
import {
  DesignSnapshotSchema,
  buildIndex,
  dirtyClosure,
  type DesignSnapshot,
} from '@lowvolt/schema';

/**
 * A minimal but real access-control design: DNA Fusion -> LP1502 -> RS-485 bus
 * -> MR52 -> 4 doors. This is acceptance test #1's shape; the rule engine (P2)
 * is what turns it red. Here we only prove the SCHEMA can express it.
 */
function fourDoorsOnOneMR52(): DesignSnapshot {
  const doors = [1, 2, 3, 4].map((n) => ({
    id: `door-${n}`,
    type: 'door' as const,
    label: `Door ${100 + n}`,
    sku: null,
    parent_id: 'sio-1',
    location_id: 'loc-1',
    qty: 1,
    attrs: { opening_number: `${100 + n}`, lock_type: 'electric_strike', reader_config: 'in_only' },
    orphaned: false,
    origin: { kind: 'manual' as const, ref: null },
  }));

  return DesignSnapshotSchema.parse({
    design_id: 'dsn-1',
    revision: 0,
    project_id: 'prj-1',
    catalog_version: '0.1.0',
    rule_set_version: '0.0.0',
    nodes: [
      { id: 'prj-1', type: 'project', label: 'Test Project', parent_id: null },
      {
        id: 'sys-1',
        type: 'system',
        label: 'Access Control',
        parent_id: 'prj-1',
        attrs: {
          kind: 'access_control',
          platform: { platform_id: 'dna_fusion', platform_version: '6.5.0.2' },
        },
      },
      { id: 'loc-1', type: 'location', label: 'Bldg A / L1', parent_id: 'prj-1' },
      { id: 'ctl-1', type: 'controller', label: 'ACP-1', sku: 'LP1502', parent_id: 'sys-1' },
      {
        id: 'bus-1',
        type: 'bus',
        label: 'ACP-1 RS-485',
        parent_id: 'ctl-1',
        attrs: { bus_type: 'rs485_downstream', host_port: 'downstream', total_length_ft: 380 },
      },
      { id: 'sio-1', type: 'sub_controller', label: 'SIO-1', sku: 'MR52', parent_id: 'bus-1' },
      ...doors,
    ],
    edges: [
      { id: 'e1', type: 'hosts_bus', from: 'ctl-1', to: 'bus-1' },
      { id: 'e2', type: 'on_bus', from: 'sio-1', to: 'bus-1' },
      ...doors.map((d, i) => ({
        id: `e-door-${i}`,
        type: 'controls_door' as const,
        from: 'sio-1',
        to: d.id,
      })),
    ],
  });
}

describe('design graph', () => {
  const snapshot = fourDoorsOnOneMR52();
  const index = buildIndex(snapshot);

  it('expresses 4 doors under a 2-door SIO (acceptance test #1 shape)', () => {
    expect(index.childrenOf.get('sio-1')).toHaveLength(4);
    expect(index.nodesById.get('sio-1')?.sku).toBe('MR52');
  });

  it('derives counts from edges rather than storing a counter', () => {
    const served = (index.edgesFrom.get('sio-1') ?? []).filter((e) => e.type === 'controls_door');
    expect(served).toHaveLength(4);
    expect(index.nodesById.get('sio-1')).not.toHaveProperty('door_count');
  });

  it('resolves the platform context from any node by walking to its system', () => {
    for (const id of ['door-3', 'sio-1', 'bus-1', 'ctl-1']) {
      expect(index.systemOf.get(id), id).toBe('sys-1');
    }
    const sys = index.nodesById.get('sys-1')!;
    expect(sys.attrs['platform']).toEqual({ platform_id: 'dna_fusion', platform_version: '6.5.0.2' });
  });

  it('pulls the constrained parent AND the offending children into the dirty set', () => {
    // Adding door-4 must re-validate the MR52, not just the door.
    const dirty = dirtyClosure(index, ['door-4']);
    expect(dirty.has('sio-1')).toBe(true);
    expect(dirty.has('bus-1')).toBe(true);
    expect(dirty.has('ctl-1')).toBe(true);
    expect(dirty.has('door-1')).toBe(true);
  });

  it('does not walk the whole project for a leaf edit', () => {
    const dirty = dirtyClosure(index, ['door-4'], 1);
    expect(dirty.has('sio-1')).toBe(true);
    expect(dirty.has('prj-1')).toBe(false);
  });

  it('survives a parent cycle without hanging', () => {
    const cyclic = DesignSnapshotSchema.parse({
      ...snapshot,
      nodes: [
        { id: 'a', type: 'controller', label: 'A', parent_id: 'b' },
        { id: 'b', type: 'controller', label: 'B', parent_id: 'a' },
      ],
      edges: [],
    });
    expect(() => buildIndex(cyclic)).not.toThrow();
  });

  it('flags orphans instead of deleting them (acceptance test #11)', () => {
    const orphaned = DesignSnapshotSchema.parse({
      ...snapshot,
      nodes: snapshot.nodes
        .filter((n) => n.id !== 'sio-1')
        .map((n) => (n.parent_id === 'sio-1' ? { ...n, parent_id: null, orphaned: true } : n)),
      edges: snapshot.edges.filter((e) => e.from !== 'sio-1'),
    });
    const orphans = orphaned.nodes.filter((n) => n.orphaned);
    expect(orphans).toHaveLength(4);
    expect(orphans.every((n) => n.type === 'door')).toBe(true);
  });

  it('requires a written reason on a blocking override (guardrail #6)', () => {
    const bad = { ...snapshot, overrides: [{ violation_key: 'AC-CAP-014:sio-1', reason: 'ok', actor: 'u1', ts: '2026-09-08T00:00:00Z' }] };
    expect(() => DesignSnapshotSchema.parse(bad)).toThrow();
    const good = {
      ...snapshot,
      overrides: [
        {
          violation_key: 'AC-CAP-014:sio-1',
          reason: 'Owner-furnished panel already installed; verified in field walk 9/2.',
          actor: 'u1',
          ts: '2026-09-08T00:00:00Z',
        },
      ],
    };
    expect(() => DesignSnapshotSchema.parse(good)).not.toThrow();
  });
});

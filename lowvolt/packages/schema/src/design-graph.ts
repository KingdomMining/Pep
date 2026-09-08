import { z } from 'zod';
import { PlatformContextSchema } from './platform.js';

/**
 * DESIGN GRAPH
 * ------------
 * Project -> System(access_control) -> HeadEnd(platform+version+licenses)
 *   -> Panel/Enclosure -> Controller -> Bus(RS-485|IP) -> SubController
 *   -> Door(opening) -> {Reader, Lock, DPS, REX, AUX} -> CableRun
 *   -> PowerSupply/PSU output -> NetworkSwitch(port, PoE class) -> Location
 *
 * Nodes are instances; edges are typed. Capacity counters are DERIVED from
 * edges, never stored — a stored counter is a counter that drifts.
 */
export const NodeTypeSchema = z.enum([
  'project',
  'system',
  'head_end',
  'license_pool',
  'location', // building / floor / room
  'enclosure',
  'controller',
  'sub_controller',
  'acu',
  'expansion_board',
  'bus',
  'door', // the opening
  'reader',
  'lock',
  'dps',
  'rex',
  'aux_device',
  'cable_run',
  'power_supply',
  'psu_output',
  'battery',
  'network_switch',
  'switch_port',
  'camera',
  'intercom',
  'media_converter',
]);
export type NodeType = z.infer<typeof NodeTypeSchema>;

export const SystemKindSchema = z.enum(['access_control', 'video', 'intercom', 'structured_cabling']);
export type SystemKind = z.infer<typeof SystemKindSchema>;

export const EdgeTypeSchema = z.enum([
  'contains', // structural parent -> child (the tree spine)
  'on_bus', // sub_controller -> bus
  'hosts_bus', // controller -> bus
  'serves_door', // reader/lock/dps/rex -> door
  'controls_door', // controller|sub_controller|acu -> door
  'occupies_port', // device -> {controller port id}
  'powers', // psu_output|switch_port -> device
  'cabled_by', // device pair -> cable_run
  'cable_endpoint', // cable_run -> device (exactly 2 per run)
  'licensed_by', // door|reader -> license_pool
  'mounted_in', // device -> enclosure
  'located_in', // any -> location
  'fai_release', // fai source -> lock (life-safety egress)
]);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

/** Per-node attributes. Loose by design; rules read named keys defensively. */
export const NodeAttrsSchema = z.record(z.string(), z.unknown());

export const DesignNodeSchema = z.object({
  id: z.string().min(1),
  type: NodeTypeSchema,
  label: z.string().min(1),
  /** Catalog SKU this instance realizes. Absent for abstract nodes (door, bus). */
  sku: z.string().nullable().default(null),
  /** Structural parent. Root (project) has null. Mirrors the `contains` edge. */
  parent_id: z.string().nullable().default(null),
  location_id: z.string().nullable().default(null),
  qty: z.number().int().positive().default(1),
  attrs: NodeAttrsSchema.default({}),
  /** Set when a parent was deleted: flagged, never silently removed (test #11). */
  orphaned: z.boolean().default(false),
  /** Where the instance came from — assembly instantiation is auditable. */
  origin: z
    .object({
      kind: z.enum(['manual', 'assembly', 'takeoff', 'fix_apply', 'import']),
      ref: z.string().nullable().default(null),
    })
    .default({ kind: 'manual', ref: null }),
});
export type DesignNode = z.infer<typeof DesignNodeSchema>;

export const DesignEdgeSchema = z.object({
  id: z.string().min(1),
  type: EdgeTypeSchema,
  from: z.string().min(1),
  to: z.string().min(1),
  attrs: NodeAttrsSchema.default({}),
});
export type DesignEdge = z.infer<typeof DesignEdgeSchema>;

/* ---- Well-known attrs, documented so rules and UI agree on key names ---- */

/** node.type === 'system' */
export const SystemAttrsSchema = z.object({
  kind: SystemKindSchema,
  /** THE resolution key for every capacity lookup under this system. */
  platform: PlatformContextSchema,
});

/** node.type === 'bus' */
export const BusAttrsSchema = z.object({
  bus_type: z.enum(['rs485_downstream', 'ip', 'usb', 'wireless']),
  /** Host port id on the parent controller, e.g. "port1". */
  host_port: z.string().nullable().default(null),
  total_length_ft: z.number().nonnegative().default(0),
  /** Explicitly modeled so AC-TOPO can reject unapproved converters. */
  traverses_media_converter: z.boolean().default(false),
  terminated_at_ends: z.boolean().default(false),
});

/** node.type === 'cable_run' */
export const CableRunAttrsSchema = z.object({
  length_ft: z.number().nonnegative(),
  awg: z.number().int().optional(),
  conductors: z.number().int().optional(),
  shielded: z.boolean().default(false),
  protocol: z.enum(['osdp', 'wiegand', 'clock_and_data', 'ethernet', 'power', 'contact', 'none']).default('none'),
  /** 'both' is a ground loop — flagged by AC-DIST rules. */
  shield_ground: z.enum(['controller_only', 'field_only', 'both', 'none']).default('controller_only'),
  terminated_120ohm: z.boolean().default(false),
  in_plenum_space: z.boolean().default(false),
  jacket: z.enum(['cmr_riser', 'cmp_plenum', 'cm_general', 'cmx_outdoor', 'direct_burial']).optional(),
  /** Parallel AC proximity, drives the >=12in separation advisory. */
  ac_separation_in: z.number().nonnegative().optional(),
});

/** node.type === 'door' */
export const DoorAttrsSchema = z.object({
  opening_number: z.string().optional(),
  lock_type: z.enum(['electric_strike', 'maglock', 'electrified_lever', 'electrified_panic', 'delayed_egress', 'none']).default('none'),
  reader_config: z.enum(['in_only', 'in_out']).default('in_only'),
  /** Life-safety: maglock requires REX + FAI release + manual pull (test #12). */
  requires_fai_release: z.boolean().default(false),
  has_manual_pull: z.boolean().default(false),
  fire_rated: z.boolean().default(false),
  ada: z.boolean().default(false),
});

/** node.type === 'lock' */
export const LockAttrsSchema = z.object({
  nominal_vdc: z.number().positive().default(12),
  /** Terminal voltage below which the lock chatters/drops out. */
  min_operating_vdc: z.number().positive().default(11.0),
  inrush_ma: z.number().nonnegative().optional(),
  holding_ma: z.number().nonnegative(),
  fail_mode: z.enum(['fail_safe', 'fail_secure']).default('fail_secure'),
});

/** node.type === 'license_pool' */
export const LicensePoolAttrsSchema = z.object({
  unit: z.enum(['door', 'entry', 'reader', 'controller', 'camera_channel', 'client_workstation', 'cardholder', 'intercom_station']),
  purchased: z.number().int().nonnegative(),
  sku: z.string().nullable().default(null),
});

/** node.type === 'switch_port' / 'network_switch' */
export const SwitchAttrsSchema = z.object({
  poe_budget_w: z.number().nonnegative().optional(),
  port_count: z.number().int().positive().optional(),
  poe_standard: z.enum(['802.3af', '802.3at', '802.3bt_type3', '802.3bt_type4', 'none']).default('none'),
});

/* ------------------------------ snapshot ------------------------------ */

export const DesignSnapshotSchema = z.object({
  design_id: z.string().min(1),
  /** Monotonic; equals the seq of the last applied event. */
  revision: z.number().int().nonnegative(),
  project_id: z.string().min(1),
  /** Catalog + rule-set versions this snapshot was validated against. */
  catalog_version: z.string().min(1),
  rule_set_version: z.string().min(1),
  nodes: z.array(DesignNodeSchema),
  edges: z.array(DesignEdgeSchema),
  /** Blocking overrides: typed written reason, logged, printed on the report. */
  overrides: z
    .array(
      z.object({
        violation_key: z.string().min(1),
        reason: z.string().min(10),
        actor: z.string().min(1),
        ts: z.string(),
      }),
    )
    .default([]),
});
export type DesignSnapshot = z.infer<typeof DesignSnapshotSchema>;

/* ------------------------------- events ------------------------------- */

/** Every mutation is an event. Undo/redo and the audit trail fall out of this. */
export const DesignEventSchema = z.object({
  id: z.string().min(1),
  design_id: z.string().min(1),
  seq: z.number().int().nonnegative(),
  ts: z.string(),
  actor: z.string().min(1),
  op: z.enum([
    'add_node',
    'update_node',
    'remove_node',
    'reparent_node',
    'add_edge',
    'remove_edge',
    'set_system_context',
    'apply_fix',
    'override_violation',
    'instantiate_assembly',
  ]),
  payload: z.record(z.string(), z.unknown()),
  /** Set when the mutation came from a one-click fix, for the diff panel. */
  caused_by: z
    .object({ violation_key: z.string(), fix_id: z.string() })
    .nullable()
    .default(null),
});
export type DesignEvent = z.infer<typeof DesignEventSchema>;

/* ----------------------------- graph index ---------------------------- */

/** Precomputed adjacency. Built once per validation pass, reused by all rules. */
export interface GraphIndex {
  nodesById: Map<string, DesignNode>;
  childrenOf: Map<string, string[]>;
  edgesFrom: Map<string, DesignEdge[]>;
  edgesTo: Map<string, DesignEdge[]>;
  byType: Map<NodeType, string[]>;
  /** Nearest ancestor of type 'system' — carries the PlatformContext. */
  systemOf: Map<string, string>;
}

export function buildIndex(snapshot: DesignSnapshot): GraphIndex {
  const nodesById = new Map<string, DesignNode>();
  const childrenOf = new Map<string, string[]>();
  const edgesFrom = new Map<string, DesignEdge[]>();
  const edgesTo = new Map<string, DesignEdge[]>();
  const byType = new Map<NodeType, string[]>();

  for (const n of snapshot.nodes) {
    nodesById.set(n.id, n);
    const list = byType.get(n.type);
    if (list) list.push(n.id);
    else byType.set(n.type, [n.id]);
    if (n.parent_id) {
      const kids = childrenOf.get(n.parent_id);
      if (kids) kids.push(n.id);
      else childrenOf.set(n.parent_id, [n.id]);
    }
  }
  for (const e of snapshot.edges) {
    const f = edgesFrom.get(e.from);
    if (f) f.push(e);
    else edgesFrom.set(e.from, [e]);
    const t = edgesTo.get(e.to);
    if (t) t.push(e);
    else edgesTo.set(e.to, [e]);
  }

  const systemOf = new Map<string, string>();
  const resolveSystem = (id: string, seen: Set<string>): string | undefined => {
    const cached = systemOf.get(id);
    if (cached) return cached;
    if (seen.has(id)) return undefined; // cycle guard
    seen.add(id);
    const node = nodesById.get(id);
    if (!node) return undefined;
    if (node.type === 'system') {
      systemOf.set(id, id);
      return id;
    }
    if (!node.parent_id) return undefined;
    const found = resolveSystem(node.parent_id, seen);
    if (found) systemOf.set(id, found);
    return found;
  };
  for (const n of snapshot.nodes) resolveSystem(n.id, new Set());

  return { nodesById, childrenOf, edgesFrom, edgesTo, byType, systemOf };
}

/** Nodes reachable from a mutated node — the dirty set for incremental revalidation. */
export function dirtyClosure(index: GraphIndex, seeds: string[], maxDepth = 6): Set<string> {
  const out = new Set<string>();
  let frontier = seeds.filter((id) => index.nodesById.has(id));
  for (const id of frontier) out.add(id);
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      const node = index.nodesById.get(id);
      if (node?.parent_id && !out.has(node.parent_id)) {
        out.add(node.parent_id);
        next.push(node.parent_id);
      }
      for (const child of index.childrenOf.get(id) ?? []) {
        if (!out.has(child)) {
          out.add(child);
          next.push(child);
        }
      }
      for (const e of index.edgesFrom.get(id) ?? []) {
        if (!out.has(e.to)) {
          out.add(e.to);
          next.push(e.to);
        }
      }
      for (const e of index.edgesTo.get(id) ?? []) {
        if (!out.has(e.from)) {
          out.add(e.from);
          next.push(e.from);
        }
      }
    }
    frontier = next;
  }
  return out;
}

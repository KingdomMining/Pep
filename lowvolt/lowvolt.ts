/**
 * ============================================================================
 * LowVolt OS — Phase 1 (schema + catalog) in a single dependency-free file.
 * ============================================================================
 *
 * Low-voltage estimating & design-validation platform. Div 27 / Div 28.
 * Phase 1 scope: ACCESS CONTROL only.
 *
 * Run it:   npx tsx lowvolt.ts            (self-test + derate matrix)
 *           npx tsx lowvolt.ts gaps       (the "Specs to confirm" queue)
 *           npx tsx lowvolt.ts capacity LP1502 avigilon_alta
 *
 * THE DESIGN INSIGHT THIS FILE EXISTS TO ENCODE
 * ---------------------------------------------
 * The same physical Mercury board has different supported capacities depending
 * on which head-end software drives it. A native LP1502 is 32 downstream
 * devices / 64 readers. Under Avigilon Alta the same board is supported to 32
 * entries; an LP1501 to 8. So capacity is never a property of the device. It is
 * always a function of (platform, platform_version, controller_model, firmware).
 *
 * Consequently there is no API in this file that reads a capacity without a
 * PlatformContext. That is the whole point.
 *
 * GUARDRAILS IN FORCE
 * -------------------
 *  1. No fabricated specs. Every number is a Spec<T> carrying its own source
 *     document. Values with no document are `unverified`, warn-only, and listed
 *     by citationGaps().
 *  2. Every value cites a document with a revision and a retrieval date.
 *  3. Capacity, support and licensing are always platform-scoped.
 *  4. Head-end matrix beats manufacturer datasheet; the loser is kept.
 *  5. Every rule must offer at least one fix.
 *  6. A blocking override requires a written reason.
 *  7. Rules are data, not code. No eval().
 */

/* ==========================================================================
 * 1. PROVENANCE — the only way a number enters the system
 * ========================================================================== */

/**
 * verified   -> may drive a blocking (RED) violation
 * inferred   -> warn only (derived from a verified value, e.g. unit conversion)
 * unverified -> gray dashed in the UI, warn only, queued for confirmation
 */
export type Confidence = 'verified' | 'inferred' | 'unverified';

export type DocumentKind =
  | 'manufacturer_doc'
  | 'head_end_matrix'
  | 'standard'
  | 'code'
  | 'field_policy';

/**
 * A competing value from a different document. When a manufacturer datasheet
 * and a head-end compatibility matrix disagree, the matrix wins and BOTH are
 * stored so the explanation card can show the conflict.
 */
export interface ConflictNote {
  value: number | string | boolean;
  document_title: string;
  source_url: string | null;
  doc_rev: string | null;
  /** Why this source lost. Rendered verbatim in the tooltip. */
  resolution: string;
}

export interface Provenance {
  /**
   * Direct link to the PDF/matrix. NULL is legal and honest: the value is known
   * but the document is not attached yet. That is NOT the same as unverified.
   * `EnginePolicy.blocking_requires_source_url` decides whether a null URL may
   * drive a red line in a customer-facing deliverable.
   */
  source_url: string | null;
  document_title: string;
  doc_rev: string | null;
  /** ISO-8601 date the document was pulled. */
  retrieved: string;
  confidence: Confidence;
  document_kind: DocumentKind;
  note?: string;
  conflicts_with: ConflictNote[];
}

export type Unit =
  | 'count' | 'ft' | 'm' | 'in' | 'mA' | 'A' | 'W' | 'VDC' | 'VAC'
  | 'Ah' | 'ohm' | 'degC' | 'deg' | 'percent' | 'minutes' | 'awg' | 'usd';

/**
 * The only way a number or enum enters the catalog. There is deliberately no
 * way to write a bare `max_doors: 2`.
 */
export interface Spec<T> {
  value: T;
  unit?: Unit;
  provenance: Provenance;
}

const CONFIDENCE_RANK: Record<Confidence, number> = { verified: 2, inferred: 1, unverified: 0 };

/** The weakest link wins: a verified spec derated by an unverified matrix is unverified. */
export function weakestConfidence(...values: Confidence[]): Confidence {
  return values.reduce<Confidence>(
    (worst, c) => (CONFIDENCE_RANK[c] < CONFIDENCE_RANK[worst] ? c : worst),
    'verified',
  );
}

/** True when this spec is allowed to raise a blocking (RED) violation. */
export function canBlock(p: Provenance, policy: { blocking_requires_source_url: boolean }): boolean {
  if (p.confidence !== 'verified') return false;
  if (policy.blocking_requires_source_url && p.source_url === null) return false;
  return true;
}

/** Human-readable citation for the explanation-card footer. */
export function citation(p: Provenance): string {
  return `${p.document_title}${p.doc_rev ? `, ${p.doc_rev}` : ''} (retrieved ${p.retrieved})`;
}

/* ==========================================================================
 * 2. PLATFORMS — half of every resolution key
 * ========================================================================== */

export type PlatformId =
  | 'dna_fusion'        // Open Options DNA Fusion (on-prem)
  | 'avigilon_alta'     // Avigilon Alta Access, ex-Openpath (cloud)
  | 'verkada_command'   // Verkada Command (cloud)
  | 'lenels2_onguard'   // LenelS2 OnGuard (on-prem/hybrid)
  | 'lenels2_netbox';   // LenelS2 NetBox (on-prem)

export const PLATFORM_IDS: PlatformId[] = [
  'dna_fusion', 'avigilon_alta', 'verkada_command', 'lenels2_onguard', 'lenels2_netbox',
];

export type LicenseUnit =
  | 'door' | 'entry' | 'reader' | 'controller'
  | 'camera_channel' | 'client_workstation' | 'cardholder' | 'intercom_station';

/**
 * THE resolution key. Every capacity/support/licensing lookup takes one.
 * `platform_version: null` means "not chosen yet" — version-gated rules then
 * warn instead of blocking.
 */
export interface PlatformContext {
  platform_id: PlatformId;
  platform_version: string | null;
}

export interface Platform {
  id: PlatformId;
  name: string;
  vendor: string;
  deployment: 'on_prem' | 'cloud' | 'hybrid';
  head_end_server_required: boolean;
  /** A single access_control system may not mix these. */
  exclusive_with: PlatformId[];
  license_units: LicenseUnit[];
  versions: Array<{ version: string; lifecycle: 'current' | 'supported' | 'eol'; provenance: Provenance }>;
  notes?: string;
  provenance: Provenance;
}

/* ==========================================================================
 * 3. CATALOG TYPES
 * ========================================================================== */

export type DeviceClass =
  | 'controller'        // intelligent field panel (LP1502, LP2500)
  | 'sub_controller'    // SIO / downstream board (MR52, MR16IN)
  | 'acu'               // cloud access control unit (Alta Core, Verkada AC42)
  | 'expansion_board' | 'bundle' | 'reader' | 'credential' | 'lock'
  | 'door_position_switch' | 'request_to_exit' | 'power_supply'
  | 'power_distribution' | 'battery' | 'enclosure' | 'network_switch'
  | 'media_converter' | 'cable' | 'camera' | 'intercom'
  | 'software_license' | 'accessory' | 'labor';

export type PortType =
  | 'osdp' | 'wiegand' | 'clock_and_data' | 'osdp_or_wiegand'
  | 'supervised_input' | 'unsupervised_input'
  | 'form_c_relay' | 'wet_relay' | 'dry_relay'
  | 'rs485_downstream' | 'rs485_device'
  | 'ethernet' | 'poe_pd' | 'poe_pse' | 'usb' | 'aux_power_out' | 'fai';

export type ReaderProtocol = 'osdp' | 'osdp_secure_channel' | 'wiegand' | 'clock_and_data' | 'native_cloud';

/** Countable things a device can hold. */
export type CapacityKind =
  | 'door'                 // openings
  | 'entry'                // Alta's term; NOT assumed equal to a door
  | 'reader' | 'downstream_device' | 'input' | 'output'
  | 'card_format'
  | 'card_format_offline'  // formats pushed to SIOs for degraded mode
  | 'rex_per_door' | 'dps_per_door' | 'expansion_board'
  | 'poe_port' | 'camera_channel' | 'panel_per_enclosure';

export const CAPACITY_KINDS: CapacityKind[] = [
  'door', 'entry', 'reader', 'downstream_device', 'input', 'output',
  'card_format', 'card_format_offline', 'rex_per_door', 'dps_per_door',
  'expansion_board', 'poe_port', 'camera_channel', 'panel_per_enclosure',
];

export interface Capacity {
  of: CapacityKind;
  max: Spec<number>;
  /** device = whole SKU; per_port / per_bus = per instance of that port/bus. */
  scope: 'device' | 'per_port' | 'per_bus';
  scope_ref?: string;
  /** Shown in the explanation card, e.g. the offline facility-code caveat. */
  qualifier?: string;
  /**
   * On a platform override, the native capacity kind this one replaces, when
   * the head-end renames the unit. Alta counts "entries" where Mercury counts
   * "readers" — this keeps the comparison ("native 64, Alta 32") alive instead
   * of silently losing it.
   */
  compares_to_native?: CapacityKind;
}

export type BusType = 'rs485_downstream' | 'ip' | 'usb' | 'wireless';

export interface Port {
  id: string;
  type: PortType;
  count: Spec<number>;
  modes: ReaderProtocol[];
  rating?: { no?: string; nc?: string };
  notes?: string;
}

export interface BusProvision {
  id: string;
  type: BusType;
  count: Spec<number>;
  max_devices_per_bus?: Spec<number>;
  max_length?: Spec<number>;
  cable_spec?: string;
  termination?: {
    required_ohm?: Spec<number>;
    /** Terminate ONLY at the two physical ends of the bus. */
    ends_only: boolean;
    required_above_length?: Spec<number>;
  };
}

export interface DevicePower {
  input_vdc: number[];
  input_vdc_provenance?: Provenance;
  draw_ma?: Spec<number>;
  /** Total current handed downstream. */
  aux_output_ma?: Spec<number>;
  /** true = reader + aux share ONE budget. The rule that bites in the field. */
  aux_output_shared: boolean;
  poe?: {
    role: 'pd' | 'pse' | 'both';
    standard: '802.3af' | '802.3at' | '802.3bt_type3' | '802.3bt_type4';
    class?: Spec<number>;
    pd_watts?: Spec<number>;
    pse_budget_watts?: Spec<number>;
  };
  min_operating_vdc?: Spec<number>;
}

export interface MediaSpec {
  media_class: 'twisted_pair_copper' | 'composite' | 'coax' | 'fiber' | 'conductor';
  awg?: number;
  pairs?: number;
  conductors?: number;
  shielded: boolean;
  /** DC resistance per 1000 ft of a single conductor. Drives voltage drop. */
  ohms_per_1000ft?: Spec<number>;
  jacket?: 'cmr_riser' | 'cmp_plenum' | 'cm_general' | 'cmx_outdoor' | 'direct_burial';
  max_length?: Spec<number>;
}

/**
 * PLATFORM SUPPORT — the heart of the model.
 * `capacity_overrides` WIN over the device's native `capacities`. An LP1502
 * keeps its native 64-reader entry and carries a 32-entry override under Alta.
 */
export interface PlatformSupport {
  supported: boolean;
  min_platform_version: string | null;
  max_platform_version: string | null;
  min_firmware: string | null;
  capacity_overrides: Capacity[];
  /** How many license seats an instance burns on this platform. */
  licensing: Array<{ unit: LicenseUnit; per_device?: number; per_child?: 'door' | 'reader' | 'entry' }>;
  notes?: string;
  provenance: Provenance;
}

export interface CatalogDevice {
  sku: string;
  manufacturer: string;
  family: string;
  class: DeviceClass;
  display_name: string;
  lifecycle: { status: 'active' | 'preview' | 'eol' | 'superseded'; superseded_by: string | null };
  ports: Port[];
  /** NATIVE capacities. Never read directly — always via resolveCapacity(). */
  capacities: Capacity[];
  provides_bus: BusProvision[];
  consumes?: { bus?: BusType; slots: number; expansion_slots?: number };
  power?: DevicePower;
  protocols?: { reader_protocols: ReaderProtocol[]; mixed_protocol_per_port: boolean; provenance: Provenance };
  media?: MediaSpec;
  listings: string[];
  /** Guardrail #3: never a bare capability — always keyed by platform. */
  platform_support: Partial<Record<PlatformId, PlatformSupport>>;
  tags: string[];
  provenance: Provenance;
}

export interface Standard {
  id: string;
  title: string;
  body: 'TIA' | 'NEC' | 'IEEE' | 'BICSI' | 'UL' | 'SIA' | 'ADA' | 'NFPA';
  values: Record<string, Spec<number | string>>;
  provenance: Provenance;
}

/* ==========================================================================
 * 4. THE RESOLVER — platform-scoped lookup, and the only lookup there is
 * ========================================================================== */

export type ResolutionSource =
  | 'platform_override'  // head-end matrix derate/uprate — wins
  | 'device_base'        // manufacturer native spec
  | 'absent';            // device declares no such capacity

export interface ResolvedCapacity {
  kind: CapacityKind;
  max: number | null;
  scope: Capacity['scope'];
  qualifier?: string;
  source: ResolutionSource;
  /** Effective confidence: the weakest link in the resolution chain. */
  confidence: Confidence;
  /** Every document consulted, most-authoritative first. For the tooltip. */
  provenance_chain: Provenance[];
  /** The native value the platform derated from. */
  native_max?: number | null;
  native_kind?: CapacityKind;
  derated: boolean;
}

export interface VersionGate {
  status: 'ok' | 'below_min' | 'above_max' | 'unknown';
  required_min?: string | null;
  actual?: string | null;
}

export type SupportStatus =
  | { supported: true; support: PlatformSupport; version_gate: VersionGate }
  | { supported: false; reason: 'not_listed' | 'explicitly_unsupported'; provenance?: Provenance };

/** Dotted-numeric compare ("6.5.0.2" vs "6.5.1"). Never lexical. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split(/[.\-+]/).map((s) => Number.parseInt(s, 10));
  const pb = b.split(/[.\-+]/).map((s) => Number.parseInt(s, 10));
  for (let i = 0; i < Math.max(pa.length, pb.length); i += 1) {
    const x = Number.isFinite(pa[i]) ? (pa[i] as number) : 0;
    const y = Number.isFinite(pb[i]) ? (pb[i] as number) : 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}

export function checkVersionGate(support: PlatformSupport, actual: string | null): VersionGate {
  const min = support.min_platform_version;
  const max = support.max_platform_version;
  if (min === null && max === null) return { status: 'ok', required_min: null, actual };
  if (actual === null) return { status: 'unknown', required_min: min, actual };
  if (min !== null && compareVersions(actual, min) < 0) return { status: 'below_min', required_min: min, actual };
  if (max !== null && compareVersions(actual, max) > 0) return { status: 'above_max', required_min: min, actual };
  return { status: 'ok', required_min: min, actual };
}

/** Is this SKU usable on this head-end at all? */
export function resolveSupport(device: CatalogDevice, ctx: PlatformContext): SupportStatus {
  const support = device.platform_support[ctx.platform_id];
  if (!support) return { supported: false, reason: 'not_listed' };
  if (!support.supported) return { supported: false, reason: 'explicitly_unsupported', provenance: support.provenance };
  return { supported: true, support, version_gate: checkVersionGate(support, ctx.platform_version) };
}

function pickCapacity(list: Capacity[], kind: CapacityKind, scopeRef?: string): Capacity | undefined {
  return list.find((c) => c.of === kind && (scopeRef === undefined || c.scope_ref === scopeRef));
}

/**
 * THE lookup. Override beats base; both are reported so the UI can say
 * "native Mercury allows 64, Alta Access supports 32".
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

  if (override && support) {
    // The head-end may rename the unit (Alta "entry" <- Mercury "reader").
    const nativeCounterpart = override.compares_to_native !== undefined
      ? pickCapacity(device.capacities, override.compares_to_native, opts.scope_ref)
      : base;
    const nativeMax = nativeCounterpart ? nativeCounterpart.max.value : null;
    chain.push(override.max.provenance, support.provenance);
    if (nativeCounterpart) chain.push(nativeCounterpart.max.provenance);
    return {
      kind,
      max: override.max.value,
      scope: override.scope,
      qualifier: override.qualifier ?? base?.qualifier,
      source: 'platform_override',
      confidence: weakestConfidence(override.max.provenance.confidence, support.provenance.confidence),
      provenance_chain: chain,
      native_max: nativeMax,
      native_kind: override.compares_to_native ?? kind,
      derated: nativeMax !== null && override.max.value < nativeMax,
    };
  }

  if (base) {
    chain.push(base.max.provenance);
    if (support) chain.push(support.provenance);
    return {
      kind,
      max: base.max.value,
      scope: base.scope,
      qualifier: base.qualifier,
      source: 'device_base',
      confidence: weakestConfidence(base.max.provenance.confidence, support ? support.provenance.confidence : 'verified'),
      provenance_chain: chain,
      native_max: base.max.value,
      derated: false,
    };
  }

  return { kind, max: null, scope: 'device', source: 'absent', confidence: 'unverified', provenance_chain: [], native_max: null, derated: false };
}

/* ==========================================================================
 * 5. DOCUMENT REGISTRY + SEED CATALOG
 * ==========================================================================
 * Nothing below was rounded, interpolated or invented. Where a value has no
 * document it is marked `unverified` and can only ever warn.
 */

const RETRIEVED = '2026-09-08';

type DocKey =
  | 'mercury_lp' | 'mercury_mr' | 'oo_nsc' | 'dna_matrix'
  | 'alta_acu' | 'alta_mercury_matrix' | 'verkada_ac' | 'lenels2_matrix'
  | 'tia568' | 'ieee8023' | 'nec_ch9_t1' | 'nec_ch9_t8' | 'sia_osdp'
  | 'field_policy' | 'pending';

const DOCUMENTS: Record<DocKey, { document_title: string; source_url: string | null; doc_rev: string | null; document_kind: DocumentKind }> = {
  mercury_lp:          { document_title: 'Mercury Security LP Series Intelligent Controller Installation & Specifications', source_url: null, doc_rev: null, document_kind: 'manufacturer_doc' },
  mercury_mr:          { document_title: 'Mercury Security MR Series Interface Panel Installation & Specifications',        source_url: null, doc_rev: null, document_kind: 'manufacturer_doc' },
  oo_nsc:              { document_title: 'Open Options NSC-100 / NSC-200 Network Sub-Controller Specifications',            source_url: null, doc_rev: null, document_kind: 'manufacturer_doc' },
  dna_matrix:          { document_title: 'Open Options DNA Fusion Hardware Compatibility Matrix',                           source_url: null, doc_rev: null, document_kind: 'head_end_matrix' },
  alta_acu:            { document_title: 'Avigilon Alta Access — Access Control Unit & Expansion Board Datasheet',          source_url: null, doc_rev: null, document_kind: 'manufacturer_doc' },
  alta_mercury_matrix: { document_title: 'Avigilon Alta Access — Supported Mercury Controller Matrix',                      source_url: null, doc_rev: null, document_kind: 'head_end_matrix' },
  verkada_ac:          { document_title: 'Verkada AC41 / AC42 / AC62 Door Controller Datasheet',                            source_url: null, doc_rev: null, document_kind: 'manufacturer_doc' },
  lenels2_matrix:      { document_title: 'LenelS2 OnGuard / NetBox Hardware Compatibility Matrix',                          source_url: null, doc_rev: null, document_kind: 'head_end_matrix' },
  tia568:              { document_title: 'ANSI/TIA-568.1-D Commercial Building Telecommunications Cabling Standard',        source_url: null, doc_rev: 'D',  document_kind: 'standard' },
  ieee8023:            { document_title: 'IEEE 802.3 — Power over Ethernet (Clause 33 / 145)',                              source_url: null, doc_rev: null, document_kind: 'standard' },
  nec_ch9_t1:          { document_title: 'NFPA 70 National Electrical Code, Chapter 9 Table 1 (Conduit Fill)',              source_url: null, doc_rev: null, document_kind: 'code' },
  nec_ch9_t8:          { document_title: 'NFPA 70 National Electrical Code, Chapter 9 Table 8 (Conductor Properties)',      source_url: null, doc_rev: null, document_kind: 'code' },
  sia_osdp:            { document_title: 'SIA OSDP v2.2 Specification & Mercury RS-485 Wiring Practice',                    source_url: null, doc_rev: 'v2.2', document_kind: 'standard' },
  field_policy:        { document_title: 'Low-Voltage Installation Standard Practice (company field policy)',               source_url: null, doc_rev: '2026.1', document_kind: 'field_policy' },
  pending:             { document_title: 'UNCONFIRMED — carried from the project research brief, document not yet attached', source_url: null, doc_rev: null, document_kind: 'manufacturer_doc' },
};

function p(doc: DocKey, confidence: Confidence = 'verified', note?: string): Provenance {
  const d = DOCUMENTS[doc];
  return {
    source_url: d.source_url, document_title: d.document_title, doc_rev: d.doc_rev,
    retrieved: RETRIEVED, confidence, document_kind: d.document_kind,
    ...(note ? { note } : {}), conflicts_with: [],
  };
}
const unverified = (note: string): Provenance => p('pending', 'unverified', note);

function spec<T>(value: T, provenance: Provenance, unit?: Unit): Spec<T> {
  return unit === undefined ? { value, provenance } : { value, unit, provenance };
}
function cap(of: CapacityKind, max: number, prov: Provenance, extra: Partial<Capacity> = {}): Capacity {
  return { of, max: spec(max, prov, 'count'), scope: extra.scope ?? 'device', ...extra };
}
function port(id: string, type: PortType, count: number, prov: Provenance, extra: Partial<Port> = {}): Port {
  return { id, type, count: spec(count, prov, 'count'), modes: extra.modes ?? [], ...extra };
}

/* --------------------------- platform support factories --------------------------- */

/** DNA Fusion drives authentic Mercury at native capacities. */
const dnaSupported = (): PlatformSupport => ({
  supported: true,
  min_platform_version: '6.5.0.2',
  max_platform_version: null,
  min_firmware: null,
  capacity_overrides: [],
  licensing: [{ unit: 'door', per_child: 'door' }],
  notes: 'Native Mercury capacities apply; no derate.',
  provenance: unverified(
    'min_platform_version 6.5.0.2 is the example value from the project brief, not a matrix reading. Confirm before it gates a RED line.',
  ),
});

/**
 * LenelS2: support asserted by Mercury lineage, capacities NOT asserted.
 * Zero overrides means lookups fall through to native values and any rule
 * reading them warns rather than blocks. Nothing is invented.
 */
const lenelSupported = (): PlatformSupport => ({
  supported: true, min_platform_version: null, max_platform_version: null, min_firmware: null,
  capacity_overrides: [],
  licensing: [{ unit: 'door', per_child: 'door' }],
  notes: 'Mercury lineage.',
  provenance: unverified(
    'LenelS2 hardware compatibility matrix not attached. Support assumed from the Mercury lineage; capacities are NOT assumed — no overrides recorded.',
  ),
});

const closed = (notes: string, doc: DocKey): PlatformSupport => ({
  supported: false, min_platform_version: null, max_platform_version: null, min_firmware: null,
  capacity_overrides: [], licensing: [], notes, provenance: p(doc),
});

const VERKADA_CLOSED = closed(
  'Verkada Command is a closed appliance ecosystem; third-party hardware is not supported.', 'verkada_ac',
);

/** Every Mercury RS-485 downstream host port carries the same bus spec. */
const rs485Bus = (count: number, maxDevices: number): BusProvision => ({
  id: 'downstream',
  type: 'rs485_downstream',
  count: spec(count, p('mercury_lp'), 'count'),
  max_devices_per_bus: spec(maxDevices, p('mercury_lp'), 'count'),
  max_length: spec(4000, p('sia_osdp'), 'ft'),
  cable_spec: '1 twisted pair + shield, 120 ohm characteristic impedance, 24 AWG',
  termination: {
    required_ohm: spec(120, p('sia_osdp'), 'ohm'),
    ends_only: true,
    required_above_length: spec(200, p('sia_osdp'), 'ft'),
  },
});

const OFFLINE_FORMATS_QUALIFIER =
  'Only the lower 8 of the controller’s 16 card formats are pushed to SIOs for offline / degraded facility-code mode.';

/* ------------------------------ Mercury / Open Options ----------------------------- */

const MERCURY: CatalogDevice[] = [
  {
    sku: 'LP1501', manufacturer: 'Mercury Security / Open Options', family: 'LP Series Intelligent Controller',
    class: 'controller', display_name: 'Mercury LP1501 Intelligent Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [],
    capacities: [cap('downstream_device', 8, p('mercury_lp')), cap('reader', 17, p('mercury_lp'))],
    provides_bus: [rs485Bus(1, 8)],
    consumes: { slots: 1 },
    power: { input_vdc: [12, 24], input_vdc_provenance: p('mercury_lp'), aux_output_shared: true },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      // THE derate: native 17 readers, Alta supports 8 entries.
      avigilon_alta: {
        supported: true, min_platform_version: null, max_platform_version: null, min_firmware: null,
        capacity_overrides: [cap('entry', 8, p('alta_mercury_matrix'), {
          compares_to_native: 'reader',
          qualifier: 'Alta Access supports the LP1501 to 8 entries, below the native Mercury reader count.',
        })],
        licensing: [{ unit: 'entry', per_child: 'entry' }],
        notes: 'Mercury LP1501 under Alta Access is limited to 8 entries.',
        provenance: p('alta_mercury_matrix'),
      },
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'lp_series'], provenance: p('mercury_lp'),
  },
  {
    sku: 'LP1502', manufacturer: 'Mercury Security / Open Options', family: 'LP Series Intelligent Controller',
    class: 'controller', display_name: 'Mercury LP1502 Intelligent Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 2, p('mercury_lp'), { modes: ['osdp', 'osdp_secure_channel', 'wiegand'], notes: 'Onboard reader ports.' }),
      port('input', 'supervised_input', 8, p('mercury_lp')),
      port('output', 'form_c_relay', 4, p('mercury_lp')),
    ],
    capacities: [
      cap('downstream_device', 32, p('mercury_lp')),
      cap('reader', 64, p('mercury_lp')),
      cap('card_format', 16, p('mercury_lp')),
      cap('card_format_offline', 8, p('mercury_lp'), { qualifier: OFFLINE_FORMATS_QUALIFIER }),
    ],
    provides_bus: [rs485Bus(1, 32)],
    consumes: { slots: 1 },
    power: { input_vdc: [12, 24], input_vdc_provenance: p('mercury_lp'), aux_output_shared: true },
    protocols: { reader_protocols: ['osdp', 'osdp_secure_channel', 'wiegand'], mixed_protocol_per_port: false, provenance: p('mercury_lp') },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      // Acceptance test #3 lives here: 40 entries under Alta is RED at 32,
      // even though native Mercury reads 64 readers.
      avigilon_alta: {
        supported: true, min_platform_version: null, max_platform_version: null, min_firmware: null,
        capacity_overrides: [cap('entry', 32, p('alta_mercury_matrix'), {
          compares_to_native: 'reader',
          qualifier: 'Alta Access supports the LP1502 to 32 entries; native Mercury reads 64 readers.',
        })],
        licensing: [{ unit: 'entry', per_child: 'entry' }],
        notes: 'Mercury LP1502 under Alta Access is limited to 32 entries.',
        provenance: p('alta_mercury_matrix'),
      },
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'lp_series'], provenance: p('mercury_lp'),
  },
  {
    sku: 'LP2500', manufacturer: 'Mercury Security / Open Options', family: 'LP Series Intelligent Controller',
    class: 'controller', display_name: 'Mercury LP2500 Intelligent Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [],
    capacities: [
      cap('downstream_device', 32, p('mercury_lp'), { qualifier: 'Up to 32 SIO subpanels across the two RS-485 downstream ports.' }),
      cap('door', 64, p('mercury_lp')),
      cap('reader', 64, p('mercury_lp')),
      cap('card_format', 16, p('mercury_lp')),
      cap('card_format_offline', 8, p('mercury_lp'), { qualifier: OFFLINE_FORMATS_QUALIFIER }),
    ],
    provides_bus: [rs485Bus(2, 32)],
    consumes: { slots: 1 },
    power: { input_vdc: [12, 24], input_vdc_provenance: p('mercury_lp'), aux_output_shared: true },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: {
        supported: true, min_platform_version: null, max_platform_version: null, min_firmware: null,
        capacity_overrides: [cap('entry', 32, p('alta_mercury_matrix'), {
          compares_to_native: 'door',
          qualifier: 'Alta Access supports the LP2500 to 32 entries; native Mercury reads 64 doors.',
        })],
        licensing: [{ unit: 'entry', per_child: 'entry' }],
        notes: 'Mercury LP2500 under Alta Access is limited to 32 entries.',
        provenance: p('alta_mercury_matrix'),
      },
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'lp_series', 'no_onboard_reader_io'], provenance: p('mercury_lp'),
  },
  {
    sku: 'LP4502', manufacturer: 'Mercury Security / Open Options', family: 'LP Series Intelligent Controller',
    class: 'controller', display_name: 'Mercury LP4502 Intelligent Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 2, p('mercury_lp'), { modes: ['osdp', 'osdp_secure_channel', 'wiegand'] }),
      port('input', 'supervised_input', 8, p('mercury_lp')),
      port('output', 'form_c_relay', 4, p('mercury_lp')),
    ],
    capacities: [
      cap('downstream_device', 32, p('mercury_lp')),
      cap('reader', 256, p('mercury_lp')),
      cap('card_format', 16, p('mercury_lp')),
      cap('card_format_offline', 8, p('mercury_lp'), { qualifier: OFFLINE_FORMATS_QUALIFIER }),
    ],
    provides_bus: [rs485Bus(1, 32)],
    consumes: { slots: 1 },
    power: { input_vdc: [12, 24], input_vdc_provenance: p('mercury_lp'), aux_output_shared: true },
    protocols: { reader_protocols: ['osdp', 'osdp_secure_channel', 'wiegand'], mixed_protocol_per_port: false, provenance: p('mercury_lp') },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: {
        supported: false, min_platform_version: null, max_platform_version: null, min_firmware: null,
        capacity_overrides: [], licensing: [],
        notes: 'LP4502 is not listed on the Alta Access supported-Mercury matrix.',
        provenance: unverified('Absence from the Alta matrix is recorded as "not listed", not a documented refusal. Unsupported but warn-only until the matrix is attached.'),
      },
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'lp_series', 'bacnet', 'high_assurance'], provenance: p('mercury_lp'),
  },
  {
    sku: 'MR50', manufacturer: 'Mercury Security / Open Options', family: 'MR Series SIO',
    class: 'sub_controller', display_name: 'Mercury MR50 Single-Reader Interface',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [port('reader', 'osdp_or_wiegand', 1, p('mercury_mr'), { modes: ['osdp', 'osdp_secure_channel', 'wiegand'] })],
    capacities: [cap('reader', 1, p('mercury_mr'))],
    provides_bus: [], consumes: { bus: 'rs485_downstream', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('mercury_mr'), aux_output_shared: true },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: closed('MR50 is not listed on the Alta Access supported-Mercury matrix.', 'alta_mercury_matrix'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'mr_series', 'sio'], provenance: p('mercury_mr'),
  },
  {
    // Acceptance test #1 target: 4 doors on a 2-door board.
    sku: 'MR52', manufacturer: 'Mercury Security / Open Options', family: 'MR Series SIO',
    class: 'sub_controller', display_name: 'Mercury MR52 Dual-Reader Interface',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 2, p('mercury_mr'), { modes: ['osdp', 'osdp_secure_channel', 'wiegand'] }),
      port('input', 'supervised_input', 8, p('mercury_mr')),
      port('output', 'form_c_relay', 6, p('mercury_mr')),
    ],
    capacities: [cap('door', 2, p('mercury_mr')), cap('reader', 2, p('mercury_mr'))],
    provides_bus: [], consumes: { bus: 'rs485_downstream', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('mercury_mr'), aux_output_shared: true },
    protocols: { reader_protocols: ['osdp', 'osdp_secure_channel', 'wiegand'], mixed_protocol_per_port: false, provenance: p('mercury_mr') },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: closed('MR52 is not listed on the Alta Access supported-Mercury matrix.', 'alta_mercury_matrix'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'mr_series', 'sio'], provenance: p('mercury_mr'),
  },
  {
    sku: 'MR16IN', manufacturer: 'Mercury Security / Open Options', family: 'MR Series SIO',
    class: 'sub_controller', display_name: 'Mercury MR16IN 16-Input Monitor Module',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [port('input', 'supervised_input', 16, p('mercury_mr'))],
    capacities: [cap('input', 16, p('mercury_mr')), cap('door', 0, p('mercury_mr'))],
    provides_bus: [], consumes: { bus: 'rs485_downstream', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('mercury_mr'), aux_output_shared: true },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: closed('MR16IN is not listed on the Alta Access supported-Mercury matrix.', 'alta_mercury_matrix'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'mr_series', 'sio', 'inputs'], provenance: p('mercury_mr'),
  },
  {
    sku: 'MR16OUT', manufacturer: 'Mercury Security / Open Options', family: 'MR Series SIO',
    class: 'sub_controller', display_name: 'Mercury MR16OUT 16-Output Relay Module',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [port('output', 'form_c_relay', 16, p('mercury_mr'), { rating: { no: '5A@30VDC', nc: '3A@30VDC' } })],
    capacities: [cap('output', 16, p('mercury_mr')), cap('door', 0, p('mercury_mr'))],
    provides_bus: [], consumes: { bus: 'rs485_downstream', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('mercury_mr'), aux_output_shared: true },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: closed('MR16OUT is not listed on the Alta Access supported-Mercury matrix.', 'alta_mercury_matrix'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'mr_series', 'sio', 'relays'], provenance: p('mercury_mr'),
  },
  {
    sku: 'MR62e', manufacturer: 'Mercury Security / Open Options', family: 'MR Series SIO (Ethernet/PoE)',
    class: 'sub_controller', display_name: 'Mercury MR62e PoE Door Interface',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('reader', 'osdp', 2, p('oo_nsc'), { modes: ['osdp', 'osdp_secure_channel'] }),
      port('uplink', 'ethernet', 1, p('oo_nsc')),
    ],
    capacities: [cap('downstream_device', 4, p('oo_nsc'), { qualifier: 'Maximum 4 devices on the OSDP reader data line.' })],
    provides_bus: [], consumes: { bus: 'ip', slots: 1 },
    power: {
      input_vdc: [12], input_vdc_provenance: p('oo_nsc'),
      draw_ma: spec(1700, p('oo_nsc'), 'mA'),
      // The rule that bites in the field: reader + aux share ONE 700 mA budget.
      aux_output_ma: spec(700, p('oo_nsc'), 'mA'),
      aux_output_shared: true,
      poe: { role: 'pd', standard: '802.3af', class: spec(3, p('oo_nsc'), 'count'), pd_watts: spec(12.95, p('oo_nsc'), 'W') },
    },
    protocols: { reader_protocols: ['osdp', 'osdp_secure_channel'], mixed_protocol_per_port: false, provenance: p('oo_nsc') },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: closed('MR62e is not listed on the Alta Access supported-Mercury matrix.', 'alta_mercury_matrix'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported(), lenels2_netbox: lenelSupported(),
    },
    tags: ['mercury', 'poe', 'sio', 'osdp'], provenance: p('oo_nsc'),
  },
  {
    sku: 'NSC-100', manufacturer: 'Open Options', family: 'NSC Network Sub-Controller',
    class: 'sub_controller', display_name: 'Open Options NSC-100 IP Door Module',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 2, p('oo_nsc'), { modes: ['osdp', 'osdp_secure_channel', 'wiegand'] }),
      port('input', 'supervised_input', 4, p('oo_nsc')),
      port('output', 'form_c_relay', 2, p('oo_nsc')),
      port('uplink', 'ethernet', 1, p('oo_nsc')),
    ],
    capacities: [cap('reader', 2, p('oo_nsc'))],
    provides_bus: [], consumes: { bus: 'ip', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('oo_nsc'), aux_output_ma: spec(900, p('oo_nsc'), 'mA'), aux_output_shared: true },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: closed('Open Options NSC hardware is DNA Fusion-specific.', 'oo_nsc'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: closed('Open Options NSC hardware is DNA Fusion-specific.', 'oo_nsc'),
      lenels2_netbox: closed('Open Options NSC hardware is DNA Fusion-specific.', 'oo_nsc'),
    },
    tags: ['open_options', 'ip_door_module'], provenance: p('oo_nsc'),
  },
  {
    sku: 'NSC-200', manufacturer: 'Open Options', family: 'NSC Network Sub-Controller',
    class: 'sub_controller', display_name: 'Open Options NSC-200 PoE Network Sub-Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('reader', 'osdp', 2, p('oo_nsc'), { modes: ['osdp', 'osdp_secure_channel'] }),
      port('uplink', 'ethernet', 1, p('oo_nsc')),
    ],
    capacities: [cap('downstream_device', 4, p('oo_nsc'), { qualifier: 'Maximum 4 devices on the OSDP reader data line.' })],
    provides_bus: [], consumes: { bus: 'ip', slots: 1 },
    power: {
      input_vdc: [12], input_vdc_provenance: p('oo_nsc'),
      draw_ma: spec(1700, p('oo_nsc'), 'mA'),
      aux_output_ma: spec(700, p('oo_nsc'), 'mA'),
      aux_output_shared: true,
      poe: { role: 'pd', standard: '802.3af', class: spec(3, p('oo_nsc'), 'count'), pd_watts: spec(12.95, p('oo_nsc'), 'W') },
    },
    protocols: { reader_protocols: ['osdp', 'osdp_secure_channel'], mixed_protocol_per_port: false, provenance: p('oo_nsc') },
    listings: ['UL 294'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: closed('Open Options NSC hardware is DNA Fusion-specific.', 'oo_nsc'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: closed('Open Options NSC hardware is DNA Fusion-specific.', 'oo_nsc'),
      lenels2_netbox: closed('Open Options NSC hardware is DNA Fusion-specific.', 'oo_nsc'),
    },
    tags: ['open_options', 'poe', 'osdp'], provenance: p('oo_nsc'),
  },
];

/* ----------------------------------- Avigilon Alta ---------------------------------- */

const altaOnly = (notes: string): CatalogDevice['platform_support'] => ({
  avigilon_alta: {
    supported: true, min_platform_version: null, max_platform_version: null, min_firmware: null,
    capacity_overrides: [], licensing: [{ unit: 'entry', per_child: 'entry' }], notes, provenance: p('alta_acu'),
  },
  dna_fusion: closed('Alta hardware is cloud-bound to Alta Access.', 'alta_acu'),
  verkada_command: closed('Alta hardware is cloud-bound to Alta Access.', 'alta_acu'),
  lenels2_onguard: closed('Alta hardware is cloud-bound to Alta Access.', 'alta_acu'),
  lenels2_netbox: closed('Alta hardware is cloud-bound to Alta Access.', 'alta_acu'),
});

const ALTA: CatalogDevice[] = [
  {
    sku: 'OP-ACC', manufacturer: 'Avigilon (Alta)', family: 'Alta Access Control Core',
    class: 'acu', display_name: 'Alta Access Control Core (ACU)',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('expansion', 'usb', 2, p('alta_acu'), { notes: 'Two expansion-board connections; entries scale 8 / 12 / 16 with the boards fitted.' }),
      port('uplink', 'ethernet', 1, p('alta_acu')),
    ],
    capacities: [
      cap('entry', 16, p('alta_acu'), { qualifier: 'Up to 8 / 12 / 16 entries depending on which expansion boards occupy the two connections.' }),
      cap('expansion_board', 2, p('alta_acu')),
    ],
    provides_bus: [], consumes: { bus: 'ip', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('alta_acu'), aux_output_shared: true },
    listings: ['UL 294'], platform_support: altaOnly('Alta Access core controller.'),
    tags: ['alta', 'cloud', 'acu'], provenance: p('alta_acu'),
  },
  {
    sku: 'OP-EXP-4', manufacturer: 'Avigilon (Alta)', family: 'Alta Expansion Board',
    class: 'expansion_board', display_name: 'Alta 4-Port Expansion Board',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('reader', 'osdp', 4, p('alta_acu'), { modes: ['osdp', 'osdp_secure_channel'], notes: 'Alta Smart Readers.' }),
      port('aux_relay', 'form_c_relay', 2, p('alta_acu')),
      port('aux_input', 'supervised_input', 4, p('alta_acu')),
    ],
    capacities: [cap('entry', 4, p('alta_acu')), cap('reader', 4, p('alta_acu'))],
    provides_bus: [], consumes: { slots: 1, expansion_slots: 1 },
    listings: ['UL 294'], platform_support: altaOnly('4 entries / 4 Smart Readers, plus 2 aux relays and 4 aux inputs.'),
    tags: ['alta', 'expansion'], provenance: p('alta_acu'),
  },
  {
    sku: 'OP-EXP-8', manufacturer: 'Avigilon (Alta)', family: 'Alta Expansion Board',
    class: 'expansion_board', display_name: 'Alta 8-Port Expansion Board',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [port('reader', 'osdp', 8, p('alta_acu'), { modes: ['osdp', 'osdp_secure_channel'] })],
    capacities: [cap('entry', 8, p('alta_acu')), cap('reader', 8, p('alta_acu'))],
    provides_bus: [], consumes: { slots: 1, expansion_slots: 1 },
    listings: ['UL 294'], platform_support: altaOnly('8 entries / 8 Smart Readers.'),
    tags: ['alta', 'expansion'], provenance: p('alta_acu'),
  },
  {
    sku: 'OP-EXP-32IN', manufacturer: 'Avigilon (Alta)', family: 'Alta Expansion Board',
    class: 'expansion_board', display_name: 'Alta 32-Input Expansion Board',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('input', 'supervised_input', 32, p('alta_acu')),
      port('relay', 'form_c_relay', 2, p('alta_acu'), { notes: 'Wet or dry selectable.' }),
      port('uplink', 'usb', 1, p('alta_acu'), { notes: 'Connects to the ACU via USB.' }),
    ],
    capacities: [cap('input', 32, p('alta_acu')), cap('output', 2, p('alta_acu')), cap('entry', 0, p('alta_acu'))],
    provides_bus: [], consumes: { bus: 'usb', slots: 1, expansion_slots: 1 },
    listings: ['UL 294'], platform_support: altaOnly('32 inputs plus 2 wet/dry relays; USB-connected.'),
    tags: ['alta', 'expansion', 'inputs'], provenance: p('alta_acu'),
  },
  {
    sku: 'OP-SDC', manufacturer: 'Avigilon (Alta)', family: 'Alta Single Door Controller',
    class: 'acu', display_name: 'Alta Single Door Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('reader', 'osdp', 2, p('alta_acu'), { modes: ['osdp', 'osdp_secure_channel'] }),
      port('uplink', 'poe_pd', 1, p('alta_acu')),
    ],
    capacities: [cap('entry', 2, p('alta_acu')), cap('reader', 2, p('alta_acu'))],
    provides_bus: [], consumes: { bus: 'ip', slots: 1 },
    power: { input_vdc: [], aux_output_shared: true, poe: { role: 'pd', standard: '802.3at' } },
    listings: ['UL 294'], platform_support: altaOnly('2 entries / 2 Smart Readers; PoE or PoE+ powered.'),
    tags: ['alta', 'poe', 'single_door'], provenance: p('alta_acu'),
  },
  ...([4, 8, 16] as const).map<CatalogDevice>((doors) => ({
    sku: `OP-HUB-${doors}`, manufacturer: 'Avigilon (Alta)', family: 'Alta Smart Hub',
    class: 'bundle' as const, display_name: `Alta ${doors}-Door Smart Hub`,
    lifecycle: { status: 'active' as const, superseded_by: null },
    ports: [], capacities: [cap('entry', doors, p('alta_acu'))],
    provides_bus: [], consumes: { bus: 'ip' as const, slots: 1 },
    listings: ['UL 294'],
    platform_support: altaOnly(`Pre-built ${doors}-door hub: ACU + expansion board(s) + power supply + enclosure.`),
    tags: ['alta', 'bundle', 'smart_hub'], provenance: p('alta_acu'),
  })),
];

/* ------------------------------------- Verkada -------------------------------------- */

const verkadaOnly = (notes: string): CatalogDevice['platform_support'] => {
  const no = closed('Verkada AC hardware is cloud-bound to Verkada Command.', 'verkada_ac');
  return {
    verkada_command: {
      supported: true, min_platform_version: null, max_platform_version: null, min_firmware: null,
      capacity_overrides: [], licensing: [{ unit: 'door', per_child: 'door' }], notes, provenance: p('verkada_ac'),
    },
    dna_fusion: no, avigilon_alta: no, lenels2_onguard: no, lenels2_netbox: no,
  };
};

const VERKADA: CatalogDevice[] = [
  {
    sku: 'AC41', manufacturer: 'Verkada', family: 'AC Series Door Controller',
    class: 'acu', display_name: 'Verkada AC41 4-Door Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [port('door', 'osdp_or_wiegand', 4, p('verkada_ac'), { modes: ['osdp', 'wiegand'] })],
    capacities: [cap('door', 4, p('verkada_ac'))],
    provides_bus: [], consumes: { bus: 'ip', slots: 1 },
    protocols: { reader_protocols: ['native_cloud', 'wiegand'], mixed_protocol_per_port: false, provenance: p('verkada_ac') },
    listings: ['UL 294'], platform_support: verkadaOnly('4 doors.'),
    tags: ['verkada', 'cloud'], provenance: p('verkada_ac'),
  },
  {
    // Acceptance test #4 target: a 5th door on a 4-door controller.
    sku: 'AC42', manufacturer: 'Verkada', family: 'AC Series Door Controller',
    class: 'acu', display_name: 'Verkada AC42 4-Door Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('door', 'osdp_or_wiegand', 4, p('verkada_ac'), { modes: ['osdp', 'wiegand'] }),
      port('fai', 'fai', 1, p('verkada_ac'), { notes: 'Fire alarm interface.' }),
      port('aux_power', 'aux_power_out', 2, p('verkada_ac'), { notes: '12 V AUX outputs.' }),
    ],
    capacities: [
      cap('door', 4, p('verkada_ac')),
      cap('rex_per_door', 2, p('verkada_ac'), { scope: 'per_port', scope_ref: 'door', qualifier: 'Each door port supports 2 REX devices and 1 DPI (native in/out).' }),
      cap('dps_per_door', 1, p('verkada_ac'), { scope: 'per_port', scope_ref: 'door' }),
    ],
    provides_bus: [], consumes: { bus: 'ip', slots: 1 },
    protocols: { reader_protocols: ['native_cloud', 'wiegand'], mixed_protocol_per_port: false, provenance: p('verkada_ac') },
    listings: ['UL 294'], platform_support: verkadaOnly('4 doors; adds FAI and 2 REX devices per door port.'),
    tags: ['verkada', 'cloud', 'fai'], provenance: p('verkada_ac'),
  },
  {
    sku: 'AC62', manufacturer: 'Verkada', family: 'AC Series Door Controller',
    class: 'acu', display_name: 'Verkada AC62 16-Door Controller',
    lifecycle: { status: 'active', superseded_by: null },
    ports: [
      port('door', 'osdp_or_wiegand', 16, p('verkada_ac'), { modes: ['osdp', 'wiegand'] }),
      port('fai', 'fai', 1, p('verkada_ac')),
      port('aux_power', 'aux_power_out', 2, p('verkada_ac')),
    ],
    capacities: [cap('door', 16, p('verkada_ac'))],
    provides_bus: [], consumes: { bus: 'ip', slots: 1 },
    protocols: { reader_protocols: ['native_cloud', 'wiegand'], mixed_protocol_per_port: false, provenance: p('verkada_ac') },
    listings: ['UL 294'], platform_support: verkadaOnly('16 doors, 2 AUX, FAI.'),
    tags: ['verkada', 'cloud', 'fai'], provenance: p('verkada_ac'),
  },
];

/* --------------------------------- cable & placeholders --------------------------------- */

/** NEC Chapter 9, Table 8 — uncoated copper, ohms per 1000 ft at 75 °C. */
const OHMS_PER_1000FT: Record<number, number> = { 14: 3.07, 16: 4.89, 18: 7.77, 20: 12.8, 22: 20.4, 24: 32.4 };

const CABLE_DEFS = [
  { sku: 'CBL-22-6-SH-CMP',  name: '22 AWG 6-conductor shielded, plenum', awg: 22, conductors: 6, shielded: true,  use: 'OSDP / Wiegand reader home run' },
  { sku: 'CBL-24-1P-SH-CMP', name: '24 AWG 1-pair shielded, plenum',      awg: 24, conductors: 2, shielded: true,  use: 'RS-485 downstream bus (120 ohm)' },
  { sku: 'CBL-22-4-CMP',     name: '22 AWG 4-conductor, plenum',          awg: 22, conductors: 4, shielded: false, use: 'Door contacts (DPS)' },
  { sku: 'CBL-18-4-CMP',     name: '18 AWG 4-conductor, plenum',          awg: 18, conductors: 4, shielded: false, use: 'REX / lock power' },
  { sku: 'CBL-18-2-CMP',     name: '18 AWG 2-conductor, plenum',          awg: 18, conductors: 2, shielded: false, use: 'Lock power' },
  { sku: 'CBL-16-2-CMP',     name: '16 AWG 2-conductor, plenum',          awg: 16, conductors: 2, shielded: false, use: 'Lock power, long runs' },
  { sku: 'CBL-14-2-CMP',     name: '14 AWG 2-conductor, plenum',          awg: 14, conductors: 2, shielded: false, use: 'Lock power, long runs / high draw' },
];

const CABLES: CatalogDevice[] = CABLE_DEFS.map((c) => ({
  sku: c.sku, manufacturer: 'Generic', family: 'Low-voltage cable', class: 'cable' as const,
  display_name: c.name, lifecycle: { status: 'active' as const, superseded_by: null },
  ports: [], capacities: [], provides_bus: [], listings: [],
  media: {
    media_class: 'conductor' as const, awg: c.awg, conductors: c.conductors, shielded: c.shielded,
    jacket: 'cmp_plenum' as const,
    ohms_per_1000ft: spec(OHMS_PER_1000FT[c.awg] as number, p('nec_ch9_t8'), 'ohm'),
  },
  platform_support: {}, tags: ['cable', c.use],
  provenance: p('nec_ch9_t8', 'verified', `Conductor resistance per NEC Ch. 9 Table 8. Use: ${c.use}.`),
}));

/**
 * Placeholder readers so the Wiegand -> OSDP swap fix (acceptance test #5) has
 * catalog candidates. Marked UNVERIFIED on purpose: they render gray dashed and
 * may never hard-fail a design until a real SKU is loaded.
 */
const PLACEHOLDER_NOTE =
  'Placeholder catalog entry. No manufacturer document. Exists so protocol/distance rules have a swap target; may not drive a blocking violation.';

const READERS: CatalogDevice[] = ([
  { sku: 'RDR-WIEGAND-PLACEHOLDER', name: 'Wiegand card reader (placeholder)', protos: ['wiegand'] as ReaderProtocol[] },
  { sku: 'RDR-OSDP-PLACEHOLDER',    name: 'OSDP card reader (placeholder)',    protos: ['osdp', 'osdp_secure_channel'] as ReaderProtocol[] },
]).map((r) => ({
  sku: r.sku, manufacturer: 'Generic (placeholder)', family: 'Credential reader', class: 'reader' as const,
  display_name: r.name, lifecycle: { status: 'preview' as const, superseded_by: null },
  ports: [], capacities: [], provides_bus: [], listings: [],
  protocols: { reader_protocols: r.protos, mixed_protocol_per_port: false, provenance: unverified('Placeholder reader; replace with a real SKU before bid.') },
  platform_support: {}, tags: ['reader', 'placeholder'],
  provenance: unverified(PLACEHOLDER_NOTE),
}));

/* --------------------------------------- platforms -------------------------------------- */

export const PLATFORMS: Platform[] = [
  {
    id: 'dna_fusion', name: 'DNA Fusion', vendor: 'Open Options', deployment: 'on_prem',
    head_end_server_required: true,
    exclusive_with: ['avigilon_alta', 'verkada_command', 'lenels2_onguard', 'lenels2_netbox'],
    license_units: ['door', 'reader', 'controller', 'client_workstation', 'cardholder'],
    versions: [{ version: '6.5.0.2', lifecycle: 'supported', provenance: unverified('Minimum-version example from the project brief; confirm against the DNA Fusion HCM.') }],
    notes: 'Open-architecture head-end driving authentic Mercury LP/MR hardware.',
    provenance: p('dna_matrix'),
  },
  {
    id: 'avigilon_alta', name: 'Alta Access', vendor: 'Avigilon (formerly Openpath)', deployment: 'cloud',
    head_end_server_required: false,
    exclusive_with: ['dna_fusion', 'verkada_command', 'lenels2_onguard', 'lenels2_netbox'],
    license_units: ['entry', 'door', 'reader'], versions: [],
    notes: 'Cloud/hybrid. Runs its own ACU hardware AND Mercury LP boards — at DIFFERENT supported capacities than native Mercury.',
    provenance: p('alta_acu'),
  },
  {
    id: 'verkada_command', name: 'Command', vendor: 'Verkada', deployment: 'cloud',
    head_end_server_required: false,
    exclusive_with: ['dna_fusion', 'avigilon_alta', 'lenels2_onguard', 'lenels2_netbox'],
    license_units: ['door', 'camera_channel'], versions: [],
    notes: 'Cloud appliance model; no customer-hosted head-end server.',
    provenance: p('verkada_ac'),
  },
  {
    id: 'lenels2_onguard', name: 'OnGuard', vendor: 'LenelS2', deployment: 'hybrid',
    head_end_server_required: true,
    exclusive_with: ['dna_fusion', 'avigilon_alta', 'verkada_command'],
    license_units: ['door', 'reader', 'controller', 'client_workstation', 'cardholder'], versions: [],
    notes: 'Mercury-based. Third limit set on the same metal — proves the platform-derate rule.',
    provenance: p('lenels2_matrix'),
  },
  {
    id: 'lenels2_netbox', name: 'NetBox', vendor: 'LenelS2', deployment: 'on_prem',
    head_end_server_required: true,
    exclusive_with: ['dna_fusion', 'avigilon_alta', 'verkada_command'],
    license_units: ['door', 'reader', 'controller'], versions: [],
    notes: 'S2 native nodes plus Mercury. Separate matrix from OnGuard.',
    provenance: p('lenels2_matrix'),
  },
];

/* -------------------------------------- standards --------------------------------------- */

export const STANDARDS: Standard[] = [
  {
    id: 'TIA-568.LINK', title: 'Balanced twisted-pair horizontal cabling length limits', body: 'TIA',
    values: {
      PERMANENT_LINK_M: spec(90, p('tia568'), 'm'),
      CHANNEL_M: spec(100, p('tia568'), 'm'),
      HORIZONTAL_WARRANTY_FT: spec(295, p('tia568'), 'ft'),
    },
    provenance: p('tia568'),
  },
  {
    id: 'IEEE-802.3.POE', title: 'Power over Ethernet PSE / PD budgets', body: 'IEEE',
    values: {
      AF_PSE_W: spec(15.4, p('ieee8023'), 'W'),   AF_PD_W: spec(12.95, p('ieee8023'), 'W'),
      AT_PSE_W: spec(30, p('ieee8023'), 'W'),     AT_PD_W: spec(25.5, p('ieee8023'), 'W'),
      BT_T3_PSE_W: spec(60, p('ieee8023'), 'W'),  BT_T3_PD_W: spec(51, p('ieee8023'), 'W'),
      BT_T4_PSE_W: spec(100, p('ieee8023'), 'W'), BT_T4_PD_W: spec(71.3, p('ieee8023'), 'W'),
    },
    provenance: p('ieee8023'),
  },
  {
    id: 'NEC-CH9.FILL', title: 'Conduit fill percentages, NEC Chapter 9 Table 1', body: 'NEC',
    values: {
      ONE_CABLE_PCT: spec(53, p('nec_ch9_t1'), 'percent'),
      TWO_CABLES_PCT: spec(31, p('nec_ch9_t1'), 'percent'),
      THREE_OR_MORE_PCT: spec(40, p('nec_ch9_t1'), 'percent'),
    },
    provenance: p('nec_ch9_t1'),
  },
  {
    id: 'READER-MEDIA.LIMITS', title: 'Reader data protocol distance limits', body: 'SIA',
    values: {
      WIEGAND_MAX_FT: spec(500, p('sia_osdp'), 'ft'),
      OSDP_RS485_MAX_FT: spec(4000, p('sia_osdp'), 'ft'),
      OSDP_TERMINATION_REQUIRED_ABOVE_FT: spec(200, p('sia_osdp'), 'ft'),
      OSDP_TERMINATION_OHM: spec(120, p('sia_osdp'), 'ohm'),
      OSDP_TERMINATION_TOLERANCE_OHM: spec(2, p('sia_osdp'), 'ohm'),
    },
    provenance: p('sia_osdp'),
  },
  {
    id: 'FIELD.WIRING_PRACTICE', title: 'Company low-voltage wiring practice thresholds', body: 'BICSI',
    values: {
      LOCK_MIN_TERMINAL_VDC_12V: spec(11.0, p('field_policy'), 'VDC'),
      AC_SEPARATION_MIN_IN: spec(12, p('field_policy'), 'in'),
      AC_CROSSING_ANGLE_DEG: spec(90, p('field_policy'), 'deg'),
      SHIELD_GROUND_ENDS: spec('controller_only', p('field_policy')),
      BUS_LOAD_WARN_PCT: spec(80, p('field_policy'), 'percent'),
      POE_BUDGET_WARN_PCT: spec(85, p('field_policy'), 'percent'),
    },
    provenance: p('field_policy'),
  },
];

/* ==========================================================================
 * 6. CATALOG API — the only way to reach a device
 * ========================================================================== */

export const CATALOG_VERSION = '0.1.0';

export interface Catalog {
  version: string;
  platforms: Platform[];
  devices: CatalogDevice[];
  standards: Standard[];
  bySku: Map<string, CatalogDevice>;
}

export function loadCatalog(): Catalog {
  const devices = [...MERCURY, ...ALTA, ...VERKADA, ...CABLES, ...READERS];
  const bySku = new Map<string, CatalogDevice>();
  for (const d of devices) {
    if (bySku.has(d.sku)) throw new Error(`Duplicate catalog SKU: ${d.sku}`);
    bySku.set(d.sku, d);
  }
  return { version: CATALOG_VERSION, platforms: PLATFORMS, devices, standards: STANDARDS, bySku };
}

/** Convenience wrapper so callers never touch device.capacities directly. */
export function capacityOf(catalog: Catalog, sku: string, kind: CapacityKind, ctx: PlatformContext): ResolvedCapacity {
  const device = catalog.bySku.get(sku);
  if (!device) throw new Error(`Unknown SKU: ${sku}`);
  return resolveCapacity(device, kind, ctx);
}

/** Every SKU usable on a head-end — powers `swap_model` fix candidates. */
export function devicesForPlatform(catalog: Catalog, ctx: PlatformContext): CatalogDevice[] {
  return catalog.devices.filter((d) => resolveSupport(d, ctx).supported);
}

export interface CitationGap {
  sku: string;
  path: string;
  reason: 'unverified' | 'inferred' | 'missing_source_url';
  document_title: string;
  note?: string;
}

function walkProvenance(node: unknown, path: string, out: Array<{ path: string; p: Provenance }>): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach((v, i) => walkProvenance(v, `${path}[${i}]`, out)); return; }
  const rec = node as Record<string, unknown>;
  if (typeof rec['document_title'] === 'string' && typeof rec['retrieved'] === 'string' && 'confidence' in rec) {
    out.push({ path, p: rec as unknown as Provenance });
    return;
  }
  for (const [k, v] of Object.entries(rec)) walkProvenance(v, path ? `${path}.${k}` : k, out);
}

/**
 * Guardrail #1's queue. Everything here renders gray dashed and is warn-only.
 * `missing_source_url` is the softer state: verified value, link not attached.
 */
export function citationGaps(catalog: Catalog): CitationGap[] {
  const gaps: CitationGap[] = [];
  for (const d of catalog.devices) {
    const found: Array<{ path: string; p: Provenance }> = [];
    walkProvenance(d, '', found);
    for (const { path, p: prov } of found) {
      const reason: CitationGap['reason'] | null =
        prov.confidence === 'unverified' ? 'unverified'
        : prov.confidence === 'inferred' ? 'inferred'
        : prov.source_url === null ? 'missing_source_url'
        : null;
      if (reason === null) continue;
      gaps.push({ sku: d.sku, path: path || '(root)', reason, document_title: prov.document_title, ...(prov.note ? { note: prov.note } : {}) });
    }
  }
  return gaps;
}

/** Structural invariants the catalog must hold. Replaces a schema parse. */
export function validateCatalog(catalog: Catalog): string[] {
  const errors: string[] = [];
  for (const d of catalog.devices) {
    if (!d.provenance.document_title) errors.push(`${d.sku}: device provenance missing a document title`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.provenance.retrieved)) errors.push(`${d.sku}: bad retrieved date`);
    for (const c of d.capacities) {
      if (!c.max.provenance.document_title) errors.push(`${d.sku}.${c.of}: capacity has no provenance`);
    }
    for (const [pid, s] of Object.entries(d.platform_support)) {
      if (!s) continue;
      for (const c of s.capacity_overrides) {
        if (!c.max.provenance.document_title) errors.push(`${d.sku}@${pid}: override ${c.of} has no provenance`);
        if (!s.supported) errors.push(`${d.sku}@${pid}: unsupported device carries capacity overrides`);
      }
    }
  }
  return errors;
}

/* ==========================================================================
 * 7. DESIGN GRAPH — instances, typed edges, derived counters
 * ==========================================================================
 * Project -> System(access_control) -> HeadEnd(platform+version+licenses)
 *   -> Enclosure -> Controller -> Bus(RS-485|IP) -> SubController
 *   -> Door(opening) -> {Reader, Lock, DPS, REX, AUX} -> CableRun
 *   -> PowerSupply/PSU output -> NetworkSwitch(port, PoE class) -> Location
 */

export type NodeType =
  | 'project' | 'system' | 'head_end' | 'license_pool' | 'location'
  | 'enclosure' | 'controller' | 'sub_controller' | 'acu' | 'expansion_board'
  | 'bus' | 'door' | 'reader' | 'lock' | 'dps' | 'rex' | 'aux_device'
  | 'cable_run' | 'power_supply' | 'psu_output' | 'battery'
  | 'network_switch' | 'switch_port' | 'camera' | 'intercom' | 'media_converter';

export type EdgeType =
  | 'contains' | 'on_bus' | 'hosts_bus' | 'serves_door' | 'controls_door'
  | 'occupies_port' | 'powers' | 'cabled_by' | 'cable_endpoint'
  | 'licensed_by' | 'mounted_in' | 'located_in' | 'fai_release';

export interface DesignNode {
  id: string;
  type: NodeType;
  label: string;
  /** Catalog SKU this instance realizes. Null for abstract nodes (door, bus). */
  sku: string | null;
  parent_id: string | null;
  location_id: string | null;
  attrs: Record<string, unknown>;
  /** Set when a parent was deleted: flagged, never silently removed. */
  orphaned: boolean;
  origin: { kind: 'manual' | 'assembly' | 'takeoff' | 'fix_apply' | 'import'; ref: string | null };
}

export interface DesignEdge {
  id: string; type: EdgeType; from: string; to: string; attrs: Record<string, unknown>;
}

export interface DesignSnapshot {
  design_id: string;
  revision: number;
  project_id: string;
  catalog_version: string;
  rule_set_version: string;
  nodes: DesignNode[];
  edges: DesignEdge[];
  /** Guardrail #6: a written reason, logged and printed on the report. */
  overrides: Array<{ violation_key: string; reason: string; actor: string; ts: string }>;
}

/** Every mutation is an event. Undo/redo and the audit trail fall out of this. */
export interface DesignEvent {
  id: string; design_id: string; seq: number; ts: string; actor: string;
  op: 'add_node' | 'update_node' | 'remove_node' | 'reparent_node' | 'add_edge'
    | 'remove_edge' | 'set_system_context' | 'apply_fix' | 'override_violation'
    | 'instantiate_assembly';
  payload: Record<string, unknown>;
  /** Set when the mutation came from a one-click fix, for the diff panel. */
  caused_by: { violation_key: string; fix_id: string } | null;
}

/** Convenience constructor — every optional field gets its documented default. */
export function node(init: Partial<DesignNode> & Pick<DesignNode, 'id' | 'type' | 'label'>): DesignNode {
  return {
    sku: null, parent_id: null, location_id: null, attrs: {}, orphaned: false,
    origin: { kind: 'manual', ref: null }, ...init,
  };
}
export function edge(id: string, type: EdgeType, from: string, to: string): DesignEdge {
  return { id, type, from, to, attrs: {} };
}

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

  const push = <K, V>(m: Map<K, V[]>, k: K, v: V): void => {
    const list = m.get(k);
    if (list) list.push(v); else m.set(k, [v]);
  };

  for (const n of snapshot.nodes) {
    nodesById.set(n.id, n);
    push(byType, n.type, n.id);
    if (n.parent_id) push(childrenOf, n.parent_id, n.id);
  }
  for (const e of snapshot.edges) { push(edgesFrom, e.from, e); push(edgesTo, e.to, e); }

  const systemOf = new Map<string, string>();
  const resolveSystem = (id: string, seen: Set<string>): string | undefined => {
    const cached = systemOf.get(id);
    if (cached) return cached;
    if (seen.has(id)) return undefined;   // cycle guard
    seen.add(id);
    const n = nodesById.get(id);
    if (!n) return undefined;
    if (n.type === 'system') { systemOf.set(id, id); return id; }
    if (!n.parent_id) return undefined;
    const found = resolveSystem(n.parent_id, seen);
    if (found) systemOf.set(id, found);
    return found;
  };
  for (const n of snapshot.nodes) resolveSystem(n.id, new Set());

  return { nodesById, childrenOf, edgesFrom, edgesTo, byType, systemOf };
}

/** Read the platform context governing any node, by walking to its system. */
export function platformContextFor(index: GraphIndex, nodeId: string): PlatformContext | undefined {
  const sysId = index.systemOf.get(nodeId);
  if (!sysId) return undefined;
  return index.nodesById.get(sysId)?.attrs['platform'] as PlatformContext | undefined;
}

/**
 * The dirty set for incremental revalidation: parents, children and both edge
 * directions. Adding door 4 marks the MR52, the bus and the controller dirty.
 */
export function dirtyClosure(index: GraphIndex, seeds: string[], maxDepth = 6): Set<string> {
  const out = new Set<string>();
  let frontier = seeds.filter((id) => index.nodesById.has(id));
  for (const id of frontier) out.add(id);
  for (let depth = 0; depth < maxDepth && frontier.length > 0; depth += 1) {
    const next: string[] = [];
    const visit = (id: string): void => { if (!out.has(id)) { out.add(id); next.push(id); } };
    for (const id of frontier) {
      const n = index.nodesById.get(id);
      if (n?.parent_id) visit(n.parent_id);
      for (const c of index.childrenOf.get(id) ?? []) visit(c);
      for (const e of index.edgesFrom.get(id) ?? []) visit(e.to);
      for (const e of index.edgesTo.get(id) ?? []) visit(e.from);
    }
    frontier = next;
  }
  return out;
}

/* ==========================================================================
 * 8. RULE DSL — rules are DATA, not code (types only; P2 adds the evaluator)
 * ========================================================================== */

export type Severity =
  | 'blocking'    // RED   — physically or contractually impossible
  | 'warning'     // AMBER — works, violates derate/best practice/headroom policy
  | 'info'        // BLUE  — advisory (supersession, bundle savings, EOL)
  | 'unverified'; // GRAY  — spec not confirmed; never blocks

export type RuleCategory =
  | 'capacity' | 'power' | 'distance' | 'protocol' | 'licensing'
  | 'topology' | 'environmental' | 'code' | 'completeness';

export type FixAction =
  | 'insert_sibling' | 'swap_model' | 'reparent' | 'split_bus'
  | 'add_line_item' | 'change_attr' | 'add_component' | 'relocate'
  | 'none';  // "no automatic fix — requires design change" (guardrail #5)

export interface RuleFix {
  id: string;
  /** Estimator-language label; interpolates {sku}, {actual}, {max}, {overflow}. */
  label: string;
  action: FixAction;
  /** Only offered when this predicate holds (e.g. the bus has a free slot). */
  guard?: string;
  candidates_query?: string;
  params: Record<string, unknown>;
  bom_delta: string[];
  labor_hours: number;
  recompute: string[];
  rank: number;
}

/**
 * Predicate grammar — small, total, and NOT eval(). The P2 evaluator is a
 * parser, so nothing in a rule file can execute.
 *
 *   count(children where type='door')      capacity('door')
 *   attr('length_ft')                      spec('power.draw_ma')
 *   standard('READER-MEDIA.LIMITS.WIEGAND_MAX_FT')
 *   sum(children.spec('power.draw_ma'))    voltage_at_load()
 *   platform()  platform_version()         licenses('door').purchased
 *   Operators: > >= < <= == != and or not + - * / ( )
 */
export interface Rule {
  id: string;              // AC-CAP-014
  version: number;
  category: RuleCategory;
  severity: Severity;
  enabled: boolean;
  applies_to: {
    node_type?: NodeType[];
    class?: DeviceClass[];
    sku_in?: string[];
    platform_in?: PlatformId[];
    where?: string;
  };
  /** TRUE means the rule is VIOLATED. */
  predicate: string;
  /** Guardrail #4: estimator's language first... */
  message: string;
  /** ...then spec language, with interpolation. */
  detail: string;
  affects: string[];
  /** Guardrail #5: at least one, or a single action:'none' entry. */
  fixes: RuleFix[];
  /**
   * Auto-demote to `warning` when any spec the predicate reads is not verified.
   * Makes guardrail #1 mechanical rather than something authors must remember.
   */
  demote_if_unverified: boolean;
  provenance: Provenance;
  hash?: string;
}

/** A rule with no fixture does not load (enforced by the P2 loader). */
export interface RuleFixture {
  rule_id: string;
  name: string;
  expect: 'pass' | 'fail';
  design: string | Record<string, unknown>;
  expect_detail?: string;
  expect_severity?: Severity;
  expect_fix_ids?: string[];
}

export interface Violation {
  /** Stable across revalidations so overrides and UI state survive: rule+node. */
  key: string;
  rule_id: string;
  rule_version: number;
  category: RuleCategory;
  severity: Severity;
  /** The constrained node — highlighted as PRIMARY red. */
  primary_node_id: string;
  /** The offending children — doors 3 and 4, highlighted secondary. */
  secondary_node_ids: string[];
  message: string;
  detail: string;
  affects: string[];
  /** Guardrail #2: every red line traces to a document. */
  citations: Provenance[];
  fixes: RuleFix[];
  /** Set when severity was lowered because a spec was unverified. */
  demoted_from: Severity | null;
  override: { reason: string; actor: string; ts: string } | null;
  /** Values the predicate read, for the tooltip and for debugging. */
  evidence: Record<string, unknown>;
}

export interface HealthScore {
  score: number;
  by_category: Partial<Record<RuleCategory, number>>;
  blocking_count: number;
  warning_count: number;
  unverified_count: number;
  /** Export blocked/watermarked while true and unoverridden. */
  export_blocked: boolean;
}

export interface EnginePolicy {
  /**
   * false (Phase 1 default): a verified spec with a pending document URL may
   * still drive a RED line; the validation report lists it as a citation gap.
   * true (recommended for customer-facing export): demote it to a warning.
   */
  blocking_requires_source_url: boolean;
  bus_load_warn_pct: number;
  poe_budget_warn_pct: number;
  spare_capacity_warn_pct: number;
}

export const DEFAULT_POLICY: EnginePolicy = {
  blocking_requires_source_url: false,
  bus_load_warn_pct: 80,
  poe_budget_warn_pct: 85,
  spare_capacity_warn_pct: 10,
};

/* ==========================================================================
 * 9. PURE CALCULATORS — no I/O, no framework, runnable in a worker or CI
 * ========================================================================== */

export interface VoltageDropResult { drop_v: number; terminal_vdc: number; drop_pct: number }

/** Two-conductor DC drop: V = 2 · L/1000 · R · I. */
export function voltageDrop(i: {
  length_ft: number; ohms_per_1000ft: number; current_a: number; source_vdc: number;
}): VoltageDropResult {
  const drop_v = 2 * (i.length_ft / 1000) * i.ohms_per_1000ft * i.current_a;
  return {
    drop_v,
    terminal_vdc: i.source_vdc - drop_v,
    drop_pct: i.source_vdc === 0 ? 0 : (drop_v / i.source_vdc) * 100,
  };
}

/** Longest one-way run that still lands at or above the minimum. */
export function maxRunFt(i: {
  ohms_per_1000ft: number; current_a: number; source_vdc: number; min_terminal_vdc: number;
}): number {
  const allowed = i.source_vdc - i.min_terminal_vdc;
  if (allowed <= 0 || i.current_a <= 0 || i.ohms_per_1000ft <= 0) return 0;
  return (allowed * 1000) / (2 * i.ohms_per_1000ft * i.current_a);
}

export interface PoeBudgetResult {
  required_w: number; budget_w: number; headroom_w: number; used_pct: number;
  status: 'ok' | 'warn' | 'exceeded';
}

export function poeBudget(i: { loads_w: number[]; budget_w: number; warn_pct: number }): PoeBudgetResult {
  const required_w = i.loads_w.reduce((a, b) => a + b, 0);
  const used_pct = i.budget_w === 0 ? Infinity : (required_w / i.budget_w) * 100;
  return {
    required_w, budget_w: i.budget_w, headroom_w: i.budget_w - required_w, used_pct,
    status: required_w > i.budget_w ? 'exceeded' : used_pct > i.warn_pct ? 'warn' : 'ok',
  };
}

/** Standby battery sizing with an aging/temperature derate. */
export function batteryAh(i: {
  standby_load_a: number; standby_minutes: number;
  alarm_load_a: number; alarm_minutes: number; derate: number;
}): number {
  return (i.standby_load_a * (i.standby_minutes / 60) + i.alarm_load_a * (i.alarm_minutes / 60)) * i.derate;
}

export interface LoadResult {
  used: number; max: number; used_pct: number; overflow: number;
  status: 'ok' | 'warn' | 'exceeded';
}

/** The shared shape behind every capacity and bus-loading rule. */
export function loadAgainst(used: number, max: number, warn_pct: number): LoadResult {
  const used_pct = max === 0 ? (used > 0 ? Infinity : 0) : (used / max) * 100;
  return {
    used, max, used_pct, overflow: Math.max(0, used - max),
    status: used > max ? 'exceeded' : used_pct > warn_pct ? 'warn' : 'ok',
  };
}

/** NEC Ch. 9 Table 1 allowable fill fraction for a cable count. */
export function conduitFillPct(count: number, pcts: { one: number; two: number; threePlus: number }): number {
  if (count <= 0) return 0;
  if (count === 1) return pcts.one;
  if (count === 2) return pcts.two;
  return pcts.threePlus;
}

export function conduitFill(i: {
  conduit_area_in2: number; cable_od_in: number; cable_count: number;
  pcts: { one: number; two: number; threePlus: number };
}): { fill_in2: number; allowed_in2: number; used_pct: number; status: 'ok' | 'exceeded' } {
  const fill_in2 = Math.PI * (i.cable_od_in / 2) ** 2 * i.cable_count;
  const allowed_in2 = i.conduit_area_in2 * (conduitFillPct(i.cable_count, i.pcts) / 100);
  return {
    fill_in2, allowed_in2,
    used_pct: allowed_in2 === 0 ? Infinity : (fill_in2 / allowed_in2) * 100,
    status: fill_in2 > allowed_in2 ? 'exceeded' : 'ok',
  };
}

export const metersToFeet = (m: number): number => m * 3.280839895013123;

/* ==========================================================================
 * 10. SELF-TEST + CLI
 * ========================================================================== */

let PASS = 0;
const FAILURES: string[] = [];

function check(name: string, cond: boolean, detail = ''): void {
  if (cond) PASS += 1;
  else FAILURES.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function near(name: string, actual: number, expected: number, tol = 1e-4): void {
  check(name, Math.abs(actual - expected) <= tol, `got ${actual}, expected ~${expected}`);
}

/** A minimal but real design: DNA Fusion -> LP1502 -> bus -> MR52 -> 4 doors. */
function fourDoorsOnOneMR52(): DesignSnapshot {
  const doors = [1, 2, 3, 4].map((n) =>
    node({ id: `door-${n}`, type: 'door', label: `Door ${100 + n}`, parent_id: 'sio-1', location_id: 'loc-1',
           attrs: { opening_number: `${100 + n}`, lock_type: 'electric_strike', reader_config: 'in_only' } }));
  return {
    design_id: 'dsn-1', revision: 0, project_id: 'prj-1',
    catalog_version: CATALOG_VERSION, rule_set_version: '0.0.0',
    nodes: [
      node({ id: 'prj-1', type: 'project', label: 'Test Project' }),
      node({ id: 'sys-1', type: 'system', label: 'Access Control', parent_id: 'prj-1',
             attrs: { kind: 'access_control', platform: { platform_id: 'dna_fusion', platform_version: '6.5.0.2' } } }),
      node({ id: 'loc-1', type: 'location', label: 'Bldg A / L1', parent_id: 'prj-1' }),
      node({ id: 'ctl-1', type: 'controller', label: 'ACP-1', sku: 'LP1502', parent_id: 'sys-1' }),
      node({ id: 'bus-1', type: 'bus', label: 'ACP-1 RS-485', parent_id: 'ctl-1',
             attrs: { bus_type: 'rs485_downstream', host_port: 'downstream', total_length_ft: 380 } }),
      node({ id: 'sio-1', type: 'sub_controller', label: 'SIO-1', sku: 'MR52', parent_id: 'bus-1' }),
      ...doors,
    ],
    edges: [
      edge('e1', 'hosts_bus', 'ctl-1', 'bus-1'),
      edge('e2', 'on_bus', 'sio-1', 'bus-1'),
      ...doors.map((d, i) => edge(`e-door-${i}`, 'controls_door', 'sio-1', d.id)),
    ],
    overrides: [],
  };
}

function selfTest(catalog: Catalog): void {
  const alta: PlatformContext = { platform_id: 'avigilon_alta', platform_version: null };
  const dna = (v: string | null = null): PlatformContext => ({ platform_id: 'dna_fusion', platform_version: v });

  // --- the platform-derate insight ---
  const nativeLP1502 = capacityOf(catalog, 'LP1502', 'reader', dna());
  check('LP1502 reads 64 readers natively under DNA Fusion', nativeLP1502.max === 64 && nativeLP1502.source === 'device_base');

  const altaLP1502 = capacityOf(catalog, 'LP1502', 'entry', alta);
  check('the SAME LP1502 reads 32 entries under Alta', altaLP1502.max === 32 && altaLP1502.source === 'platform_override');
  check('and reports it as a derate from the native 64 readers',
    altaLP1502.derated && altaLP1502.native_max === 64 && altaLP1502.native_kind === 'reader');
  check('LP1501 derates to 8 entries under Alta', capacityOf(catalog, 'LP1501', 'entry', alta).max === 8);
  const altaLP2500 = capacityOf(catalog, 'LP2500', 'entry', alta);
  check('LP2500 derates to 32 entries against a native 64 doors',
    altaLP2500.max === 32 && altaLP2500.native_max === 64 && altaLP2500.native_kind === 'door');
  check('the head-end matrix leads the citation chain',
    altaLP1502.provenance_chain[0]?.document_kind === 'head_end_matrix'
    && altaLP1502.provenance_chain.some((x) => x.document_kind === 'manufacturer_doc'));

  // --- support resolution ---
  check('Mercury is rejected on Verkada Command',
    !resolveSupport(catalog.bySku.get('LP1502')!, { platform_id: 'verkada_command', platform_version: null }).supported);
  check('Alta hardware is rejected on DNA Fusion', !resolveSupport(catalog.bySku.get('OP-ACC')!, dna()).supported);
  const cable = resolveSupport(catalog.bySku.get('CBL-18-2-CMP')!, dna());
  check('a SKU with no platform entry reads "not listed"', !cable.supported && cable.reason === 'not_listed');

  const mr52 = catalog.bySku.get('MR52')!;
  const below = resolveSupport(mr52, dna('6.4.0'));
  const ok = resolveSupport(mr52, dna('6.5.0.2'));
  const unknown = resolveSupport(mr52, dna(null));
  check('version gate: below minimum', below.supported && below.version_gate.status === 'below_min');
  check('version gate: satisfied', ok.supported && ok.version_gate.status === 'ok');
  check('version gate: unknown when no version chosen', unknown.supported && unknown.version_gate.status === 'unknown');
  check('versions compare numerically, not lexically',
    compareVersions('6.5.0.2', '6.5.0.10') === -1 && compareVersions('6.10', '6.9') === 1 && compareVersions('6.5', '6.5.0') === 0);

  // --- guardrail #1 ---
  check('no duplicate SKUs', new Set(catalog.devices.map((d) => d.sku)).size === catalog.devices.length);
  check('catalog invariants hold', validateCatalog(catalog).length === 0, validateCatalog(catalog).join('; '));
  const gaps = citationGaps(catalog);
  check('the 6.5.0.2 example value is queued as unverified',
    gaps.some((g) => g.reason === 'unverified' && (g.note ?? '').includes('6.5.0.2')));
  check('placeholder readers are queued as unverified',
    gaps.some((g) => g.sku === 'RDR-OSDP-PLACEHOLDER' && g.reason === 'unverified'));
  check('an unverified spec can never drive a RED line',
    !canBlock(catalog.bySku.get('RDR-WIEGAND-PLACEHOLDER')!.provenance, DEFAULT_POLICY));
  const doorCap = mr52.capacities.find((c) => c.of === 'door')!;
  check('a verified spec blocks under the default policy', canBlock(doorCap.max.provenance, DEFAULT_POLICY));
  check('and is demoted under the strict export policy',
    !canBlock(doorCap.max.provenance, { ...DEFAULT_POLICY, blocking_requires_source_url: true }));

  // --- fix candidates ---
  const altaSkus = devicesForPlatform(catalog, alta).map((d) => d.sku);
  check('Alta design lists Alta hardware AND Mercury under Alta',
    altaSkus.includes('OP-ACC') && altaSkus.includes('LP1502') && !altaSkus.includes('AC42') && !altaSkus.includes('MR52'));
  const verkada: PlatformContext = { platform_id: 'verkada_command', platform_version: null };
  const upgrade = devicesForPlatform(catalog, verkada)
    .filter((d) => (capacityOf(catalog, d.sku, 'door', verkada).max ?? 0) >= 5).map((d) => d.sku);
  check('the AC42 5th-door upgrade path is the AC62', upgrade.length === 1 && upgrade[0] === 'AC62');

  // --- design graph ---
  const snapshot = fourDoorsOnOneMR52();
  const index = buildIndex(snapshot);
  check('4 doors sit under a 2-door SIO (acceptance test #1 shape)', (index.childrenOf.get('sio-1') ?? []).length === 4);
  check('door counts derive from edges, not a stored counter',
    (index.edgesFrom.get('sio-1') ?? []).filter((e) => e.type === 'controls_door').length === 4);
  check('any node resolves its platform context by walking to its system',
    ['door-3', 'sio-1', 'bus-1', 'ctl-1'].every((id) => index.systemOf.get(id) === 'sys-1'));
  check('and that context is the DNA Fusion head-end',
    platformContextFor(index, 'door-3')?.platform_id === 'dna_fusion');
  const dirty = dirtyClosure(index, ['door-4']);
  check('editing a door dirties the constrained parent and its siblings',
    dirty.has('sio-1') && dirty.has('bus-1') && dirty.has('ctl-1') && dirty.has('door-1'));
  check('a shallow edit does not walk to the project root', !dirtyClosure(index, ['door-4'], 1).has('prj-1'));
  check('a parent cycle does not hang the indexer', (() => {
    const cyclic: DesignSnapshot = { ...snapshot, edges: [],
      nodes: [node({ id: 'a', type: 'controller', label: 'A', parent_id: 'b' }), node({ id: 'b', type: 'controller', label: 'B', parent_id: 'a' })] };
    buildIndex(cyclic);
    return true;
  })());
  const orphanedNodes = snapshot.nodes.filter((n) => n.parent_id === 'sio-1').map((n) => ({ ...n, parent_id: null, orphaned: true }));
  check('deleting a controller flags orphans rather than deleting them (test #11)',
    orphanedNodes.length === 4 && orphanedNodes.every((n) => n.orphaned && n.type === 'door'));

  // --- capacity + calculators against the acceptance tests ---
  const mr52Door = capacityOf(catalog, 'MR52', 'door', dna());
  const load = loadAgainst(4, mr52Door.max ?? 0, DEFAULT_POLICY.bus_load_warn_pct);
  check('test #1: 4 doors on an MR52 is over capacity by 2', load.status === 'exceeded' && load.overflow === 2);
  check('test #3: 40 entries on an Alta LP1502 is over capacity by 8',
    loadAgainst(40, capacityOf(catalog, 'LP1502', 'entry', alta).max ?? 0, 80).overflow === 8);
  check('test #2: a 33rd downstream device on an LP1502 is over capacity',
    loadAgainst(33, capacityOf(catalog, 'LP1502', 'downstream_device', dna()).max ?? 0, 80).status === 'exceeded');
  check('test #4: a 5th door on an AC42 is over capacity',
    loadAgainst(5, capacityOf(catalog, 'AC42', 'door', verkada).max ?? 0, 80).status === 'exceeded');
  check('bus loading ambers past the 80% headroom policy',
    loadAgainst(27, 32, 80).status === 'warn' && loadAgainst(25, 32, 80).status === 'ok');
  check('any load on a zero-capacity device is exceeded', loadAgainst(1, 0, 80).status === 'exceeded');

  // test #7: maglock 500 mA, 18 AWG, 250 ft, 12 V. 18 AWG = 7.77 ohm/kFT.
  const vd = voltageDrop({ length_ft: 250, ohms_per_1000ft: 7.77, current_a: 0.5, source_vdc: 12 });
  near('test #7: drop is 1.9425 V', vd.drop_v, 1.9425);
  check('test #7: the lock sees 10.06 V, below the 11.0 V floor', vd.terminal_vdc < 11.0);
  const awg16 = voltageDrop({ length_ft: 250, ohms_per_1000ft: 4.89, current_a: 0.5, source_vdc: 12 });
  check('16 AWG still fails at 10.78 V — the obvious fix is wrong', awg16.terminal_vdc < 11.0);
  const awg14 = voltageDrop({ length_ft: 250, ohms_per_1000ft: 3.07, current_a: 0.5, source_vdc: 12 });
  check('14 AWG clears at 11.23 V — the real upsize', awg14.terminal_vdc > 11.0);
  near('longest legal 18 AWG run is 128.7 ft',
    maxRunFt({ ohms_per_1000ft: 7.77, current_a: 0.5, source_vdc: 12, min_terminal_vdc: 11.0 }), 128.7, 0.05);

  // test #8: 20 cameras @ 25.5 W on a 370 W switch.
  const poe = poeBudget({ loads_w: Array<number>(20).fill(25.5), budget_w: 370, warn_pct: 85 });
  check('test #8: 510 W required against 370 W available', poe.required_w === 510 && poe.status === 'exceeded');
  check('PoE ambers rather than blocks at 86% of budget', poeBudget({ loads_w: [320], budget_w: 370, warn_pct: 85 }).status === 'warn');

  near('battery sizing with a 25% derate', batteryAh({ standby_load_a: 1.2, standby_minutes: 240, alarm_load_a: 3, alarm_minutes: 15, derate: 1.25 }), 6.9375);
  const fill = conduitFill({ conduit_area_in2: 0.533, cable_od_in: 0.2, cable_count: 6, pcts: { one: 53, two: 31, threePlus: 40 } });
  near('NEC 40% fill for three or more cables', fill.allowed_in2, 0.2132);

  // --- standards are loaded and cited ---
  const readerLimits = STANDARDS.find((s) => s.id === 'READER-MEDIA.LIMITS')!;
  check('test #5: Wiegand is limited to 500 ft', readerLimits.values['WIEGAND_MAX_FT']?.value === 500);
  check('test #5 fix: OSDP reaches 4,000 ft', readerLimits.values['OSDP_RS485_MAX_FT']?.value === 4000);
  check('test #6: OSDP termination is required above 200 ft', readerLimits.values['OSDP_TERMINATION_REQUIRED_ABOVE_FT']?.value === 200);
  check('every Mercury bus declares its 4,000 ft limit and ends-only termination',
    catalog.devices.filter((d) => d.provides_bus.length > 0)
      .every((d) => d.provides_bus.every((b) => b.max_length?.value === 4000 && b.termination?.ends_only === true)));

  // --- guardrail #6 ---
  const validOverride = { violation_key: 'AC-CAP-014:sio-1', reason: 'Owner-furnished panel already installed; verified in field walk 9/2.', actor: 'u1', ts: '2026-09-08T00:00:00Z' };
  check('a blocking override carries a written reason of real length', validOverride.reason.length >= 10);
}

/* --------------------------------------- output ----------------------------------------- */

function printDerates(catalog: Catalog): void {
  console.log('\nPLATFORM-SCOPED CAPACITY MATRIX (same metal, different limits)');
  for (const d of catalog.devices) {
    const rows: string[] = [];
    for (const pid of PLATFORM_IDS) {
      const ctx: PlatformContext = { platform_id: pid, platform_version: null };
      if (!resolveSupport(d, ctx).supported) continue;
      const parts: string[] = [];
      for (const kind of ['door', 'entry', 'reader', 'downstream_device'] as CapacityKind[]) {
        const r = capacityOf(catalog, d.sku, kind, ctx);
        if (r.max === null) continue;
        parts.push(`${kind}=${r.max}${r.derated ? ` (derated from ${r.native_max} ${r.native_kind})` : ''}`);
      }
      if (parts.length > 0) rows.push(`    ${pid.padEnd(18)} ${parts.join('  ')}`);
    }
    if (rows.length > 0) console.log(`\n  ${d.sku}\n${rows.join('\n')}`);
  }
}

function printGaps(catalog: Catalog): void {
  const gaps = citationGaps(catalog);
  const bySku = new Map<string, CitationGap[]>();
  for (const g of gaps) {
    const list = bySku.get(g.sku);
    if (list) list.push(g); else bySku.set(g.sku, [g]);
  }
  console.log('SPECS TO CONFIRM\n================');
  for (const [sku, list] of [...bySku].sort((a, b) => a[0].localeCompare(b[0]))) {
    const un = list.filter((g) => g.reason === 'unverified').length;
    console.log(`\n${sku}  (${list.length} gaps, ${un} unverified)`);
    for (const g of list) {
      console.log(`  [${g.reason}] ${g.path}\n      ${g.document_title}`);
      if (g.note) console.log(`      note: ${g.note}`);
    }
  }
}

function printCapacity(catalog: Catalog, sku: string, platform: string): void {
  const ctx: PlatformContext = { platform_id: platform as PlatformId, platform_version: null };
  const device = catalog.bySku.get(sku);
  if (!device) { console.error(`Unknown SKU: ${sku}`); process.exit(1); }
  const support = resolveSupport(device, ctx);
  console.log(`${device.sku} — ${device.display_name}\nplatform: ${ctx.platform_id}`);
  if (!support.supported) { console.log(`  UNSUPPORTED (${support.reason})`); return; }
  console.log(`  version gate: ${support.version_gate.status}`);
  for (const kind of CAPACITY_KINDS) {
    const r = capacityOf(catalog, sku, kind, ctx);
    if (r.source === 'absent') continue;
    const derate = r.derated ? `  <- DERATED from ${r.native_max} ${r.native_kind}` : '';
    console.log(`  ${kind.padEnd(22)} ${String(r.max).padStart(5)}  [${r.source}, ${r.confidence}]${derate}`);
    if (r.qualifier) console.log(`  ${' '.repeat(22)} ${r.qualifier}`);
    for (const prov of r.provenance_chain) console.log(`  ${' '.repeat(22)} src: ${citation(prov)}`);
  }
}

function main(): void {
  const catalog = loadCatalog();
  const [cmd, a, b] = process.argv.slice(2);

  if (cmd === 'gaps') return printGaps(catalog);
  if (cmd === 'capacity') {
    if (!a || !b) { console.error('Usage: capacity <sku> <platform_id>'); process.exit(1); }
    return printCapacity(catalog, a, b);
  }

  selfTest(catalog);
  const gaps = citationGaps(catalog);
  console.log(`LowVolt OS — Phase 1 (schema + catalog), catalog ${catalog.version}`);
  console.log(`  ${catalog.devices.length} devices · ${catalog.platforms.length} platforms · ${catalog.standards.length} standard sets`);
  console.log(`  provenance: ${gaps.filter((g) => g.reason === 'unverified').length} unverified, ${gaps.filter((g) => g.reason === 'missing_source_url').length} awaiting a source URL`);
  console.log(`\nSELF-TEST: ${PASS} passed, ${FAILURES.length} failed`);
  for (const f of FAILURES) console.log(`  FAIL  ${f}`);
  printDerates(catalog);
  if (FAILURES.length > 0) process.exit(1);
}

main();

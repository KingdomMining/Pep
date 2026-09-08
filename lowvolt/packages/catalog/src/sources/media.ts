import type { CatalogDeviceInput, StandardInput } from '@lowvolt/schema';
import { p, unverified } from './documents.js';
import { spec } from './helpers.js';

/**
 * Conductor DC resistance from NEC Chapter 9, Table 8 (uncoated copper, solid).
 * These drive the voltage-drop rule; they are code values, not estimates.
 */
const OHMS_PER_1000FT: Record<number, number> = {
  14: 3.07,
  16: 4.89,
  18: 7.77,
  20: 12.8,
  22: 20.4,
  24: 32.4,
};

interface CableDef {
  sku: string;
  name: string;
  awg: number;
  conductors: number;
  pairs?: number;
  shielded: boolean;
  jacket: 'cmr_riser' | 'cmp_plenum';
  use: string;
}

const CABLES: CableDef[] = [
  { sku: 'CBL-22-6-SH-CMP', name: '22 AWG 6-conductor shielded, plenum', awg: 22, conductors: 6, shielded: true, jacket: 'cmp_plenum', use: 'OSDP / Wiegand reader home run' },
  { sku: 'CBL-24-1P-SH-CMP', name: '24 AWG 1-pair shielded, plenum', awg: 24, conductors: 2, pairs: 1, shielded: true, jacket: 'cmp_plenum', use: 'RS-485 downstream bus (120 ohm)' },
  { sku: 'CBL-22-4-CMP', name: '22 AWG 4-conductor, plenum', awg: 22, conductors: 4, shielded: false, jacket: 'cmp_plenum', use: 'Door contacts (DPS)' },
  { sku: 'CBL-18-4-CMP', name: '18 AWG 4-conductor, plenum', awg: 18, conductors: 4, shielded: false, jacket: 'cmp_plenum', use: 'REX / lock power' },
  { sku: 'CBL-18-2-CMP', name: '18 AWG 2-conductor, plenum', awg: 18, conductors: 2, shielded: false, jacket: 'cmp_plenum', use: 'Lock power' },
  { sku: 'CBL-16-2-CMP', name: '16 AWG 2-conductor, plenum', awg: 16, conductors: 2, shielded: false, jacket: 'cmp_plenum', use: 'Lock power, long runs' },
];

export const MEDIA_DEVICES: CatalogDeviceInput[] = CABLES.map((c) => ({
  sku: c.sku,
  manufacturer: 'Generic',
  family: 'Low-voltage cable',
  class: 'cable' as const,
  display_name: c.name,
  lifecycle: { status: 'active' as const, superseded_by: null, eol_date: null },
  ports: [],
  capacities: [],
  provides_bus: [],
  listings: [],
  compliance_flags: ['unknown' as const],
  media: {
    media_class: 'conductor' as const,
    awg: c.awg,
    conductors: c.conductors,
    ...(c.pairs ? { pairs: c.pairs } : {}),
    shielded: c.shielded,
    jacket: c.jacket,
    category: 'n/a' as const,
    ohms_per_1000ft: spec(OHMS_PER_1000FT[c.awg] as number, p('nec_ch9_t8'), 'ohm'),
  },
  platform_support: {},
  commercial: { cost_type: 'material' as const, uom: 'FT', taxable: true, waste_pct: 10 },
  tags: ['cable', c.use],
  provenance: p('nec_ch9_t8', 'verified', `Conductor resistance per NEC Ch. 9 Table 8. Construction/use: ${c.use}.`),
}));

/**
 * Placeholder readers so the Wiegand -> OSDP swap fix (acceptance test #5) has
 * real catalog candidates. Marked UNVERIFIED on purpose: they render gray
 * dashed and may never hard-fail a design until a real SKU is loaded.
 */
export const PLACEHOLDER_READERS: CatalogDeviceInput[] = [
  {
    sku: 'RDR-WIEGAND-PLACEHOLDER',
    manufacturer: 'Generic (placeholder)',
    family: 'Credential reader',
    class: 'reader',
    display_name: 'Wiegand card reader (placeholder)',
    lifecycle: { status: 'preview', superseded_by: null, eol_date: null },
    ports: [],
    capacities: [],
    protocols: {
      reader_protocols: ['wiegand'],
      mixed_protocol_per_device: false,
      mixed_protocol_per_port: false,
      building_protocols: [],
      provenance: unverified('Placeholder reader; replace with a real SKU before bid.'),
    },
    listings: [],
    compliance_flags: ['unknown'],
    platform_support: {},
    tags: ['reader', 'placeholder', 'wiegand'],
    provenance: unverified(
      'Placeholder catalog entry. No manufacturer document. Exists so protocol/distance rules have a swap target; may not drive a blocking violation.',
    ),
  },
  {
    sku: 'RDR-OSDP-PLACEHOLDER',
    manufacturer: 'Generic (placeholder)',
    family: 'Credential reader',
    class: 'reader',
    display_name: 'OSDP card reader (placeholder)',
    lifecycle: { status: 'preview', superseded_by: null, eol_date: null },
    ports: [],
    capacities: [],
    protocols: {
      reader_protocols: ['osdp', 'osdp_secure_channel'],
      mixed_protocol_per_device: false,
      mixed_protocol_per_port: false,
      building_protocols: [],
      provenance: unverified('Placeholder reader; replace with a real SKU before bid.'),
    },
    listings: [],
    compliance_flags: ['unknown'],
    platform_support: {},
    tags: ['reader', 'placeholder', 'osdp'],
    provenance: unverified(
      'Placeholder catalog entry. No manufacturer document. Exists so protocol/distance rules have a swap target; may not drive a blocking violation.',
    ),
  },
];

/** Physical / code constants the rule engine reads via standard('...'). */
export const STANDARDS: StandardInput[] = [
  {
    id: 'TIA-568.LINK',
    title: 'Balanced twisted-pair horizontal cabling length limits',
    body: 'TIA',
    values: {
      PERMANENT_LINK_M: spec(90, p('tia568'), 'm'),
      CHANNEL_M: spec(100, p('tia568'), 'm'),
      HORIZONTAL_WARRANTY_FT: spec(295, p('tia568'), 'ft'),
    },
    provenance: p('tia568'),
  },
  {
    id: 'IEEE-802.3.POE',
    title: 'Power over Ethernet PSE / PD budgets',
    body: 'IEEE',
    values: {
      AF_PSE_W: spec(15.4, p('ieee8023'), 'W'),
      AF_PD_W: spec(12.95, p('ieee8023'), 'W'),
      AT_PSE_W: spec(30, p('ieee8023'), 'W'),
      AT_PD_W: spec(25.5, p('ieee8023'), 'W'),
      BT_T3_PSE_W: spec(60, p('ieee8023'), 'W'),
      BT_T3_PD_W: spec(51, p('ieee8023'), 'W'),
      BT_T4_PSE_W: spec(100, p('ieee8023'), 'W'),
      BT_T4_PD_W: spec(71.3, p('ieee8023'), 'W'),
    },
    provenance: p('ieee8023'),
  },
  {
    id: 'NEC-CH9.FILL',
    title: 'Conduit fill percentages, NEC Chapter 9 Table 1',
    body: 'NEC',
    values: {
      ONE_CABLE_PCT: spec(53, p('nec_ch9_t1'), 'percent'),
      TWO_CABLES_PCT: spec(31, p('nec_ch9_t1'), 'percent'),
      THREE_OR_MORE_PCT: spec(40, p('nec_ch9_t1'), 'percent'),
    },
    provenance: p('nec_ch9_t1'),
  },
  {
    id: 'READER-MEDIA.LIMITS',
    title: 'Reader data protocol distance limits',
    body: 'SIA',
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
    id: 'FIELD.WIRING_PRACTICE',
    title: 'Company low-voltage wiring practice thresholds',
    body: 'BICSI',
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

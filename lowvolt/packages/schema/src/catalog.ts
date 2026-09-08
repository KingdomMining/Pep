import { z } from 'zod';
import { ProvenanceSchema, specSchema } from './provenance.js';
import { LicenseUnitSchema, PlatformIdSchema } from './platform.js';

/** What role a SKU plays in the design graph. Drives which rules apply. */
export const DeviceClassSchema = z.enum([
  'controller', // intelligent field panel (LP1502, LP2500)
  'sub_controller', // SIO / downstream board (MR52, MR16IN)
  'acu', // cloud access control unit (Alta Core, Verkada AC42)
  'expansion_board', // Alta 4/8-port, 32-input
  'bundle', // pre-built kit (Alta Smart Hub = ACU + board + PSU + enclosure)
  'reader',
  'credential',
  'lock',
  'door_position_switch',
  'request_to_exit',
  'power_supply',
  'power_distribution',
  'battery',
  'enclosure',
  'network_switch',
  'media_converter',
  'cable',
  'camera',
  'intercom',
  'software_license',
  'accessory',
  'labor', // labor-only catalog line (P5 estimating)
]);
export type DeviceClass = z.infer<typeof DeviceClassSchema>;

/** Physical/logical connection points on a device. */
export const PortTypeSchema = z.enum([
  'osdp', // RS-485 OSDP reader port
  'wiegand',
  'clock_and_data',
  'osdp_or_wiegand', // port is selectable
  'supervised_input',
  'unsupervised_input',
  'form_c_relay',
  'wet_relay',
  'dry_relay',
  'rs485_downstream', // host side of an SIO bus
  'rs485_device', // device side (an SIO's uplink)
  'ethernet',
  'poe_pd', // powered device
  'poe_pse', // power sourcing equipment
  'usb',
  'aux_power_out',
  'fai', // fire alarm interface
]);
export type PortType = z.infer<typeof PortTypeSchema>;

export const RelayRatingSchema = z.object({
  no: z.string().optional(), // e.g. "5A@30VDC"
  nc: z.string().optional(), // e.g. "3A@30VDC"
});

export const PortSchema = z.object({
  id: z.string().min(1), // stable within the SKU, e.g. "reader"
  type: PortTypeSchema,
  count: specSchema(z.number().int().nonnegative()),
  rating: RelayRatingSchema.optional(),
  /** Protocols a selectable port can be set to. */
  modes: z.array(z.enum(['osdp', 'osdp_secure_channel', 'wiegand', 'clock_and_data'])).default([]),
  notes: z.string().optional(),
});
export type Port = z.infer<typeof PortSchema>;
export type PortInput = z.input<typeof PortSchema>;

/** Countable things a device can hold. */
export const CapacityKindSchema = z.enum([
  'door', // openings
  'entry', // Alta's term; NOT assumed equal to door — mapped explicitly
  'reader',
  'downstream_device', // SIOs on this controller's buses
  'input',
  'output',
  'card_format',
  'card_format_offline', // formats pushed to SIOs for degraded mode
  'rex_per_door',
  'dps_per_door',
  'expansion_board',
  'poe_port',
  'camera_channel',
  'panel_per_enclosure',
]);
export type CapacityKind = z.infer<typeof CapacityKindSchema>;

export const CapacitySchema = z.object({
  of: CapacityKindSchema,
  max: specSchema(z.number().int().nonnegative()),
  /** device = whole SKU; per_port / per_bus = per instance of that port/bus. */
  scope: z.enum(['device', 'per_port', 'per_bus']).default('device'),
  /** Which port/bus id `scope` refers to. */
  scope_ref: z.string().optional(),
  /** Free text shown in the explanation card, e.g. offline facility-code caveat. */
  qualifier: z.string().optional(),
  /**
   * On a platform override, the native capacity kind this one replaces, when the
   * head-end renames the unit. Alta counts "entries" where Mercury counts
   * "readers" — this lets the explanation card say "native Mercury allows 64,
   * Alta supports 32" instead of silently losing the comparison.
   */
  compares_to_native: CapacityKindSchema.optional(),
});
export type Capacity = z.infer<typeof CapacitySchema>;
export type CapacityInput = z.input<typeof CapacitySchema>;

/** Buses a device can host or hang off. */
export const BusTypeSchema = z.enum(['rs485_downstream', 'ip', 'usb', 'wireless']);
export type BusType = z.infer<typeof BusTypeSchema>;

export const BusProvisionSchema = z.object({
  id: z.string().min(1),
  type: BusTypeSchema,
  /** Number of physical bus ports of this type on the device. */
  count: specSchema(z.number().int().positive()),
  max_devices_per_bus: specSchema(z.number().int().positive()).optional(),
  max_length: specSchema(z.number().positive()).optional(),
  cable_spec: z.string().optional(), // "1 twisted pair + shield, 120 ohm, 24 AWG"
  termination: z
    .object({
      required_ohm: specSchema(z.number().positive()).optional(),
      /** Terminate ONLY at the two physical ends of the bus. */
      ends_only: z.boolean().default(true),
      /** Above this run length, termination becomes mandatory. */
      required_above_length: specSchema(z.number().positive()).optional(),
    })
    .optional(),
});
export type BusProvision = z.infer<typeof BusProvisionSchema>;

export const DevicePowerSchema = z.object({
  input_vdc: z.array(z.number()).default([]), // [12, 24]
  input_vdc_provenance: ProvenanceSchema.optional(),
  /** Steady-state draw at nominal voltage. */
  draw_ma: specSchema(z.number().nonnegative()).optional(),
  /** Total current the device can hand out downstream (readers + aux combined). */
  aux_output_ma: specSchema(z.number().nonnegative()).optional(),
  aux_output_shared: z.boolean().default(true), // true = reader + aux share one budget
  poe: z
    .object({
      role: z.enum(['pd', 'pse', 'both']),
      standard: z.enum(['802.3af', '802.3at', '802.3bt_type3', '802.3bt_type4']),
      class: specSchema(z.number().int().min(0).max(8)).optional(),
      pd_watts: specSchema(z.number().positive()).optional(),
      pse_budget_watts: specSchema(z.number().positive()).optional(),
    })
    .optional(),
  /** Lowest terminal voltage at which the device is still specified to operate. */
  min_operating_vdc: specSchema(z.number().positive()).optional(),
});
export type DevicePower = z.infer<typeof DevicePowerSchema>;

export const ProtocolSupportSchema = z.object({
  reader_protocols: z.array(z.enum(['osdp', 'osdp_secure_channel', 'wiegand', 'clock_and_data', 'native_cloud'])).default([]),
  /** Can one controller mix protocols across its reader ports? */
  mixed_protocol_per_device: z.boolean().default(true),
  mixed_protocol_per_port: z.boolean().default(false),
  building_protocols: z.array(z.enum(['bacnet_ip', 'snmp', 'modbus'])).default([]),
  provenance: ProvenanceSchema.optional(),
});

export const EnvironmentSchema = z.object({
  rating: z.enum(['indoor', 'outdoor', 'indoor_outdoor']).optional(),
  ip_rating: z.string().optional(),
  nema_rating: z.string().optional(),
  operating_temp_c: z.object({ min: z.number(), max: z.number() }).optional(),
  humidity_pct: z.object({ min: z.number(), max: z.number() }).optional(),
  dimensions_in: z.object({ h: z.number(), w: z.number(), d: z.number() }).optional(),
  provenance: ProvenanceSchema.optional(),
});

/** Cable / conductor physical properties — feeds distance + voltage-drop rules. */
export const MediaSpecSchema = z.object({
  media_class: z.enum(['twisted_pair_copper', 'composite', 'coax', 'fiber', 'conductor']),
  awg: z.number().int().optional(),
  pairs: z.number().int().optional(),
  conductors: z.number().int().optional(),
  shielded: z.boolean().default(false),
  /** DC resistance per 1000 ft of a single conductor. Drives voltage drop. */
  ohms_per_1000ft: specSchema(z.number().positive()).optional(),
  outer_diameter_in: specSchema(z.number().positive()).optional(),
  jacket: z.enum(['cmr_riser', 'cmp_plenum', 'cm_general', 'cmx_outdoor', 'direct_burial']).optional(),
  category: z.enum(['cat5e', 'cat6', 'cat6a', 'n/a']).optional(),
  max_length: specSchema(z.number().positive()).optional(),
});
export type MediaSpec = z.infer<typeof MediaSpecSchema>;

/**
 * PLATFORM SUPPORT — the heart of the model.
 *
 * "The same physical Mercury board has different supported capacities depending
 * on which head-end software drives it." So `capacity_overrides` here WIN over
 * the device's base `capacities`. An LP1502 keeps its native 64-reader entry in
 * `capacities`, and carries a 32-entry override under `avigilon_alta`.
 */
export const PlatformSupportSchema = z.object({
  supported: z.boolean(),
  min_platform_version: z.string().nullable().default(null),
  max_platform_version: z.string().nullable().default(null),
  min_firmware: z.string().nullable().default(null),
  /** Version-pair gates, when support depends on both sides. */
  firmware_matrix: z
    .array(
      z.object({
        platform_version_min: z.string().nullable().default(null),
        platform_version_max: z.string().nullable().default(null),
        firmware_min: z.string().nullable().default(null),
        firmware_max: z.string().nullable().default(null),
        note: z.string().optional(),
      }),
    )
    .default([]),
  /** Derates/uprates vs. the device's native capacities. Head-end matrix wins. */
  capacity_overrides: z.array(CapacitySchema).default([]),
  /** How many license seats an instance of this SKU burns on this platform. */
  licensing: z
    .array(
      z.object({
        unit: LicenseUnitSchema,
        /** Fixed seats per device, or 'per_door' to count actual children. */
        per_device: z.number().int().nonnegative().optional(),
        per_child: z.enum(['door', 'reader', 'entry']).optional(),
      }),
    )
    .default([]),
  notes: z.string().optional(),
  provenance: ProvenanceSchema,
});
export type PlatformSupport = z.infer<typeof PlatformSupportSchema>;
export type PlatformSupportInput = z.input<typeof PlatformSupportSchema>;

export const LifecycleSchema = z.object({
  status: z.enum(['active', 'preview', 'eol', 'superseded']).default('active'),
  superseded_by: z.string().nullable().default(null),
  eol_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
});

/** Commercial data. Kept on the catalog entry so estimating (P5) has one source. */
export const CommercialSchema = z.object({
  cost_code: z.string().optional(),
  cost_type: z.enum(['material', 'labor', 'equipment', 'subcontract', 'travel', 'other']).default('material'),
  uom: z.string().default('EA'),
  taxable: z.boolean().default(true),
  list_cost_usd: z.number().nonnegative().optional(),
  net_cost_usd: z.number().nonnegative().optional(),
  labor_hours: z.number().nonnegative().optional(),
  waste_pct: z.number().nonnegative().default(0),
  vendor: z.string().optional(),
  erp_code: z.string().optional(),
});

export const CatalogDeviceSchema = z.object({
  sku: z.string().min(1),
  manufacturer: z.string().min(1),
  family: z.string().min(1),
  class: DeviceClassSchema,
  display_name: z.string().min(1),
  lifecycle: LifecycleSchema.default({ status: 'active', superseded_by: null, eol_date: null }),

  ports: z.array(PortSchema).default([]),
  /** NATIVE capacities. Never read directly — always via resolveCapacity(). */
  capacities: z.array(CapacitySchema).default([]),
  /** Buses this device hosts (a controller's downstream ports). */
  provides_bus: z.array(BusProvisionSchema).default([]),
  /** What this device occupies on its parent. */
  consumes: z
    .object({
      bus: BusTypeSchema.optional(),
      slots: z.number().int().nonnegative().default(1),
      enclosure_units: z.number().int().nonnegative().optional(),
      expansion_slots: z.number().int().nonnegative().optional(),
    })
    .optional(),

  power: DevicePowerSchema.optional(),
  protocols: ProtocolSupportSchema.optional(),
  environment: EnvironmentSchema.optional(),
  media: MediaSpecSchema.optional(),

  /** UL 294, NDAA/Section 889, FCC, etc. Feeds code & standards rules. */
  listings: z.array(z.string()).default([]),
  compliance_flags: z.array(z.enum(['ndaa_889_compliant', 'ndaa_889_non_compliant', 'taa_compliant', 'unknown'])).default([]),

  /** Guardrail #3: never a bare capability — always keyed by platform. */
  platform_support: z.record(PlatformIdSchema, PlatformSupportSchema).default({}),

  commercial: CommercialSchema.optional(),
  tags: z.array(z.string()).default([]),
  provenance: ProvenanceSchema,
});
export type CatalogDevice = z.infer<typeof CatalogDeviceSchema>;
/** Authoring shape: fields with schema defaults may be omitted. */
export type CatalogDeviceInput = z.input<typeof CatalogDeviceSchema>;

/** A physical/standards constant that is not a device (TIA-568, NEC, PoE). */
export const StandardSchema = z.object({
  id: z.string().min(1), // "TIA-568.PERMANENT_LINK"
  title: z.string().min(1),
  body: z.enum(['TIA', 'NEC', 'IEEE', 'BICSI', 'UL', 'SIA', 'ADA', 'NFPA']),
  values: z.record(z.string(), specSchema(z.union([z.number(), z.string(), z.boolean()]))),
  provenance: ProvenanceSchema,
});
export type Standard = z.infer<typeof StandardSchema>;
export type StandardInput = z.input<typeof StandardSchema>;

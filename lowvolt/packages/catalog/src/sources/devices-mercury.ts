import type { CatalogDeviceInput, PlatformSupportInput } from '@lowvolt/schema';
import { p, unverified } from './documents.js';
import { cap, port, spec } from './helpers.js';

/** All LP boards accept 12–24 VDC. */
const LP_INPUT_VDC = [12, 24];

/** DNA Fusion drives authentic Mercury. Min version is an UNCONFIRMED example. */
const dnaSupported = (): PlatformSupportInput => ({
  supported: true,
  min_platform_version: '6.5.0.2',
  max_platform_version: null,
  min_firmware: null,
  firmware_matrix: [],
  capacity_overrides: [],
  licensing: [{ unit: 'door', per_child: 'door' }],
  notes: 'Native Mercury capacities apply; no derate.',
  provenance: unverified(
    'min_platform_version 6.5.0.2 is the example value from the project brief, not a matrix reading. Confirm before it gates a RED line.',
  ),
});

const lenelSupported = (note: string): PlatformSupportInput => ({
  supported: true,
  min_platform_version: null,
  max_platform_version: null,
  min_firmware: null,
  firmware_matrix: [],
  capacity_overrides: [],
  licensing: [{ unit: 'door', per_child: 'door' }],
  notes: note,
  provenance: unverified(
    'LenelS2 hardware compatibility matrix not yet attached. Support is assumed from the Mercury lineage; capacities are NOT assumed — no overrides are recorded, so lookups fall through to native values and any rule reading them warns rather than blocks.',
  ),
});

const notSupported = (docNote: string): PlatformSupportInput => ({
  supported: false,
  min_platform_version: null,
  max_platform_version: null,
  min_firmware: null,
  firmware_matrix: [],
  capacity_overrides: [],
  licensing: [],
  notes: docNote,
  provenance: p('verkada_ac', 'verified', docNote),
});

const VERKADA_CLOSED = notSupported(
  'Verkada Command is a closed appliance ecosystem; third-party Mercury hardware is not supported.',
);

/** The RS-485 downstream bus, identical on every Mercury host port. */
const rs485Bus = (id: string, count: number, maxDevices: number) => ({
  id,
  type: 'rs485_downstream' as const,
  count: spec(count, p('mercury_lp'), 'count'),
  max_devices_per_bus: spec(maxDevices, p('mercury_lp'), 'count'),
  max_length: spec(4000, p('sia_osdp'), 'ft' as const),
  cable_spec: '1 twisted pair + shield, 120 ohm characteristic impedance, 24 AWG',
  termination: {
    required_ohm: spec(120, p('sia_osdp'), 'ohm' as const),
    ends_only: true,
    required_above_length: spec(200, p('sia_osdp'), 'ft' as const),
  },
});

export const MERCURY_DEVICES: CatalogDeviceInput[] = [
  /* ------------------------- LP intelligent controllers ------------------------- */
  {
    sku: 'LP1501',
    manufacturer: 'Mercury Security / Open Options',
    family: 'LP Series Intelligent Controller',
    class: 'controller',
    display_name: 'Mercury LP1501 Intelligent Controller',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [],
    capacities: [
      cap('downstream_device', 8, p('mercury_lp')),
      cap('reader', 17, p('mercury_lp')),
    ],
    provides_bus: [rs485Bus('downstream', 1, 8)],
    consumes: { slots: 1 },
    power: {
      input_vdc: LP_INPUT_VDC,
      input_vdc_provenance: p('mercury_lp'),
      aux_output_shared: true,
    },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      // THE derate. Native = 17 readers / 8 downstream. Under Alta: 8 entries.
      avigilon_alta: {
        supported: true,
        min_platform_version: null,
        max_platform_version: null,
        min_firmware: null,
        firmware_matrix: [],
        capacity_overrides: [
          cap('entry', 8, p('alta_mercury_matrix'), {
            compares_to_native: 'reader',
            qualifier: 'Alta Access supports the LP1501 to 8 entries, below the native Mercury reader count.',
          }),
        ],
        licensing: [{ unit: 'entry', per_child: 'entry' }],
        notes: 'Mercury LP1501 under Alta Access is limited to 8 entries.',
        provenance: p('alta_mercury_matrix'),
      },
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury LP lineage.'),
      lenels2_netbox: lenelSupported('Mercury LP lineage.'),
    },
    tags: ['mercury', 'lp_series', 'access_control'],
    provenance: p('mercury_lp'),
  },
  {
    sku: 'LP1502',
    manufacturer: 'Mercury Security / Open Options',
    family: 'LP Series Intelligent Controller',
    class: 'controller',
    display_name: 'Mercury LP1502 Intelligent Controller',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 2, p('mercury_lp'), {
        modes: ['osdp', 'osdp_secure_channel', 'wiegand'],
        notes: 'Onboard reader ports.',
      }),
      port('input', 'supervised_input', 8, p('mercury_lp')),
      port('output', 'form_c_relay', 4, p('mercury_lp')),
    ],
    capacities: [
      cap('downstream_device', 32, p('mercury_lp')),
      cap('reader', 64, p('mercury_lp')),
      cap('card_format', 16, p('mercury_lp')),
      cap('card_format_offline', 8, p('mercury_lp'), {
        qualifier:
          'Only the lower 8 of the controller’s 16 card formats are pushed to SIOs for offline / degraded facility-code mode.',
      }),
    ],
    provides_bus: [rs485Bus('downstream', 1, 32)],
    consumes: { slots: 1 },
    power: { input_vdc: LP_INPUT_VDC, input_vdc_provenance: p('mercury_lp'), aux_output_shared: true },
    protocols: {
      reader_protocols: ['osdp', 'osdp_secure_channel', 'wiegand'],
      mixed_protocol_per_device: true,
      mixed_protocol_per_port: false,
      building_protocols: [],
      provenance: p('mercury_lp'),
    },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      // Acceptance test #3 lives here: 40 entries under Alta is RED at 32,
      // even though native Mercury reads 64 readers.
      avigilon_alta: {
        supported: true,
        min_platform_version: null,
        max_platform_version: null,
        min_firmware: null,
        firmware_matrix: [],
        capacity_overrides: [
          cap('entry', 32, p('alta_mercury_matrix'), {
            compares_to_native: 'reader',
            qualifier: 'Alta Access supports the LP1502 to 32 entries; native Mercury reads 64 readers.',
          }),
        ],
        licensing: [{ unit: 'entry', per_child: 'entry' }],
        notes: 'Mercury LP1502 under Alta Access is limited to 32 entries.',
        provenance: p('alta_mercury_matrix'),
      },
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury LP lineage.'),
      lenels2_netbox: lenelSupported('Mercury LP lineage.'),
    },
    tags: ['mercury', 'lp_series', 'access_control'],
    provenance: p('mercury_lp'),
  },
  {
    sku: 'LP2500',
    manufacturer: 'Mercury Security / Open Options',
    family: 'LP Series Intelligent Controller',
    class: 'controller',
    display_name: 'Mercury LP2500 Intelligent Controller',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [],
    capacities: [
      cap('downstream_device', 32, p('mercury_lp'), {
        qualifier: 'Up to 32 SIO subpanels across the two RS-485 downstream ports.',
      }),
      cap('door', 64, p('mercury_lp')),
      cap('reader', 64, p('mercury_lp')),
      cap('card_format', 16, p('mercury_lp')),
      cap('card_format_offline', 8, p('mercury_lp'), {
        qualifier: 'Only the lower 8 card formats are pushed to SIOs for offline mode.',
      }),
    ],
    provides_bus: [rs485Bus('downstream', 2, 32)],
    consumes: { slots: 1 },
    power: { input_vdc: LP_INPUT_VDC, input_vdc_provenance: p('mercury_lp'), aux_output_shared: true },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: {
        supported: true,
        min_platform_version: null,
        max_platform_version: null,
        min_firmware: null,
        firmware_matrix: [],
        capacity_overrides: [
          cap('entry', 32, p('alta_mercury_matrix'), {
            compares_to_native: 'door',
            qualifier: 'Alta Access supports the LP2500 to 32 entries; native Mercury reads 64 doors.',
          }),
        ],
        licensing: [{ unit: 'entry', per_child: 'entry' }],
        notes: 'Mercury LP2500 under Alta Access is limited to 32 entries.',
        provenance: p('alta_mercury_matrix'),
      },
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury LP lineage.'),
      lenels2_netbox: lenelSupported('Mercury LP lineage.'),
    },
    tags: ['mercury', 'lp_series', 'access_control', 'no_onboard_reader_io'],
    provenance: p('mercury_lp'),
  },
  {
    sku: 'LP4502',
    manufacturer: 'Mercury Security / Open Options',
    family: 'LP Series Intelligent Controller',
    class: 'controller',
    display_name: 'Mercury LP4502 Intelligent Controller',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 2, p('mercury_lp'), {
        modes: ['osdp', 'osdp_secure_channel', 'wiegand'],
      }),
      port('input', 'supervised_input', 8, p('mercury_lp')),
      port('output', 'form_c_relay', 4, p('mercury_lp')),
    ],
    capacities: [
      cap('downstream_device', 32, p('mercury_lp')),
      cap('reader', 256, p('mercury_lp')),
      cap('card_format', 16, p('mercury_lp')),
      cap('card_format_offline', 8, p('mercury_lp'), {
        qualifier: 'Only the lower 8 card formats are pushed to SIOs for offline mode.',
      }),
    ],
    provides_bus: [rs485Bus('downstream', 1, 32)],
    consumes: { slots: 1 },
    power: { input_vdc: LP_INPUT_VDC, input_vdc_provenance: p('mercury_lp'), aux_output_shared: true },
    protocols: {
      reader_protocols: ['osdp', 'osdp_secure_channel', 'wiegand'],
      mixed_protocol_per_device: true,
      mixed_protocol_per_port: false,
      building_protocols: ['bacnet_ip'],
      provenance: p('mercury_lp'),
    },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: {
        supported: false,
        min_platform_version: null,
        max_platform_version: null,
        min_firmware: null,
        firmware_matrix: [],
        capacity_overrides: [],
        licensing: [],
        notes: 'LP4502 is not listed on the Alta Access supported-Mercury matrix.',
        provenance: unverified(
          'Absence from the Alta matrix is recorded as "not listed", not as a documented refusal. Treated as unsupported but warn-only until the matrix is attached.',
        ),
      },
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury LP lineage; high-assurance credential support.'),
      lenels2_netbox: lenelSupported('Mercury LP lineage.'),
    },
    tags: ['mercury', 'lp_series', 'access_control', 'bacnet', 'high_assurance'],
    provenance: p('mercury_lp'),
  },

  /* ------------------------------ MR sub-controllers ----------------------------- */
  {
    sku: 'MR50',
    manufacturer: 'Mercury Security / Open Options',
    family: 'MR Series SIO',
    class: 'sub_controller',
    display_name: 'Mercury MR50 Single-Reader Interface',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 1, p('mercury_mr'), {
        modes: ['osdp', 'osdp_secure_channel', 'wiegand'],
      }),
    ],
    capacities: [cap('reader', 1, p('mercury_mr'))],
    consumes: { bus: 'rs485_downstream', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('mercury_mr'), aux_output_shared: true },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: notSupported('MR50 is not listed on the Alta Access supported-Mercury matrix.'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury MR lineage.'),
      lenels2_netbox: lenelSupported('Mercury MR lineage.'),
    },
    tags: ['mercury', 'mr_series', 'sio'],
    provenance: p('mercury_mr'),
  },
  {
    // Acceptance test #1 target.
    sku: 'MR52',
    manufacturer: 'Mercury Security / Open Options',
    family: 'MR Series SIO',
    class: 'sub_controller',
    display_name: 'Mercury MR52 Dual-Reader Interface',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 2, p('mercury_mr'), {
        modes: ['osdp', 'osdp_secure_channel', 'wiegand'],
      }),
      port('input', 'supervised_input', 8, p('mercury_mr')),
      port('output', 'form_c_relay', 6, p('mercury_mr')),
    ],
    capacities: [cap('door', 2, p('mercury_mr')), cap('reader', 2, p('mercury_mr'))],
    consumes: { bus: 'rs485_downstream', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('mercury_mr'), aux_output_shared: true },
    protocols: {
      reader_protocols: ['osdp', 'osdp_secure_channel', 'wiegand'],
      mixed_protocol_per_device: true,
      mixed_protocol_per_port: false,
      building_protocols: [],
      provenance: p('mercury_mr'),
    },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: notSupported('MR52 is not listed on the Alta Access supported-Mercury matrix.'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury MR lineage.'),
      lenels2_netbox: lenelSupported('Mercury MR lineage.'),
    },
    tags: ['mercury', 'mr_series', 'sio'],
    provenance: p('mercury_mr'),
  },
  {
    sku: 'MR16IN',
    manufacturer: 'Mercury Security / Open Options',
    family: 'MR Series SIO',
    class: 'sub_controller',
    display_name: 'Mercury MR16IN 16-Input Monitor Module',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [port('input', 'supervised_input', 16, p('mercury_mr'))],
    capacities: [cap('input', 16, p('mercury_mr')), cap('door', 0, p('mercury_mr'))],
    consumes: { bus: 'rs485_downstream', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('mercury_mr'), aux_output_shared: true },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: notSupported('MR16IN is not listed on the Alta Access supported-Mercury matrix.'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury MR lineage.'),
      lenels2_netbox: lenelSupported('Mercury MR lineage.'),
    },
    tags: ['mercury', 'mr_series', 'sio', 'inputs'],
    provenance: p('mercury_mr'),
  },
  {
    sku: 'MR16OUT',
    manufacturer: 'Mercury Security / Open Options',
    family: 'MR Series SIO',
    class: 'sub_controller',
    display_name: 'Mercury MR16OUT 16-Output Relay Module',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [
      port('output', 'form_c_relay', 16, p('mercury_mr'), {
        rating: { no: '5A@30VDC', nc: '3A@30VDC' },
      }),
    ],
    capacities: [cap('output', 16, p('mercury_mr')), cap('door', 0, p('mercury_mr'))],
    consumes: { bus: 'rs485_downstream', slots: 1 },
    power: { input_vdc: [12], input_vdc_provenance: p('mercury_mr'), aux_output_shared: true },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: notSupported('MR16OUT is not listed on the Alta Access supported-Mercury matrix.'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury MR lineage.'),
      lenels2_netbox: lenelSupported('Mercury MR lineage.'),
    },
    tags: ['mercury', 'mr_series', 'sio', 'relays'],
    provenance: p('mercury_mr'),
  },
  {
    sku: 'MR62e',
    manufacturer: 'Mercury Security / Open Options',
    family: 'MR Series SIO (Ethernet/PoE)',
    class: 'sub_controller',
    display_name: 'Mercury MR62e PoE Door Interface',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [
      port('reader', 'osdp', 2, p('oo_nsc'), { modes: ['osdp', 'osdp_secure_channel'] }),
      port('uplink', 'ethernet', 1, p('oo_nsc')),
    ],
    capacities: [
      cap('downstream_device', 4, p('oo_nsc'), {
        qualifier: 'Maximum 4 devices on the OSDP reader data line.',
      }),
    ],
    consumes: { bus: 'ip', slots: 1 },
    power: {
      input_vdc: [12],
      input_vdc_provenance: p('oo_nsc'),
      draw_ma: spec(1700, p('oo_nsc'), 'mA'),
      // The rule that bites in the field: reader + aux share ONE 700 mA budget.
      aux_output_ma: spec(700, p('oo_nsc'), 'mA'),
      aux_output_shared: true,
      poe: {
        role: 'pd',
        standard: '802.3af',
        class: spec(3, p('oo_nsc'), 'count'),
        pd_watts: spec(12.95, p('oo_nsc'), 'W'),
      },
    },
    protocols: {
      reader_protocols: ['osdp', 'osdp_secure_channel'],
      mixed_protocol_per_device: false,
      mixed_protocol_per_port: false,
      building_protocols: [],
      provenance: p('oo_nsc'),
    },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: notSupported('MR62e is not listed on the Alta Access supported-Mercury matrix.'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: lenelSupported('Mercury MR lineage.'),
      lenels2_netbox: lenelSupported('Mercury MR lineage.'),
    },
    tags: ['mercury', 'poe', 'sio', 'osdp'],
    provenance: p('oo_nsc'),
  },

  /* --------------------------- Open Options NSC modules -------------------------- */
  {
    sku: 'NSC-100',
    manufacturer: 'Open Options',
    family: 'NSC Network Sub-Controller',
    class: 'sub_controller',
    display_name: 'Open Options NSC-100 IP Door Module',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [
      port('reader', 'osdp_or_wiegand', 2, p('oo_nsc'), {
        modes: ['osdp', 'osdp_secure_channel', 'wiegand'],
      }),
      port('input', 'supervised_input', 4, p('oo_nsc')),
      port('output', 'form_c_relay', 2, p('oo_nsc')),
      port('uplink', 'ethernet', 1, p('oo_nsc')),
    ],
    capacities: [cap('reader', 2, p('oo_nsc'))],
    consumes: { bus: 'ip', slots: 1 },
    power: {
      input_vdc: [12],
      input_vdc_provenance: p('oo_nsc'),
      aux_output_ma: spec(900, p('oo_nsc'), 'mA'),
      aux_output_shared: true,
    },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: notSupported('Open Options NSC hardware is DNA Fusion-specific.'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: notSupported('Open Options NSC hardware is DNA Fusion-specific.'),
      lenels2_netbox: notSupported('Open Options NSC hardware is DNA Fusion-specific.'),
    },
    tags: ['open_options', 'ip_door_module'],
    provenance: p('oo_nsc'),
  },
  {
    sku: 'NSC-200',
    manufacturer: 'Open Options',
    family: 'NSC Network Sub-Controller',
    class: 'sub_controller',
    display_name: 'Open Options NSC-200 PoE Network Sub-Controller',
    lifecycle: { status: 'active', superseded_by: null, eol_date: null },
    ports: [
      port('reader', 'osdp', 2, p('oo_nsc'), { modes: ['osdp', 'osdp_secure_channel'] }),
      port('uplink', 'ethernet', 1, p('oo_nsc')),
    ],
    capacities: [
      cap('downstream_device', 4, p('oo_nsc'), {
        qualifier: 'Maximum 4 devices on the OSDP reader data line.',
      }),
    ],
    consumes: { bus: 'ip', slots: 1 },
    power: {
      input_vdc: [12],
      input_vdc_provenance: p('oo_nsc'),
      draw_ma: spec(1700, p('oo_nsc'), 'mA'),
      aux_output_ma: spec(700, p('oo_nsc'), 'mA'),
      aux_output_shared: true,
      poe: {
        role: 'pd',
        standard: '802.3af',
        class: spec(3, p('oo_nsc'), 'count'),
        pd_watts: spec(12.95, p('oo_nsc'), 'W'),
      },
    },
    protocols: {
      reader_protocols: ['osdp', 'osdp_secure_channel'],
      mixed_protocol_per_device: false,
      mixed_protocol_per_port: false,
      building_protocols: [],
      provenance: p('oo_nsc'),
    },
    listings: ['UL 294'],
    compliance_flags: ['unknown'],
    platform_support: {
      dna_fusion: dnaSupported(),
      avigilon_alta: notSupported('Open Options NSC hardware is DNA Fusion-specific.'),
      verkada_command: VERKADA_CLOSED,
      lenels2_onguard: notSupported('Open Options NSC hardware is DNA Fusion-specific.'),
      lenels2_netbox: notSupported('Open Options NSC hardware is DNA Fusion-specific.'),
    },
    tags: ['open_options', 'poe', 'osdp'],
    provenance: p('oo_nsc'),
  },
];

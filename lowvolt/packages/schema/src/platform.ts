import { z } from 'zod';
import { ProvenanceSchema } from './provenance.js';

/**
 * PLATFORM (head-end)
 * -------------------
 * Guardrail #3: capacity, support and licensing are ALWAYS platform-scoped.
 * The platform is half of the resolution key; the other half is the device SKU.
 */
export const PlatformIdSchema = z.enum([
  'dna_fusion', // Open Options DNA Fusion (on-prem)
  'avigilon_alta', // Avigilon Alta Access, ex-Openpath (cloud)
  'verkada_command', // Verkada Command (cloud)
  'lenels2_onguard', // LenelS2 OnGuard (on-prem/hybrid)
  'lenels2_netbox', // LenelS2 NetBox (on-prem/hybrid)
]);
export type PlatformId = z.infer<typeof PlatformIdSchema>;

/** What a license seat is counted in. Drives AC-LIC-* rules. */
export const LicenseUnitSchema = z.enum([
  'door',
  'entry',
  'reader',
  'controller',
  'camera_channel',
  'client_workstation',
  'cardholder',
  'intercom_station',
]);
export type LicenseUnit = z.infer<typeof LicenseUnitSchema>;

export const PlatformVersionSchema = z.object({
  /** Dotted version as the vendor writes it, e.g. "6.5.0.2". */
  version: z.string().min(1),
  released: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  lifecycle: z.enum(['current', 'supported', 'eol']).default('supported'),
  provenance: ProvenanceSchema,
});
export type PlatformVersion = z.infer<typeof PlatformVersionSchema>;

export const PlatformSchema = z.object({
  id: PlatformIdSchema,
  name: z.string().min(1),
  vendor: z.string().min(1),
  deployment: z.enum(['on_prem', 'cloud', 'hybrid']),
  /** Cloud platforms have no customer-hosted head-end server line item. */
  head_end_server_required: z.boolean(),
  /**
   * Mutual exclusivity: a single access_control system may not mix these.
   * Drives AC-PLAT-* (cloud vs on-prem) rules.
   */
  exclusive_with: z.array(PlatformIdSchema).default([]),
  license_units: z.array(LicenseUnitSchema).min(1),
  /** Versions we hold a compatibility matrix for. Empty = matrix not yet loaded. */
  versions: z.array(PlatformVersionSchema).default([]),
  notes: z.string().optional(),
  provenance: ProvenanceSchema,
});
export type Platform = z.infer<typeof PlatformSchema>;
export type PlatformInput = z.input<typeof PlatformSchema>;

/**
 * The resolution key. Every capacity/support/licensing lookup takes one of
 * these. There is no lookup API that omits it — that is the point.
 */
export const PlatformContextSchema = z.object({
  platform_id: PlatformIdSchema,
  /** null = "version not chosen yet"; version-gated rules then warn, not block. */
  platform_version: z.string().nullable(),
});
export type PlatformContext = z.infer<typeof PlatformContextSchema>;

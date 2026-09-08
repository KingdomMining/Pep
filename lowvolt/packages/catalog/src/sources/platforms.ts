import type { PlatformInput } from '@lowvolt/schema';
import { p, unverified } from './documents.js';

/**
 * The four Phase-1 head-ends. LenelS2 ships as two platform ids because
 * OnGuard and NetBox carry different hardware matrices — the whole point of
 * the platform-scoped model is that they are not interchangeable.
 */
export const PLATFORMS: PlatformInput[] = [
  {
    id: 'dna_fusion',
    name: 'DNA Fusion',
    vendor: 'Open Options',
    deployment: 'on_prem',
    head_end_server_required: true,
    exclusive_with: ['avigilon_alta', 'verkada_command', 'lenels2_onguard', 'lenels2_netbox'],
    license_units: ['door', 'reader', 'controller', 'client_workstation', 'cardholder'],
    versions: [
      {
        version: '6.5.0.2',
        released: null,
        lifecycle: 'supported',
        provenance: unverified(
          'Minimum-version example carried from the project brief (§5.2 "requires DNA Fusion 6.5.0.2+"). Confirm against the DNA Fusion HCM before this gates a RED line.',
        ),
      },
    ],
    notes: 'Open-architecture head-end driving authentic Mercury LP/MR hardware.',
    provenance: p('dna_matrix'),
  },
  {
    id: 'avigilon_alta',
    name: 'Alta Access',
    vendor: 'Avigilon (formerly Openpath)',
    deployment: 'cloud',
    head_end_server_required: false,
    exclusive_with: ['dna_fusion', 'verkada_command', 'lenels2_onguard', 'lenels2_netbox'],
    license_units: ['entry', 'door', 'reader'],
    versions: [],
    notes:
      'Cloud/hybrid. Runs its own ACU hardware AND Mercury LP boards — at DIFFERENT supported capacities than native Mercury. See capacity_overrides on the LP SKUs.',
    provenance: p('alta_acu'),
  },
  {
    id: 'verkada_command',
    name: 'Command',
    vendor: 'Verkada',
    deployment: 'cloud',
    head_end_server_required: false,
    exclusive_with: ['dna_fusion', 'avigilon_alta', 'lenels2_onguard', 'lenels2_netbox'],
    license_units: ['door', 'camera_channel'],
    versions: [],
    notes: 'Cloud appliance model; no customer-hosted head-end server. Verkada controllers only.',
    provenance: p('verkada_ac'),
  },
  {
    id: 'lenels2_onguard',
    name: 'OnGuard',
    vendor: 'LenelS2',
    deployment: 'hybrid',
    head_end_server_required: true,
    exclusive_with: ['dna_fusion', 'avigilon_alta', 'verkada_command'],
    license_units: ['door', 'reader', 'controller', 'client_workstation', 'cardholder'],
    versions: [],
    notes: 'Mercury-based. Third limit set on the same metal — proves the platform-derate rule.',
    provenance: p('lenels2_matrix'),
  },
  {
    id: 'lenels2_netbox',
    name: 'NetBox',
    vendor: 'LenelS2',
    deployment: 'on_prem',
    head_end_server_required: true,
    exclusive_with: ['dna_fusion', 'avigilon_alta', 'verkada_command'],
    license_units: ['door', 'reader', 'controller'],
    versions: [],
    notes: 'S2 native nodes plus Mercury. Separate matrix from OnGuard.',
    provenance: p('lenels2_matrix'),
  },
];

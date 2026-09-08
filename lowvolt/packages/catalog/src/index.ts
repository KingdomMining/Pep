import {
  CatalogDeviceSchema,
  PlatformSchema,
  StandardSchema,
  type CatalogDevice,
  type Platform,
  type Standard,
  type PlatformContext,
  type Provenance,
  resolveCapacity,
  resolveSupport,
} from '@lowvolt/schema';
import { PLATFORMS } from './sources/platforms.js';
import { MERCURY_DEVICES } from './sources/devices-mercury.js';
import { ALTA_DEVICES, VERKADA_DEVICES } from './sources/devices-alta.js';
import { MEDIA_DEVICES, PLACEHOLDER_READERS, STANDARDS } from './sources/media.js';

export const CATALOG_VERSION = '0.1.0';

const RAW_DEVICES: unknown[] = [
  ...MERCURY_DEVICES,
  ...ALTA_DEVICES,
  ...VERKADA_DEVICES,
  ...MEDIA_DEVICES,
  ...PLACEHOLDER_READERS,
];

export interface Catalog {
  version: string;
  platforms: Platform[];
  devices: CatalogDevice[];
  standards: Standard[];
  bySku: Map<string, CatalogDevice>;
  byPlatform: Map<string, Platform>;
}

/** Parse + validate. Throws on a malformed entry — the catalog is a contract. */
export function loadCatalog(): Catalog {
  const platforms = PLATFORMS.map((x) => PlatformSchema.parse(x));
  const devices = RAW_DEVICES.map((x) => CatalogDeviceSchema.parse(x));
  const standards = STANDARDS.map((x) => StandardSchema.parse(x));

  const bySku = new Map<string, CatalogDevice>();
  for (const d of devices) {
    if (bySku.has(d.sku)) throw new Error(`Duplicate catalog SKU: ${d.sku}`);
    bySku.set(d.sku, d);
  }
  const byPlatform = new Map(platforms.map((p) => [p.id, p]));
  return { version: CATALOG_VERSION, platforms, devices, standards, bySku, byPlatform };
}

/* --------------------------- "Specs to confirm" --------------------------- */

export interface CitationGap {
  sku: string;
  path: string;
  reason: 'unverified' | 'inferred' | 'missing_source_url';
  document_title: string;
  note?: string;
}

/** Walk every Provenance in an object graph, recording where it was found. */
function walkProvenance(node: unknown, path: string, out: Array<{ path: string; p: Provenance }>): void {
  if (node === null || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    node.forEach((v, i) => walkProvenance(v, `${path}[${i}]`, out));
    return;
  }
  const rec = node as Record<string, unknown>;
  if (typeof rec['document_title'] === 'string' && typeof rec['retrieved'] === 'string' && 'confidence' in rec) {
    out.push({ path, p: rec as unknown as Provenance });
    return;
  }
  for (const [k, v] of Object.entries(rec)) walkProvenance(v, path ? `${path}.${k}` : k, out);
}

/**
 * Guardrail #1's queue. Everything here renders gray dashed in the UI and is
 * warn-only. `missing_source_url` is a softer state: the value is verified but
 * the permanent link is not attached yet.
 */
export function citationGaps(catalog: Catalog): CitationGap[] {
  const gaps: CitationGap[] = [];
  for (const d of catalog.devices) {
    const found: Array<{ path: string; p: Provenance }> = [];
    walkProvenance(d, '', found);
    for (const { path, p } of found) {
      const reason: CitationGap['reason'] =
        p.confidence === 'unverified'
          ? 'unverified'
          : p.confidence === 'inferred'
            ? 'inferred'
            : p.source_url === null
              ? 'missing_source_url'
              : null as never;
      if (reason === null) continue;
      gaps.push({
        sku: d.sku,
        path: path || '(root)',
        reason,
        document_title: p.document_title,
        ...(p.note ? { note: p.note } : {}),
      });
    }
  }
  return gaps;
}

/** Every SKU usable on a head-end, for `swap_model` fix candidates. */
export function devicesForPlatform(catalog: Catalog, ctx: PlatformContext): CatalogDevice[] {
  return catalog.devices.filter((d) => resolveSupport(d, ctx).supported);
}

/** Convenience wrapper so callers never touch device.capacities directly. */
export function capacityOf(
  catalog: Catalog,
  sku: string,
  kind: Parameters<typeof resolveCapacity>[1],
  ctx: PlatformContext,
) {
  const device = catalog.bySku.get(sku);
  if (!device) throw new Error(`Unknown SKU: ${sku}`);
  return resolveCapacity(device, kind, ctx);
}

export { PLATFORMS, STANDARDS };
export * from './sources/documents.js';

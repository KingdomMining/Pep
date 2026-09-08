#!/usr/bin/env tsx
import {
  loadCatalog,
  citationGaps,
  devicesForPlatform,
  capacityOf,
  type Catalog,
} from '@lowvolt/catalog';
import {
  CapacityKindSchema,
  PlatformIdSchema,
  resolveSupport,
  citation,
  type CapacityKind,
  type PlatformContext,
  type PlatformId,
} from '@lowvolt/schema';

const [, , cmd, ...rest] = process.argv;

function die(msg: string): never {
  process.stderr.write(`${msg}\n`);
  process.exit(1);
}

function flag(name: string): string | undefined {
  const i = rest.indexOf(`--${name}`);
  return i >= 0 ? rest[i + 1] : undefined;
}

function ctxFromFlags(): PlatformContext {
  const raw = flag('platform') ?? die('Missing --platform <id>');
  const parsed = PlatformIdSchema.safeParse(raw);
  if (!parsed.success) die(`Unknown platform "${raw}". One of: ${PlatformIdSchema.options.join(', ')}`);
  return { platform_id: parsed.data, platform_version: flag('version') ?? null };
}

function cmdValidate(catalog: Catalog): void {
  const gaps = citationGaps(catalog);
  const blocking = gaps.filter((g) => g.reason === 'unverified');
  process.stdout.write(
    `catalog ${catalog.version}: ${catalog.devices.length} devices, ` +
      `${catalog.platforms.length} platforms, ${catalog.standards.length} standard sets — schema OK\n`,
  );
  process.stdout.write(
    `provenance: ${gaps.length} gaps (${blocking.length} unverified, ` +
      `${gaps.filter((g) => g.reason === 'missing_source_url').length} awaiting a source URL)\n`,
  );
}

function cmdGaps(catalog: Catalog): void {
  const gaps = citationGaps(catalog);
  const bySku = new Map<string, typeof gaps>();
  for (const g of gaps) {
    const list = bySku.get(g.sku);
    if (list) list.push(g);
    else bySku.set(g.sku, [g]);
  }
  process.stdout.write('SPECS TO CONFIRM\n================\n');
  for (const [sku, list] of [...bySku].sort()) {
    const unverified = list.filter((g) => g.reason === 'unverified').length;
    process.stdout.write(`\n${sku}  (${list.length} gaps, ${unverified} unverified)\n`);
    for (const g of list.slice(0, 40)) {
      process.stdout.write(`  [${g.reason}] ${g.path}\n      ${g.document_title}\n`);
      if (g.note) process.stdout.write(`      note: ${g.note}\n`);
    }
  }
}

function cmdCapacity(catalog: Catalog): void {
  const sku = rest[0] ?? die('Usage: lv capacity <sku> --platform <id> [--of <kind>] [--version <v>]');
  const ctx = ctxFromFlags();
  const device = catalog.bySku.get(sku) ?? die(`Unknown SKU: ${sku}`);
  const support = resolveSupport(device, ctx);

  process.stdout.write(`${device.sku} — ${device.display_name}\n`);
  process.stdout.write(`platform: ${ctx.platform_id}${ctx.platform_version ? ` @ ${ctx.platform_version}` : ''}\n`);

  if (!support.supported) {
    process.stdout.write(`  UNSUPPORTED (${support.reason})\n`);
    if (support.provenance) process.stdout.write(`  source: ${citation(support.provenance)}\n`);
    return;
  }
  process.stdout.write(`  version gate: ${support.version_gate.status}`);
  if (support.version_gate.required_min) process.stdout.write(` (min ${support.version_gate.required_min})`);
  process.stdout.write('\n');

  const only = flag('of');
  const kinds: CapacityKind[] = only
    ? [CapacityKindSchema.parse(only)]
    : CapacityKindSchema.options;

  for (const kind of kinds) {
    const r = capacityOf(catalog, sku, kind, ctx);
    if (r.source === 'absent' && !only) continue;
    const derate =
      r.derated && r.native_max !== null && r.native_max !== undefined
        ? `  <- DERATED from ${r.native_max} ${r.native_kind ?? kind} native`
        : '';
    process.stdout.write(
      `  ${kind.padEnd(22)} ${String(r.max ?? '—').padStart(5)}  [${r.source}, ${r.confidence}]${derate}\n`,
    );
    if (r.qualifier) process.stdout.write(`  ${' '.repeat(22)} ${r.qualifier}\n`);
    for (const p of r.provenance_chain) process.stdout.write(`  ${' '.repeat(22)} src: ${citation(p)}\n`);
  }
}

function cmdPlatformDevices(catalog: Catalog): void {
  const ctx = ctxFromFlags();
  const devices = devicesForPlatform(catalog, ctx);
  process.stdout.write(`${devices.length} SKUs supported on ${ctx.platform_id}:\n`);
  for (const d of devices) process.stdout.write(`  ${d.sku.padEnd(24)} ${d.class.padEnd(16)} ${d.display_name}\n`);
}

function cmdDerates(catalog: Catalog): void {
  process.stdout.write('PLATFORM-SCOPED CAPACITY MATRIX (same metal, different limits)\n');
  const platforms = PlatformIdSchema.options as PlatformId[];
  for (const d of catalog.devices) {
    const rows: string[] = [];
    for (const pid of platforms) {
      const ctx: PlatformContext = { platform_id: pid, platform_version: null };
      const s = resolveSupport(d, ctx);
      if (!s.supported) continue;
      const parts: string[] = [];
      for (const kind of ['door', 'entry', 'reader', 'downstream_device'] as CapacityKind[]) {
        const r = capacityOf(catalog, d.sku, kind, ctx);
        if (r.max === null) continue;
        parts.push(`${kind}=${r.max}${r.derated ? `(derated from ${r.native_max})` : ''}`);
      }
      if (parts.length > 0) rows.push(`    ${pid.padEnd(18)} ${parts.join('  ')}`);
    }
    if (rows.length > 0) {
      process.stdout.write(`\n  ${d.sku}\n${rows.join('\n')}\n`);
    }
  }
  process.stdout.write('\n');
}

function main(): void {
  const catalog = loadCatalog();
  switch (cmd) {
    case 'catalog:validate':
      return cmdValidate(catalog);
    case 'catalog:gaps':
      return cmdGaps(catalog);
    case 'capacity':
      return cmdCapacity(catalog);
    case 'platform:devices':
      return cmdPlatformDevices(catalog);
    case 'derates':
      return cmdDerates(catalog);
    default:
      process.stdout.write(
        [
          'lv — LowVolt OS CLI (Phase 1: schema + catalog)',
          '',
          '  lv catalog:validate                       parse the catalog, report provenance health',
          '  lv catalog:gaps                           the "Specs to confirm" queue',
          '  lv capacity <sku> --platform <id> [--of <kind>] [--version <v>]',
          '  lv platform:devices --platform <id>       SKUs usable on a head-end',
          '  lv derates                                the platform-scoped capacity matrix',
          '',
          `  platforms: ${PlatformIdSchema.options.join(', ')}`,
          '',
        ].join('\n'),
      );
  }
}

main();

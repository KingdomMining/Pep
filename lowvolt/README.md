# LowVolt OS

Low-voltage estimating and design-validation platform for Div 27 / Div 28 contractors.

**Phase 1 (this commit): data model + catalog.** Access control only. No rule content yet — see `SCHEMA.md`, which is the sign-off document for the model before the rule library gets written.

## Why this exists

The same Mercury LP1502 board supports 64 readers natively and 32 entries under Avigilon Alta. Capacity is never a property of a device; it is a function of `(platform, platform_version, controller_model, firmware)`. Model that wrong and every downstream validation is wrong.

```
$ npx tsx packages/cli/src/index.ts derates

  LP1502
    dna_fusion         reader=64  downstream_device=32
    avigilon_alta      entry=32(derated from 64)  reader=64  downstream_device=32
```

## Packages

| Package | Role | Dependencies |
|---|---|---|
| `@lowvolt/schema` | Types, zod schemas, the platform-scoped resolver | zod |
| `@lowvolt/catalog` | Seed catalog for the four Phase-1 platforms, loader, `citationGaps()` | schema, zod |
| `@lowvolt/rule-engine` | Pure validation core — runs in Node, a worker and CI | **none** |
| `@lowvolt/cli` | `lv` — validate, gaps, capacity, derates | schema, catalog |

## Commands

```bash
npm install
npx tsc --noEmit -p tsconfig.json   # typecheck
npx vitest run                      # 39 tests

npx tsx packages/cli/src/index.ts catalog:validate
npx tsx packages/cli/src/index.ts catalog:gaps
npx tsx packages/cli/src/index.ts capacity LP1502 --platform avigilon_alta
npx tsx packages/cli/src/index.ts platform:devices --platform verkada_command
npx tsx packages/cli/src/index.ts derates
```

## Guardrails in force

1. **No fabricated specs.** Every number is a `Spec<T>` with its own provenance. Values without a document are `unverified`, warn-only, and listed by `catalog:gaps` (currently 34 unverified, 248 awaiting a source URL).
2. **Every value cites a document** with a revision and retrieval date.
3. **Capacity is always platform-scoped.** There is no API that reads a capacity without a `PlatformContext`.
4. Head-end matrix beats manufacturer datasheet; the loser is kept in `conflicts_with[]`.
5. Rules require at least one fix (schema-enforced, `min(1)`).
6. A blocking override requires a written reason of at least 10 characters (schema-enforced).
7. Rules are data. No `eval()`; the predicate grammar is a small total language.

## Roadmap

P1 schema + catalog ✅ · P2 rule engine · P3 validation UX · P4 what-if simulator · P5 estimating · P6 takeoff · P7 financial spine · P8 project execution · P9 company layer · P10 trade expansion.

## Note on this repository

This lives in `lowvolt/` alongside an unrelated application at the repository root. It is a self-contained npm workspace and shares nothing with it.

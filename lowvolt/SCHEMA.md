# LowVolt OS — Phase 1 schema, for confirmation

Status: **P1 complete (schema + catalog). Rule library NOT written — awaiting your sign-off on this document.**

Everything below is implemented, typechecked and under test (39 tests green). Where I made a call you did not specify, it is marked **DECISION** and is the thing I need you to confirm or overrule.

---

## 1. The one that matters: capacity is a function, not a field

There is no way to write `max_doors: 2` on a device. The only read path is:

```ts
resolveCapacity(device, kind, { platform_id, platform_version }) -> ResolvedCapacity
```

`ResolvedCapacity` carries `max`, `source` (`platform_override` | `device_base` | `absent`), `confidence`, `provenance_chain`, `native_max` and `derated`. A platform's `capacity_overrides` beat the device's native `capacities`, and both are returned so the explanation card can say *"native Mercury allows 64; Alta Access supports 32."*

Verified working:

```
LP1502
  dna_fusion      reader=64  downstream_device=32
  avigilon_alta   entry=32 (derated from 64)  reader=64  downstream_device=32
LP1501
  dna_fusion      reader=17  downstream_device=8
  avigilon_alta   entry=8 (derated from 17)
LP2500
  dna_fusion      door=64  reader=64  downstream_device=32
  avigilon_alta   entry=32 (derated from 64 doors)
```

**DECISION — `compares_to_native`.** Alta counts *entries*; Mercury counts *readers* and *doors*. Rather than assume `entry == reader`, an override declares which native kind it replaces. Without this the derate comparison is silently lost. This is the one field I added beyond your spec.

---

## 2. Provenance — and the one place I refused to fabricate

`Spec<T> = { value, unit?, provenance }`. Every number in the catalog is a `Spec`. Nothing is a bare literal.

`Provenance` = `source_url | null`, `document_title`, `doc_rev`, `retrieved`, `confidence`, `document_kind`, `conflicts_with[]`.

**DECISION — `source_url` is nullable, and that is deliberate.** Your §3 seed data is real, but I do not have the PDFs in hand, and inventing plausible manufacturer URLs would be exactly the fabrication guardrail #1 forbids. So:

- values from §3 → `confidence: verified`, `source_url: null`
- values not in any document (the DNA Fusion `6.5.0.2` minimum, placeholder readers) → `confidence: unverified`, warn-only
- `citationGaps()` reports both. Current catalog: **34 unverified, 248 awaiting a source URL.**

`EnginePolicy.blocking_requires_source_url` decides whether a null URL may drive a RED line. Default `false` (Phase 1 dev). **I recommend `true` for customer-facing exports** — a red line in a proposal appendix should be clickable. Say the word and I flip the default.

`document_kind` encodes your §Phase-0 rule 4: `head_end_matrix` outranks `manufacturer_doc`, and the loser is stored in `conflicts_with[]` with a written `resolution`.

`weakestConfidence()` folds the chain: a verified native spec derated by an unverified matrix resolves to unverified, and cannot block.

---

## 3. Design graph

Nodes + typed edges. **Capacity counters are derived from edges, never stored** — a stored counter drifts.

- 27 node types, 13 edge types (`contains`, `on_bus`, `controls_door`, `serves_door`, `powers`, `cable_endpoint`, `licensed_by`, `fai_release`, …)
- `PlatformContext` lives on the `system` node. `buildIndex()` precomputes `systemOf` so any node — a door six levels down — resolves its head-end in O(1). Cycle-guarded.
- `dirtyClosure(index, seeds, maxDepth)` walks parents, children and both edge directions. Adding door 4 marks the MR52, the bus and the controller dirty; it does not walk to the project root.
- `orphaned: boolean` on the node — deleting a controller flags its doors, never deletes them (test #11).
- `overrides[].reason` has `min(10)` chars enforced at the schema level. A blocking override without a written reason will not parse (guardrail #6).
- Mutations are `DesignEvent`s; the snapshot is the fold. Undo/redo and audit are free.

---

## 4. Rule DSL

Rules are JSON. `Rule` = `id` (`AC-CAP-014` pattern-enforced), `version`, `category` (all 9), `severity` (blocking/warning/info/unverified), `applies_to` selector, `predicate`, `message` (estimator language), `detail` (spec language), `affects[]`, `fixes` (**`min(1)` — enforced**, so guardrail #5 cannot be violated by an author), `provenance`, `hash`.

**DECISION — `demote_if_unverified`, default `true`.** When any spec a predicate reads is not `verified`, the engine auto-demotes the violation to `warning` and sets `demoted_from`. This makes guardrail #1 mechanical rather than a thing rule authors have to remember.

**DECISION — no `eval()`.** The predicate grammar is small and total: `count(...)`, `capacity('door')`, `attr(...)`, `spec(...)`, `standard(...)`, `sum(...)`, `voltage_at_load()`, `platform()`, `licenses('door')`, plus arithmetic and comparison. The evaluator is a parser, not a sandbox. Rules stay data; nothing in a rule file can execute.

`RuleFixture` exists and the P2 loader will reject a rule with no fixture.

---

## 5. Package layout

```
lowvolt/
  packages/schema/       types + zod schemas + the resolver    (zod only)
  packages/catalog/      seed data + loader + citationGaps()   (schema, zod)
  packages/rule-engine/  PURE, ZERO DEPENDENCIES               (nothing)
  packages/cli/          lv validate / gaps / capacity / derates
```

`@lowvolt/rule-engine` has an empty `dependencies` block and imports nothing but its own files — it runs in Node, in a worker and in CI. Phase 1 ships its calculators (`voltageDrop`, `maxRunFt`, `poeBudget`, `batteryAh`, `loadAgainst`, `conduitFill`); P2 adds the evaluator and loader into the same package.

---

## 6. Catalog contents (30 SKUs, 5 platforms, 5 standard sets)

| Group | SKUs |
|---|---|
| Mercury LP | LP1501, LP1502, LP2500, LP4502 |
| Mercury MR | MR50, MR52, MR16IN, MR16OUT, MR62e |
| Open Options | NSC-100, NSC-200 |
| Alta | OP-ACC, OP-EXP-4, OP-EXP-8, OP-EXP-32IN, OP-SDC, OP-HUB-4/8/16 |
| Verkada | AC41, AC42, AC62 |
| Cable | 22/6-SH, 24/1P-SH, 22/4, 18/4, 18/2, 16/2 (all plenum) |
| Placeholder | RDR-WIEGAND-PLACEHOLDER, RDR-OSDP-PLACEHOLDER |

Standards: TIA-568 lengths, IEEE 802.3 PoE budgets, NEC Ch.9 T1 fill, reader media limits (Wiegand 500 ft / OSDP 4,000 ft / termination above 200 ft), field wiring practice (11.0 V lock minimum, 12 in AC separation, 80%/85% headroom thresholds).

Conductor resistance is NEC Ch. 9 Table 8 at 75 °C — code values, not estimates. They check out against your acceptance test #7: 500 mA, 18 AWG, 250 ft, 12 V → **10.06 V at the lock**, below the 11.0 V floor. And the obvious fix is wrong: 16 AWG lands at 10.78 V, still failing. **14 AWG at 11.23 V is the real upsize.** The engine will offer 14 AWG, not 16.

**DECISION — five platform ids, not four.** LenelS2 OnGuard and NetBox carry different hardware matrices, so they are separate platforms. Collapsing them would recreate the exact bug this model exists to prevent.

**DECISION — LenelS2 support is asserted, capacities are not.** I marked Mercury SKUs supported on LenelS2 by lineage, with `unverified` provenance and **zero capacity overrides**, so lookups fall through to native values and any rule reading them warns rather than blocks. Nothing is invented; the gap is visible in `lv catalog:gaps`.

**Placeholder readers are marked `unverified` and `preview`.** They exist so the Wiegand→OSDP swap (test #5) has a real candidate. They can never hard-fail a design.

---

## 7. What Phase 1 does NOT do

No rule content, no evaluator, no UI, no estimating, no takeoff. That is P2+, and per your instruction I stopped here.

---

## 8. Try it

```bash
cd lowvolt && npm install
npx tsx packages/cli/src/index.ts derates            # the platform-scoped matrix
npx tsx packages/cli/src/index.ts catalog:gaps       # the "Specs to confirm" queue
npx tsx packages/cli/src/index.ts capacity LP1502 --platform avigilon_alta
npx vitest run
```

---

## 9. What I need from you

1. **`compares_to_native`** — keep it, or model entry↔reader equivalence at the platform level instead?
2. **`blocking_requires_source_url`** — flip the default to `true` now, or keep `false` until real PDFs land?
3. **Source documents.** The fastest unblock: drop the Mercury LP/MR install PDFs, the Alta Mercury matrix and the DNA Fusion HCM somewhere I can read, and I will fill in every `source_url` and clear the 248 pending citations.
4. **LenelS2** — leave as lineage-asserted/warn-only, or drop it from Phase 1 until a matrix exists?
5. **Green light for P2** (rule DSL evaluator + the access-control rule library + the 14 acceptance tests as e2e specs).

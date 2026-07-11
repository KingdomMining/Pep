# AEGIS Research — Immersive 3D Research-Peptide Storefront

A fully 3D, single-page storefront for a research-peptide supplier. The
signature feature is a cinematic product experience: each product is a
translucent glass vial that floats and slowly rotates, with a distinct abstract
energy field rendered behind it, keyed to the product's research category.

> **Compliance:** For laboratory research use only. Not for human or animal
> consumption. This is a design showcase demo — no orders are processed, and no
> therapeutic, performance, or benefit claims appear anywhere in the UI.

---

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
```

Production build:

```bash
npm run build    # outputs a single self-contained dist/index.html
npm run preview  # serve the build locally
```

### Just want to click and look?

Open **`dist/index.html`** directly in your browser (double-click it). The
production build inlines all JS/CSS into that one file, so it runs straight from
the filesystem — no server needed. (A prebuilt `dist/index.html` is committed for
convenience; run `npm run build` to regenerate it.)

---

## Stack

| Concern            | Library                                            |
| ------------------ | -------------------------------------------------- |
| App / bundler      | React 18 + Vite                                    |
| 3D                 | three.js via `@react-three/fiber` + `@react-three/drei` |
| Post-processing    | `@react-three/postprocessing` (bloom, depth-of-field) |
| 2D UI motion       | `framer-motion`                                    |
| Styling            | Tailwind CSS                                        |
| State (cart + gate)| `zustand` (persisted to localStorage)              |

No backend — product data lives in `src/data/products.js`.

---

## Project structure

```
src/
├─ components/
│  ├─ Vial.jsx          # The glass vial: geometry, material, idle/hover animation
│  ├─ AmbientField.jsx  # Per-category abstract background effects
│  ├─ VialScene.jsx     # Reusable R3F <Canvas>: lights, env, post stack
│  ├─ ProductCard.jsx   # Gallery card with its own mini 3D canvas
│  ├─ AgeGate.jsx       # Blocking 21+ / RUO modal
│  ├─ CartDrawer.jsx    # Slide-in cart
│  ├─ NavBar.jsx, Footer.jsx
│  └─ Compliance.jsx    # Centralized RUO / FDA / badge copy
├─ pages/
│  ├─ Hero.jsx          # Signature hero vial + tagline
│  ├─ Gallery.jsx       # Responsive grid + category filter
│  ├─ ProductDetail.jsx # Interactive vial, variants, specs, add-to-cart
│  └─ LabResults.jsx    # Third-party verification page
├─ store/useStore.js    # zustand: age gate, cart, lightweight routing
├─ hooks/useEnv.js      # reduced-motion, device quality, in-view (IntersectionObserver)
├─ data/products.js     # Seed catalog (research-framed copy only)
├─ App.jsx, main.jsx, index.css
```

---

## The 3D behavior (the hero of the site)

All of the tweakable knobs are collected at the top of each file and commented.

- **Glass vial** (`Vial.jsx`): a `LatheGeometry` silhouette (rounded shoulders +
  neck) wrapped in `MeshPhysicalMaterial` with `transmission: 1`,
  `roughness ~0.1`, and `ior 1.45`, plus an inner emissive liquid mesh with its
  own color, an aluminum crimp ring, and a rounded rubber stopper.
- **Idle animation**: continuous ~0.3 rad/s Y-rotation + a gentle sine-wave bob,
  so the vial reads as suspended in fluid.
- **Hover / focus**: the vial eases to a faster spin and scales up slightly, and
  on the large scenes the bloom intensifies (`VialScene.jsx → HoverBloom`).
- **Detail view**: OrbitControls-lite (no pan, limited zoom, slow auto-rotate)
  lets the user spin the vial themselves.
- **Lighting**: soft key + rim light plus a procedural studio environment built
  in-memory from `<Lightformer>`s — so glass reflects convincingly **with no
  network HDRI fetch** (important for the offline / double-click build).

### Per-category ambient fields (`AmbientField.jsx`)

Purely aesthetic mood-setting, driven only by category — they never depict or
imply any physiological effect:

| Category        | Effect                                                    |
| --------------- | --------------------------------------------------------- |
| Peptides        | Slow rising luminescent particle stream (teal/cyan)       |
| Peptide Blends  | Two interweaving currents in contrasting hues, merging    |
| Bioregulators   | Soft concentric pulsing rings / ripple field (amber)      |
| Modulators      | Oscillating lissajous ribbon (violet)                     |
| Powders         | Drifting fine-grain particle dust (white/silver)          |

---

## Performance & accessibility

- **Target 60fps desktop.** The heavy post-processing pass (bloom + depth of
  field) is reserved for the large hero/detail scenes; gallery cards get their
  glow from emissive liquid + a CSS halo so many card canvases stay smooth.
- **Off-screen canvases pause** (`frameloop → 'demand'`) via `IntersectionObserver`.
- **Mobile degrades gracefully**: particle counts scale down and device pixel
  ratio is capped (`hooks/useEnv.js`).
- **`prefers-reduced-motion`** freezes all idle 3D animation and renders a static
  hero vial.
- **Fully responsive**; the gallery collapses to a single column on mobile.

---

## Compliance guardrails (built in, not optional)

- The **age + RUO gate blocks the entire experience** until the visitor confirms
  they are 21+, a qualified researcher, and acknowledges the research-use-only
  terms.
- Every product page and the footer carry: *"For laboratory research use only.
  Not for human or animal consumption."* plus the FDA non-evaluation disclaimer.
- No dosing, no usage instructions, and no health / performance / aesthetic
  benefit language anywhere.

---

## Theme (light / dark)

A theme toggle lives in the nav (sun/moon). The choice is persisted and applied
before first paint (a tiny inline script in `index.html`) to avoid a flash.
Colors are driven by CSS-variable-backed semantic tokens (`page`, `surface`,
`content`, `muted`, `line` — see `src/index.css` + `tailwind.config.js`), so
components style once and both themes follow. The 3D "display cases" (hero and
every product canvas) intentionally stay cinematic dark in **both** themes via
the `.stage-bg` utility, so the glowing glass vials always read.

## Extending the catalog

Add entries to the `seed` array in `src/data/products.js`. Each item needs an
`id`, `name`, `category` (one of the five above), a price (`price` or
`priceMin`/`priceMax`), and a `liquidColor`. Everything else (variants, spec
block, a neutral default description) is filled in automatically. Keep all copy
factual and research-framed.

> **Placeholder pricing:** the source catalog (ruo.bio) gates its listing and
> pricing behind account login, so the prices on the expanded SKUs are
> **placeholders**. The product names are real, public compound identifiers used
> for identification only. Replace the price ranges with the real figures once
> available.

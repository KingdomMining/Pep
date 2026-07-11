import { useState } from 'react';
import { motion } from 'framer-motion';
import VialScene from '../components/VialScene.jsx';
import {
  CategoryBadge,
  DisclaimerBlock,
  RuoPill,
} from '../components/Compliance.jsx';
import { getProduct, formatUSD, CATEGORY_BLURB } from '../data/products.js';
import { useStore } from '../store/useStore.js';
import { useReducedMotion, useQuality } from '../hooks/useEnv.js';

// ---------------------------------------------------------------------------
// <ProductDetail /> — large interactive vial (OrbitControls-lite) with its
// category ambient field, variant/size selector, research-oriented copy, a
// neutral spec block, a "View Lab Results" link, and add-to-cart. Compliance
// disclaimer is always present.
// ---------------------------------------------------------------------------

export default function ProductDetail({ productId }) {
  const product = getProduct(productId);
  const navigate = useStore((s) => s.navigate);
  const addItem = useStore((s) => s.addItem);
  const reducedMotion = useReducedMotion();
  const quality = useQuality();

  const [variantIdx, setVariantIdx] = useState(0);

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-40 text-center">
        <p className="text-slate-400">Product not found.</p>
        <button
          onClick={() => navigate('home')}
          className="mt-4 text-accent-teal hover:underline"
        >
          Back to catalog
        </button>
      </div>
    );
  }

  const variant = product.variants[variantIdx];

  return (
    <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8">
      {/* Breadcrumb */}
      <button
        type="button"
        onClick={() => navigate('home')}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-content"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path
            d="M19 12H5M11 18l-6-6 6-6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Back to catalog
      </button>

      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        {/* --- Interactive 3D vial ---------------------------------------- */}
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-0 -z-0 opacity-80"
            style={{
              background: `radial-gradient(ellipse at 50% 45%, ${product.liquidColor}26, transparent 60%)`,
            }}
          />
          <div className="stage-bg relative h-[420px] overflow-hidden rounded-2xl border border-line/10 sm:h-[540px]">
            <div className="absolute inset-0">
              <VialScene
                product={product}
                interactive
                reducedMotion={reducedMotion}
                quality={quality}
                big
              />
            </div>
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-slate-400 backdrop-blur">
              Drag to rotate · scroll to zoom
            </div>
          </div>
        </div>

        {/* --- Details ----------------------------------------------------- */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col"
        >
          <div className="flex items-center gap-3">
            <CategoryBadge category={product.category} />
            <RuoPill />
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tightish text-content sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {CATEGORY_BLURB[product.category]}
          </p>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-content">
              {formatUSD(variant.price)}
            </span>
            <span className="text-sm text-muted">
              {product.priceMin === product.priceMax
                ? 'per unit'
                : `range $${product.priceMin} – $${product.priceMax}`}
            </span>
          </div>

          <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted">
            {product.description}
          </p>

          {/* Variant / size selector */}
          <div className="mt-8">
            <h3 className="text-[11px] font-semibold uppercase tracking-wideish text-muted">
              Size
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.variants.map((v, i) => (
                <button
                  key={v.size}
                  type="button"
                  onClick={() => setVariantIdx(i)}
                  className={
                    'rounded-xl border px-4 py-2.5 text-sm transition ' +
                    (i === variantIdx
                      ? 'border-accent-teal/60 bg-accent-teal/10 text-content'
                      : 'border-line/10 text-muted hover:border-line/25')
                  }
                >
                  <span className="font-medium">{v.size}</span>
                  <span className="ml-2 text-muted">
                    {formatUSD(v.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Add to cart */}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => addItem(product, variant)}
              className="flex-1 rounded-xl bg-content py-3.5 text-sm font-semibold text-page transition hover:bg-content/90"
            >
              Add to cart · {formatUSD(variant.price)}
            </button>
            <button
              type="button"
              onClick={() => navigate('lab')}
              className="rounded-xl border border-line/15 px-5 py-3.5 text-sm font-medium text-content transition hover:border-line/30"
            >
              View lab results
            </button>
          </div>

          {/* Spec block (neutral, laboratory-facing attributes only) */}
          <div className="mt-9 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line/10 bg-line/10 sm:grid-cols-3">
            <Spec label="Purity" value={product.spec.purity} />
            <Spec label="Form" value={product.spec.form} />
            <Spec label="Storage" value={product.spec.storage} />
          </div>

          <DisclaimerBlock className="mt-6" />
        </motion.div>
      </div>
    </section>
  );
}

function Spec({ label, value }) {
  return (
    <div className="bg-surface2 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wideish text-muted">
        {label}
      </p>
      <p className="mt-1.5 text-sm leading-snug text-content">{value}</p>
    </div>
  );
}

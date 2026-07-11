import { useState } from 'react';
import { motion } from 'framer-motion';
import VialScene from '../components/VialScene.jsx';
import Molecule2D from '../components/Molecule2D.jsx';
import CoaModal from '../components/CoaModal.jsx';
import SdsModal from '../components/SdsModal.jsx';
import { CategoryBadge, DisclaimerBlock, RuoPill } from '../components/Compliance.jsx';
import {
  getProduct,
  formatUSD,
  formatPriceRange,
  CATEGORY_BLURB,
  relatedProducts,
} from '../data/products.js';
import { buildSds, sdsToText, downloadText } from '../data/reports.js';
import { useStore } from '../store/useStore.js';
import { useReducedMotion, useQuality } from '../hooks/useEnv.js';

// ---------------------------------------------------------------------------
// <ProductDetail /> — interactive vial + purchase panel, then reference-style
// sections: Certificate of Analysis (view/historical/download), SDS
// (view/download), Properties, illustrative 2D structure, and Related products.
// ---------------------------------------------------------------------------

export default function ProductDetail({ productId }) {
  const product = getProduct(productId);
  const navigate = useStore((s) => s.navigate);
  const addItem = useStore((s) => s.addItem);
  const reducedMotion = useReducedMotion();
  const quality = useQuality();

  const [variantIdx, setVariantIdx] = useState(0);
  const [coaOpen, setCoaOpen] = useState(false);
  const [sdsOpen, setSdsOpen] = useState(false);

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-40 text-center">
        <p className="text-muted">Product not found.</p>
        <button onClick={() => navigate('home')} className="mt-4 text-accent-teal hover:underline">
          Back to catalog
        </button>
      </div>
    );
  }

  const variant = product.variants[variantIdx];
  const related = relatedProducts(product);

  const downloadSds = () =>
    downloadText(`SDS_${product.name.replace(/\W+/g, '_')}.txt`, sdsToText(buildSds(product)));

  return (
    <section className="relative mx-auto max-w-7xl px-5 pb-24 pt-28 sm:px-8">
      <button
        type="button"
        onClick={() => navigate('home')}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-content"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to catalog
      </button>

      {/* --- Top: vial + purchase ------------------------------------------ */}
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div className="relative">
          <div
            className="pointer-events-none absolute inset-0 -z-0 opacity-80"
            style={{ background: `radial-gradient(ellipse at 50% 45%, ${product.liquidColor}26, transparent 60%)` }}
          />
          <div className="stage-bg relative h-[420px] overflow-hidden rounded-2xl border border-line/10 sm:h-[540px]">
            <div className="absolute inset-0">
              <VialScene product={product} interactive reducedMotion={reducedMotion} quality={quality} big />
            </div>
            <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/30 px-3 py-1 text-[11px] text-slate-300 backdrop-blur">
              Drag to rotate · scroll to zoom
            </div>
          </div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="flex flex-col">
          <div className="flex items-center gap-3">
            <CategoryBadge category={product.category} />
            <RuoPill />
          </div>

          <h1 className="mt-4 text-3xl font-semibold tracking-tightish text-content sm:text-4xl">{product.name}</h1>
          <p className="mt-2 text-sm text-muted">{CATEGORY_BLURB[product.category]}</p>

          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-2xl font-semibold text-content">{formatUSD(variant.price)}</span>
            <span className="text-sm text-muted">
              {product.priceMin === product.priceMax ? 'per unit' : `range ${formatPriceRange(product)}`}
            </span>
          </div>

          <p className="mt-6 max-w-prose text-sm leading-relaxed text-muted">{product.description}</p>

          {/* Size selector */}
          <div className="mt-8">
            <h3 className="text-[11px] font-semibold uppercase tracking-wideish text-muted">Size</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.variants.map((v, i) => (
                <button
                  key={v.size}
                  type="button"
                  onClick={() => setVariantIdx(i)}
                  className={
                    'rounded-xl border px-4 py-2.5 text-sm transition ' +
                    (i === variantIdx ? 'border-accent-teal/60 bg-accent-teal/10 text-content' : 'border-line/10 text-muted hover:border-line/25')
                  }
                >
                  <span className="font-medium">{v.size}</span>
                  <span className="ml-2 text-muted">{formatUSD(v.price)}</span>
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
              onClick={() => setCoaOpen(true)}
              className="rounded-xl border border-line/15 px-5 py-3.5 text-sm font-medium text-content transition hover:border-line/30"
            >
              View lab results
            </button>
          </div>

          {/* Quick document actions */}
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <DocLink onClick={() => setCoaOpen(true)} label="Certificate of Analysis" />
            <DocLink onClick={() => setSdsOpen(true)} label="View SDS" />
            <DocLink onClick={downloadSds} label="Download SDS" />
          </div>

          {/* Spec block */}
          <div className="mt-9 grid grid-cols-1 gap-px overflow-hidden rounded-xl border border-line/10 bg-line/10 sm:grid-cols-3">
            <Spec label="Purity" value={product.spec.purity} />
            <Spec label="Form" value={product.spec.form} />
            <Spec label="Storage" value={product.spec.storage} />
          </div>

          <DisclaimerBlock className="mt-6" />
        </motion.div>
      </div>

      {/* --- Verification + SDS ------------------------------------------- */}
      <div className="mt-16 grid gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle eyebrow="Verification" title="Certificate of Analysis" />
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Third-party tested per lot: chromatographic purity (HPLC-UV/VIS), quantity, endotoxins (LAL), and
            sterility (USP&nbsp;&lt;71&gt;). Historical and full reports are available.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => setCoaOpen(true)} className="rounded-lg bg-content px-4 py-2.5 text-sm font-medium text-page transition hover:bg-content/90">
              View full report
            </button>
            <button onClick={() => setCoaOpen(true)} className="rounded-lg border border-line/15 px-4 py-2.5 text-sm text-content transition hover:border-line/30">
              Historical reports
            </button>
          </div>
        </Card>

        <Card>
          <SectionTitle eyebrow="Safety" title="Safety Data Sheet" />
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Identification, handling, storage, and disposal information for laboratory use.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button onClick={() => setSdsOpen(true)} className="rounded-lg bg-content px-4 py-2.5 text-sm font-medium text-page transition hover:bg-content/90">
              View SDS
            </button>
            <button onClick={downloadSds} className="rounded-lg border border-line/15 px-4 py-2.5 text-sm text-content transition hover:border-line/30">
              Download SDS
            </button>
          </div>
        </Card>
      </div>

      {/* --- Properties + Structure --------------------------------------- */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card>
          <SectionTitle eyebrow="Reference" title="Properties" />
          <dl className="mt-4 divide-y divide-line/10 text-sm">
            <Prop k="CAS Number" v={product.props.cas} />
            <Prop k="Molecular Formula" v={product.props.formula} />
            <Prop k="Molar Mass" v={product.props.molarMass} />
            <Prop k="Sequence" v={product.props.sequence} />
            <Prop k="Appearance" v={product.props.appearance} />
            <Prop k="Solubility" v={product.props.solubility} />
            <Prop k="Purity" v={product.props.purity} />
            <Prop k="Storage" v={product.props.storage} />
          </dl>
        </Card>

        <Card>
          <SectionTitle eyebrow="Reference" title="2D Structure" />
          <div className="mt-4 rounded-xl border border-line/10 bg-content/[0.02] p-4">
            <Molecule2D product={product} />
          </div>
        </Card>
      </div>

      {/* --- Related products --------------------------------------------- */}
      {related.length > 0 && (
        <div className="mt-16">
          <h2 className="text-xl font-semibold text-content">Related products</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {related.map((r) => (
              <RelatedCard key={r.id} product={r} onOpen={() => navigate('product', r.id)} />
            ))}
          </div>
        </div>
      )}

      {coaOpen && <CoaModal product={product} size={variant.size} onClose={() => setCoaOpen(false)} />}
      {sdsOpen && <SdsModal product={product} onClose={() => setSdsOpen(false)} />}
    </section>
  );
}

function DocLink({ onClick, label }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 text-accent-teal transition hover:text-content">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
        <path d="M14 3v5h5M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V8l-6-5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
      {label}
    </button>
  );
}

function Card({ children }) {
  return <div className="rounded-2xl border border-line/10 bg-surface p-6">{children}</div>;
}

function SectionTitle({ eyebrow, title }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wideish text-accent-teal">{eyebrow}</p>
      <h3 className="mt-1 text-lg font-semibold text-content">{title}</h3>
    </div>
  );
}

function Prop({ k, v }) {
  return (
    <div className="flex items-start justify-between gap-6 py-2.5">
      <dt className="shrink-0 text-muted">{k}</dt>
      <dd className="text-right font-medium text-content">{v}</dd>
    </div>
  );
}

function Spec({ label, value }) {
  return (
    <div className="bg-surface2 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wideish text-muted">{label}</p>
      <p className="mt-1.5 text-sm leading-snug text-content">{value}</p>
    </div>
  );
}

function RelatedCard({ product, onOpen }) {
  return (
    <button
      onClick={onOpen}
      className="group flex flex-col overflow-hidden rounded-xl border border-line/10 bg-surface text-left transition hover:border-line/25"
    >
      <div
        className="stage-bg relative grid h-32 place-items-center"
        style={{ backgroundImage: `radial-gradient(ellipse at 50% 45%, ${product.liquidColor}22, transparent 65%)` }}
      >
        <div className="h-16 w-9 rounded-b-[10px] rounded-t-md border border-white/20 bg-white/10 shadow-inner" style={{ boxShadow: `inset 0 -18px 18px -10px ${product.liquidColor}` }} />
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-content">{product.name}</p>
        <p className="mt-0.5 text-xs text-muted">{formatPriceRange(product)}</p>
      </div>
    </button>
  );
}

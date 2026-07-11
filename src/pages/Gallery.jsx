import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard.jsx';
import { products, popularProducts, CATEGORIES } from '../data/products.js';

// ---------------------------------------------------------------------------
// <Gallery /> — a "Popular" tab (a handful of featured compounds) plus one tab
// per research category. Collapses to a single column on mobile.
// ---------------------------------------------------------------------------

export default function Gallery() {
  const [tab, setTab] = useState('Popular');

  const tabs = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return ['Popular', ...CATEGORIES.filter((c) => present.has(c))];
  }, []);

  const visible = useMemo(
    () => (tab === 'Popular' ? popularProducts : products.filter((p) => p.category === tab)),
    [tab]
  );

  return (
    <section id="gallery" className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
      >
        <p className="text-[11px] font-semibold uppercase tracking-wideish text-accent-teal">The catalog</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tightish text-content sm:text-4xl">
          Reference compounds
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
          Each vial is rendered live. Hover to spin it up; select one to inspect specifications,
          properties, and third-party verification.
        </p>
      </motion.div>

      {/* Tabs: Popular + one per category */}
      <div className="thin-scroll mt-8 flex gap-2 overflow-x-auto pb-2">
        {tabs.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={
              'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ' +
              (tab === t
                ? 'border-content/30 bg-content/10 text-content'
                : 'border-line/10 text-muted hover:border-line/25 hover:text-content')
            }
          >
            {t}
            {t === 'Popular' && <span className="ml-1.5 text-accent-teal">★</span>}
          </button>
        ))}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}

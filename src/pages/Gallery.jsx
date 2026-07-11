import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard.jsx';
import { products, CATEGORIES } from '../data/products.js';

// ---------------------------------------------------------------------------
// <Gallery /> — responsive grid of 3D vial cards with a category filter.
// Collapses to a single column on mobile.
// ---------------------------------------------------------------------------

export default function Gallery() {
  const [filter, setFilter] = useState('All');

  // Only show category chips that actually have products in the catalog.
  const activeCategories = useMemo(() => {
    const present = new Set(products.map((p) => p.category));
    return ['All', ...CATEGORIES.filter((c) => present.has(c))];
  }, []);

  const visible = useMemo(
    () =>
      filter === 'All'
        ? products
        : products.filter((p) => p.category === filter),
    [filter]
  );

  return (
    <section
      id="gallery"
      className="relative mx-auto max-w-7xl scroll-mt-24 px-5 py-24 sm:px-8"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-wideish text-accent-teal">
            The catalog
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tightish text-content sm:text-4xl">
            Reference compounds
          </h2>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Each vial is rendered live. Hover to spin it up; select one to
            inspect specifications and analytical verification.
          </p>
        </motion.div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2">
          {activeCategories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setFilter(c)}
              className={
                'rounded-full border px-3.5 py-1.5 text-xs font-medium transition ' +
                (filter === c
                  ? 'border-line/30 bg-content/10 text-content'
                  : 'border-line/10 text-muted hover:border-line/20 hover:text-content')
              }
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((product, i) => (
          <ProductCard key={product.id} product={product} index={i} />
        ))}
      </div>
    </section>
  );
}

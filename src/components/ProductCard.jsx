import { useState } from 'react';
import { motion } from 'framer-motion';
import VialScene from './VialScene.jsx';
import { CategoryBadge } from './Compliance.jsx';
import { formatPriceRange } from '../data/products.js';
import { useStore } from '../store/useStore.js';
import { useInView, useReducedMotion, useQuality } from '../hooks/useEnv.js';

// ---------------------------------------------------------------------------
// <ProductCard /> — a gallery card with its own mini 3D canvas. The canvas is
// paused (frameloop → demand) while off-screen via IntersectionObserver, and
// hover state is lifted from the HTML card into the scene so the vial spins up
// and bloom intensifies on hover/focus.
// ---------------------------------------------------------------------------

export default function ProductCard({ product, index = 0 }) {
  const [hovered, setHovered] = useState(false);
  const [ref, inView] = useInView({ rootMargin: '200px' });
  const reducedMotion = useReducedMotion();
  const quality = useQuality();
  const navigate = useStore((s) => s.navigate);

  const open = () => navigate('product', product.id);

  return (
    <motion.article
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.6, delay: (index % 3) * 0.08 }}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] transition-colors duration-300 hover:border-white/20"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {/* --- 3D vial stage ------------------------------------------------ */}
      <button
        type="button"
        onClick={open}
        aria-label={`View ${product.name}`}
        className="relative block h-72 w-full cursor-pointer outline-none"
      >
        {/* Category-tinted radial glow behind the canvas */}
        <div
          className="pointer-events-none absolute inset-0 opacity-70 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `radial-gradient(ellipse at 50% 45%, ${product.liquidColor}22, transparent 65%)`,
          }}
        />
        {/* Only mount the (heavier) canvas once near the viewport. The wrapper
            carries a definite size so the Canvas measures correctly. */}
        <div className="absolute inset-0">
          <VialScene
            product={product}
            hovered={hovered}
            reducedMotion={reducedMotion}
            quality={quality}
            paused={!inView}
          />
        </div>
      </button>

      {/* --- Meta --------------------------------------------------------- */}
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <CategoryBadge category={product.category} />
          <span className="text-sm font-medium text-slate-300">
            {formatPriceRange(product)}
          </span>
        </div>

        <h3 className="text-lg font-semibold tracking-tightish text-white">
          {product.name}
        </h3>

        <button
          type="button"
          onClick={open}
          className="mt-auto inline-flex items-center gap-1.5 self-start rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-accent-teal/50 hover:bg-accent-teal/10 hover:text-white"
        >
          View
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </motion.article>
  );
}

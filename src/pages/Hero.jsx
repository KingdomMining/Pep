import { motion } from 'framer-motion';
import VialScene from '../components/VialScene.jsx';
import { RuoPill } from '../components/Compliance.jsx';
import { products } from '../data/products.js';
import { useReducedMotion, useQuality, useInView } from '../hooks/useEnv.js';
import { useStore } from '../store/useStore.js';

// ---------------------------------------------------------------------------
// <Hero /> — one signature vial, front-and-center in a dark, gallery-like
// scene with volumetric-feeling light + bloom. Tagline + scroll cue.
// ---------------------------------------------------------------------------

const HERO_PRODUCT = products[0]; // 3-RUO, teal signature vial

export default function Hero() {
  const reducedMotion = useReducedMotion();
  const quality = useQuality();
  const navigate = useStore((s) => s.navigate);
  // Pause the (heavy) hero canvas once it scrolls out of view.
  const [sectionRef, inView] = useInView({ rootMargin: '0px', threshold: 0.05 });

  const scrollToGallery = () => {
    const el = document.getElementById('gallery');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section
      ref={sectionRef}
      className="stage-bg relative flex min-h-[100svh] items-center justify-center overflow-hidden"
    >
      {/* Signature vial fills the scene */}
      <div className="absolute inset-0">
        <VialScene
          product={HERO_PRODUCT}
          hovered={false}
          reducedMotion={reducedMotion}
          quality={quality}
          paused={!inView}
          vialOffsetY={-0.18}
          big
        />
      </div>

      {/* Vignette + gradient so the copy stays legible over the glow */}
      <div className="pointer-events-none absolute inset-0 radial-vignette" />
      {/* Localized center scrim so the headline/subcopy stay readable over the
          bright vial behind them. */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 46% 42% at 50% 52%, rgba(5,6,8,0.62), transparent 70%)',
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-900 to-transparent" />

      {/* Copy overlay */}
      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
        >
          <RuoPill />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-6 text-balance text-4xl font-semibold leading-[1.05] tracking-tightish text-white sm:text-6xl"
        >
          Premium, verified
          <span className="animate-shimmer block bg-gradient-to-r from-accent-teal via-white to-accent-blue bg-clip-text bg-[length:200%_auto] text-transparent">
            research material.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.32 }}
          className="mt-6 max-w-xl text-balance text-base leading-relaxed text-slate-400 sm:text-lg"
        >
          A curated catalog of reference compounds, each accompanied by
          third-party analytical verification. Supplied strictly for laboratory
          research.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.44 }}
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <button
            type="button"
            onClick={scrollToGallery}
            className="rounded-xl bg-white px-6 py-3.5 text-sm font-semibold text-ink-900 transition hover:bg-slate-200"
          >
            Explore the catalog
          </button>
          <button
            type="button"
            onClick={() => navigate('lab')}
            className="rounded-xl border border-white/15 px-6 py-3.5 text-sm font-medium text-slate-200 transition hover:border-white/30 hover:text-white"
          >
            View verification
          </button>
        </motion.div>

        {/* Quiet trust strip under the CTAs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="mt-12 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[11px] font-medium uppercase tracking-wideish text-slate-500"
        >
          <span>HPLC purity ≥ 98%</span>
          <span className="text-accent-teal/50">✦</span>
          <span>Third-party verified lots</span>
          <span className="text-accent-teal/50">✦</span>
          <span>Lot-specific COAs</span>
        </motion.div>
      </div>

      {/* Scroll cue */}
      <motion.button
        type="button"
        onClick={scrollToGallery}
        aria-label="Scroll to catalog"
        className="absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-slate-500 transition hover:text-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        <motion.span
          className="flex flex-col items-center gap-2"
          animate={reducedMotion ? {} : { y: [0, 8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        >
          <span className="text-[10px] uppercase tracking-wideish">Scroll</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 5v14M6 13l6 6 6-6"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </motion.span>
      </motion.button>
    </section>
  );
}

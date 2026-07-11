import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore.js';

// ---------------------------------------------------------------------------
// <FlashBanner /> — dismissible promo strip at the very top (styled after the
// reference). Sits above the nav; dismiss state lives in the store.
// ---------------------------------------------------------------------------

export default function FlashBanner() {
  const dismissed = useStore((s) => s.flashDismissed);
  const dismiss = useStore((s) => s.dismissFlash);
  const navigate = useStore((s) => s.navigate);

  return (
    <AnimatePresence initial={false}>
      {!dismissed && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="relative z-[60] overflow-hidden bg-gradient-to-r from-[#c2172c] via-[#8f1f7a] to-[#5b2bd6] text-white"
        >
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-10 py-2.5 text-center text-[13px] font-medium sm:text-sm">
            <span aria-hidden="true">🔥</span>
            <button
              onClick={() => navigate('home')}
              className="hover:underline"
            >
              Flash Sale: Buy 2 Get 1 FREE on Retatrutide (10&nbsp;mg only) +
              Bacteriostatic Water
            </button>
            <span aria-hidden="true">🎉</span>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss announcement"
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

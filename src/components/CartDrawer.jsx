import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore.js';
import { formatUSD } from '../data/products.js';
import { RUO_LINE } from './Compliance.jsx';

// ---------------------------------------------------------------------------
// <CartDrawer /> — slide-in cart with quantity controls, subtotal, and a
// placeholder checkout (no backend in v1).
// ---------------------------------------------------------------------------

export default function CartDrawer() {
  const open = useStore((s) => s.cartOpen);
  const close = useStore((s) => s.closeCart);
  const items = useStore((s) => s.items);
  const setQty = useStore((s) => s.setQty);
  const removeItem = useStore((s) => s.removeItem);
  const subtotal = useStore((s) => s.subtotal());

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
          <motion.aside
            className="fixed right-0 top-0 z-[90] flex h-full w-full max-w-md flex-col border-l border-white/10 bg-ink-800/95 backdrop-blur-xl"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 320, damping: 34 }}
            role="dialog"
            aria-label="Shopping cart"
          >
            <header className="flex items-center justify-between border-b border-white/10 px-6 py-5">
              <h2 className="text-base font-semibold uppercase tracking-wideish text-white">
                Cart
              </h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close cart"
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </header>

            <div className="thin-scroll flex-1 overflow-y-auto px-6 py-4">
              {items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
                  <div className="mb-3 rounded-full border border-white/10 p-4">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M6 6h15l-1.5 9h-12L6 6zM6 6L5 3H2m4 15a1 1 0 100 2 1 1 0 000-2zm11 0a1 1 0 100 2 1 1 0 000-2z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <p className="text-sm">Your cart is empty.</p>
                </div>
              ) : (
                <ul className="space-y-3">
                  {items.map((item) => (
                    <li
                      key={item.key}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-white">
                            {item.name}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.size} · {formatUSD(item.price)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.key)}
                          aria-label={`Remove ${item.name}`}
                          className="text-slate-500 transition hover:text-red-400"
                        >
                          <svg
                            width="16"
                            height="16"
                            viewBox="0 0 24 24"
                            fill="none"
                          >
                            <path
                              d="M6 6l12 12M18 6L6 18"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>

                      <div className="mt-3 flex items-center justify-between">
                        <div className="inline-flex items-center rounded-lg border border-white/10">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQty(item.key, item.qty - 1)}
                            className="px-3 py-1.5 text-slate-300 transition hover:text-white"
                          >
                            −
                          </button>
                          <span className="min-w-[2rem] text-center text-sm text-white">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQty(item.key, item.qty + 1)}
                            className="px-3 py-1.5 text-slate-300 transition hover:text-white"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-medium text-white">
                          {formatUSD(item.price * item.qty)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="border-t border-white/10 px-6 py-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">Subtotal</span>
                <span className="text-lg font-semibold text-white">
                  {formatUSD(subtotal)}
                </span>
              </div>
              <button
                type="button"
                disabled={items.length === 0}
                onClick={() =>
                  alert(
                    'Checkout is a placeholder in this demo. No order will be processed.'
                  )
                }
                className="mt-4 w-full rounded-xl bg-white py-3.5 text-sm font-semibold text-ink-900 transition enabled:hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-slate-500"
              >
                Checkout
              </button>
              <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-500">
                {RUO_LINE}
              </p>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

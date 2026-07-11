import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildSds, sdsToText, downloadText } from '../data/reports.js';

// ---------------------------------------------------------------------------
// <SdsModal /> — view / download a placeholder Safety Data Sheet for a product.
// ---------------------------------------------------------------------------

export default function SdsModal({ product, onClose }) {
  const sds = useMemo(() => buildSds(product), [product]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto p-4 py-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Safety Data Sheet"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          initial={{ scale: 0.96, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
          className="relative z-10 w-full max-w-2xl"
        >
          <div className="mb-3 flex items-center justify-end gap-2">
            <button
              onClick={() => downloadText(`SDS_${product.name.replace(/\W+/g, '_')}.txt`, sdsToText(sds))}
              className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink-900 transition hover:bg-slate-200"
            >
              Download SDS
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg border border-white/15 bg-black/40 p-2 text-white/80 backdrop-blur transition hover:text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="overflow-hidden rounded-xl bg-white text-[#1a1c22] shadow-2xl ring-1 ring-black/10">
            <div className="border-b border-black/10 bg-[#f6f7f9] px-6 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-[#6b7280]">Safety Data Sheet</p>
              <p className="text-lg font-semibold">{sds.product}</p>
              <p className="text-xs text-[#6b7280]">Revision {sds.revision}</p>
            </div>
            <div className="space-y-4 px-6 py-6 sm:px-8">
              {sds.sections.map(([title, items]) => (
                <div key={title}>
                  <p className="text-sm font-semibold">{title}</p>
                  <ul className="mt-1 space-y-1 text-sm text-[#4b5563]">
                    {items.map((it, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-[#9ca3af]" />
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="rounded-md bg-[#f6f7f9] px-3 py-2 text-center text-[11px] font-medium text-[#6b7280]">
                For laboratory research use only. Not for human or animal consumption.
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

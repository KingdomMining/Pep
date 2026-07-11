import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { buildCoa, coaHistory, coaToText, downloadText } from '../data/reports.js';

// ---------------------------------------------------------------------------
// <CoaModal /> — the "tested sheet". Renders a Certificate of Analysis styled
// after the Vanguard Laboratory sample (always on a white document surface so
// it reads like a printed report in either theme). Includes a Full-report view
// and a Historical-lots view, plus a text download.
// ---------------------------------------------------------------------------

export default function CoaModal({ product, size, onClose }) {
  const [tab, setTab] = useState('full'); // 'full' | 'history'
  const [activeSize, setActiveSize] = useState(size || product.variants[0].size);
  const coa = useMemo(() => buildCoa(product, activeSize), [product, activeSize]);
  const history = useMemo(() => coaHistory(product), [product]);

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[95] flex items-start justify-center overflow-y-auto p-4 py-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        role="dialog"
        aria-modal="true"
        aria-label="Certificate of Analysis"
      >
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.96, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 240, damping: 26 }}
          className="relative z-10 w-full max-w-2xl"
        >
          {/* Toolbar */}
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="inline-flex rounded-lg border border-white/15 bg-black/40 p-1 text-sm backdrop-blur">
              {[
                ['full', 'Full report'],
                ['history', 'Historical'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={
                    'rounded-md px-3 py-1.5 transition ' +
                    (tab === id ? 'bg-white text-ink-900' : 'text-white/80 hover:text-white')
                  }
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadText(`COA_${product.name.replace(/\W+/g, '_')}_${coa.lot}.txt`, coaToText(coa))}
                className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-ink-900 transition hover:bg-slate-200"
              >
                Download
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
          </div>

          {/* The document (always white paper) */}
          <div className="overflow-hidden rounded-xl bg-white text-[#1a1c22] shadow-2xl ring-1 ring-black/10">
            {/* Variant selector for which lot/size to view */}
            <div className="flex flex-wrap items-center gap-2 border-b border-black/10 bg-[#f6f7f9] px-6 py-3 text-xs">
              <span className="font-medium text-[#6b7280]">Size / lot:</span>
              {product.variants.map((v) => (
                <button
                  key={v.size}
                  onClick={() => setActiveSize(v.size)}
                  className={
                    'rounded-md border px-2.5 py-1 transition ' +
                    (activeSize === v.size
                      ? 'border-[#0f766e] bg-[#0f766e]/10 text-[#0f766e]'
                      : 'border-black/15 text-[#374151] hover:border-black/30')
                  }
                >
                  {v.size}
                </button>
              ))}
            </div>

            {tab === 'full' ? (
              <CoaDocument coa={coa} />
            ) : (
              <HistoryDocument product={product} history={history} onOpen={(s) => { setActiveSize(s); setTab('full'); }} />
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function CoaDocument({ coa }) {
  const L = coa.lab;
  return (
    <div className="px-6 py-6 sm:px-8">
      {/* Lab header */}
      <div className="flex items-start justify-between gap-4 border-b border-black/10 pb-4">
        <div>
          <p className="text-lg font-semibold tracking-tight">{L.name}</p>
          <p className="mt-0.5 text-xs text-[#6b7280]">{L.addr}</p>
          <p className="text-xs text-[#6b7280]">{L.phone}</p>
        </div>
        <div className="text-right text-xs text-[#6b7280]">
          <p className="font-semibold text-[#374151]">Date Reported</p>
          <p>{coa.dateReported}</p>
        </div>
      </div>

      {/* Meta grid */}
      <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
        <Meta k="Report To" v={coa.reportTo} />
        <Meta k="Compound" v={coa.compound} />
        <Meta k="Quantity" v={coa.quantity} />
        <Meta k="Laboratory ID" v={coa.labId} />
        <Meta k="Lot Number" v={coa.lot} />
      </div>

      <h3 className="mt-6 text-center text-base font-semibold">{coa.title}</h3>

      {/* Results table */}
      <div className="mt-4 overflow-hidden rounded-lg border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f6f7f9] text-xs uppercase tracking-wide text-[#6b7280]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Analysis</th>
              <th className="px-4 py-2.5 font-semibold">Method</th>
              <th className="px-4 py-2.5 font-semibold">Result</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {coa.rows.map((r) => (
              <tr key={r.analysis}>
                <td className="px-4 py-2.5">{r.analysis}</td>
                <td className="px-4 py-2.5 text-[#4b5563]">{r.method}</td>
                <td className="px-4 py-2.5 font-medium text-[#0f766e]">{r.result}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-[#6b7280]">{coa.footnote}</p>
      <p className="mt-3 text-[11px] leading-relaxed text-[#6b7280]">{coa.disclaimer}</p>

      <div className="mt-5 grid grid-cols-1 gap-2 border-t border-black/10 pt-4 text-xs text-[#4b5563] sm:grid-cols-2">
        <p><span className="font-semibold">Reported By:</span> {L.reportBy}</p>
        <p><span className="font-semibold">Approved By:</span> {L.approvedBy}</p>
        <p className="text-[#6b7280]">{L.web}</p>
        <p className="text-[#6b7280] sm:text-right">{L.email}</p>
      </div>
      <p className="mt-4 rounded-md bg-[#f6f7f9] px-3 py-2 text-center text-[11px] font-medium text-[#6b7280]">
        For laboratory research use only. Not for human or animal consumption.
      </p>
    </div>
  );
}

function HistoryDocument({ product, history, onOpen }) {
  return (
    <div className="px-6 py-6 sm:px-8">
      <p className="text-base font-semibold">{product.name} — historical lot reports</p>
      <p className="mt-1 text-xs text-[#6b7280]">
        Prior production lots with third-party analysis on file. Open any lot to view its full report.
      </p>
      <div className="mt-4 overflow-hidden rounded-lg border border-black/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-[#f6f7f9] text-xs uppercase tracking-wide text-[#6b7280]">
            <tr>
              <th className="px-4 py-2.5 font-semibold">Lot</th>
              <th className="px-4 py-2.5 font-semibold">Size</th>
              <th className="px-4 py-2.5 font-semibold">Date</th>
              <th className="px-4 py-2.5 font-semibold">Purity</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.06]">
            {history.map((h) => (
              <tr key={h.lot}>
                <td className="px-4 py-2.5 font-medium">{h.lot}</td>
                <td className="px-4 py-2.5 text-[#4b5563]">{h.size}</td>
                <td className="px-4 py-2.5 text-[#4b5563]">{h.date}</td>
                <td className="px-4 py-2.5 text-[#0f766e]">&gt; {h.purity}%</td>
                <td className="px-4 py-2.5 text-right">
                  <button onClick={() => onOpen(h.size)} className="text-[#0f766e] hover:underline">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Meta({ k, v }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-[#9ca3af]">{k}</p>
      <p className="font-medium">{v}</p>
    </div>
  );
}

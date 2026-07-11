import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../store/useStore.js';
import { AGE_LINE, RUO_LINE, FDA_LINE } from './Compliance.jsx';

// ---------------------------------------------------------------------------
// <AgeGate /> — blocking modal shown on first load. The entire experience is
// blocked until the visitor confirms they are 21+, a qualified researcher, and
// acknowledges the research-use-only terms. Acceptance is stored in state
// (persisted), so a returning verified researcher is not re-prompted.
// ---------------------------------------------------------------------------

const CONFIRMATIONS = [
  'I am at least 21 years of age and a qualified researcher.',
  'I understand these products are for laboratory research use only and are not for human or animal consumption.',
  'I understand these products are not intended to diagnose, treat, cure, or prevent any disease.',
];

export default function AgeGate() {
  const ageAccepted = useStore((s) => s.ageAccepted);
  const acceptAge = useStore((s) => s.acceptAge);
  const [checked, setChecked] = useState(() => CONFIRMATIONS.map(() => false));

  const allChecked = checked.every(Boolean);

  const toggle = (i) =>
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <AnimatePresence>
      {!ageAccepted && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="age-gate-title"
        >
          {/* Opaque backdrop so no content is visible behind the gate. */}
          <div className="absolute inset-0 bg-page/95 backdrop-blur-xl" />

          <motion.div
            className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border border-line/10 bg-surface/90 shadow-2xl"
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          >
            {/* Accent glow bar */}
            <div className="h-1 w-full bg-gradient-to-r from-accent-teal via-accent-blue to-accent-violet" />

            <div className="p-7 sm:p-9">
              <p className="text-[11px] font-semibold uppercase tracking-wideish text-accent-teal">
                Verification required
              </p>
              <h1
                id="age-gate-title"
                className="mt-2 text-2xl font-semibold text-content sm:text-3xl"
              >
                {AGE_LINE}
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                Access to AEGIS Research is restricted to verified researchers.
                Please confirm the following before entering.
              </p>

              <div className="mt-6 space-y-3">
                {CONFIRMATIONS.map((label, i) => (
                  <label
                    key={i}
                    className="flex cursor-pointer items-start gap-3 rounded-xl border border-line/10 bg-content/[0.02] p-3.5 text-sm text-muted transition hover:border-line/20 hover:bg-content/[0.04]"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 shrink-0 accent-accent-teal"
                      checked={checked[i]}
                      onChange={() => toggle(i)}
                    />
                    <span className="leading-snug">{label}</span>
                  </label>
                ))}
              </div>

              <button
                type="button"
                disabled={!allChecked}
                onClick={acceptAge}
                className="mt-7 w-full rounded-xl bg-content py-3.5 text-sm font-semibold text-page transition enabled:hover:bg-content/90 disabled:cursor-not-allowed disabled:bg-content/10 disabled:text-muted"
              >
                {allChecked ? 'Enter site' : 'Confirm all statements to continue'}
              </button>

              <div className="mt-5 space-y-1.5 border-t border-line/5 pt-4 text-[11px] leading-relaxed text-muted">
                <p>{RUO_LINE}</p>
                <p>{FDA_LINE}</p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

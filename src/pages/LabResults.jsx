import { motion } from 'framer-motion';
import { DisclaimerBlock, RuoPill } from '../components/Compliance.jsx';
import { useStore } from '../store/useStore.js';

// ---------------------------------------------------------------------------
// <LabResults /> — static verification page emphasizing third-party testing.
// Copy is factual and process-oriented; no product claims.
// ---------------------------------------------------------------------------

const PANELS = [
  {
    title: 'Identity',
    body: 'Mass spectrometry confirms the molecular identity of each lot against its reference specification.',
    icon: 'M12 3l8 4v6c0 4-3.5 7-8 8-4.5-1-8-4-8-8V7l8-4z',
  },
  {
    title: 'Content',
    body: 'Quantitative HPLC establishes net peptide content per vial for each production lot.',
    icon: 'M4 19V5m4 14V9m4 10V7m4 12v-8m4 8V4',
  },
  {
    title: 'Purity',
    body: 'Reverse-phase HPLC characterizes chromatographic purity, reported as an area percentage.',
    icon: 'M3 12a9 9 0 1018 0 9 9 0 00-18 0zm9-9v18',
  },
  {
    title: 'Sterility',
    body: 'Lyophilized material is assessed for microbial contamination under controlled conditions.',
    icon: 'M12 2v6m0 0a4 4 0 014 4v8H8v-8a4 4 0 014-4z',
  },
  {
    title: 'Endotoxins',
    body: 'Bacterial endotoxin testing screens material against defined analytical thresholds.',
    icon: 'M12 3v18M3 12h18M6 6l12 12M18 6L6 18',
  },
  {
    title: 'Heavy metals',
    body: 'Elemental analysis screens for residual heavy-metal content within specification limits.',
    icon: 'M4 7h16M6 7l1 13h10l1-13M9 7V4h6v3',
  },
];

export default function LabResults() {
  const navigate = useStore((s) => s.navigate);

  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8">
      {/* Ambient glow header */}
      <div className="pointer-events-none absolute inset-x-0 top-20 -z-0 mx-auto h-72 max-w-3xl rounded-full bg-accent-teal/10 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative mx-auto max-w-2xl text-center"
      >
        <div className="flex justify-center">
          <RuoPill />
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tightish text-content sm:text-5xl">
          Third-party verification
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted">
          Every production lot is submitted to independent laboratories for
          analytical testing. Certificates of analysis are issued per lot and
          available on request for verified researchers.
        </p>
      </motion.div>

      <div className="relative mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PANELS.map((panel, i) => (
          <motion.div
            key={panel.title}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
            className="rounded-2xl border border-line/10 bg-gradient-to-b from-content/[0.04] to-transparent p-6"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl border border-line/10 bg-content/5 text-accent-teal">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <path
                  d={panel.icon}
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h3 className="mt-4 text-lg font-semibold text-content">
              {panel.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {panel.body}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Process strip */}
      <div className="relative mt-16 overflow-hidden rounded-2xl border border-line/10 bg-surface2/50 p-8 sm:p-10">
        <h2 className="text-xl font-semibold text-content">
          Chain of verification
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-4">
          {[
            ['01', 'Synthesis', 'Material produced to a defined reference specification.'],
            ['02', 'Sampling', 'Representative samples pulled from each production lot.'],
            ['03', 'Independent testing', 'Analysis performed by third-party laboratories.'],
            ['04', 'Certificate', 'Lot-specific certificate of analysis issued.'],
          ].map(([n, t, d]) => (
            <div key={n}>
              <span className="text-2xl font-semibold text-accent-teal/70">
                {n}
              </span>
              <h4 className="mt-2 text-sm font-semibold text-content">{t}</h4>
              <p className="mt-1.5 text-xs leading-relaxed text-muted">
                {d}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="relative mt-10 flex flex-col items-center gap-6">
        <DisclaimerBlock className="w-full max-w-2xl" />
        <button
          type="button"
          onClick={() => navigate('home')}
          className="rounded-xl border border-line/15 px-6 py-3 text-sm font-medium text-content transition hover:border-line/30 hover:text-content"
        >
          Back to catalog
        </button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// <TickerStrip /> — a slim, endlessly scrolling strip of verification facts
// between the hero and the gallery. Two identical runs of the items scroll
// left by exactly 50%, so the loop is seamless. The global reduced-motion CSS
// rule freezes the animation automatically.
// ---------------------------------------------------------------------------

const ITEMS = [
  'Third-party verified',
  'HPLC purity ≥ 98%',
  'Identity · mass spectrometry',
  'Sterility assessed',
  'Endotoxin screened',
  'Heavy-metal screened',
  'Lot-specific COAs',
  'Research use only',
];

export default function TickerStrip() {
  const fade = {
    maskImage:
      'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
    WebkitMaskImage:
      'linear-gradient(to right, transparent, black 10%, black 90%, transparent)',
  };

  return (
    <div
      className="relative overflow-hidden border-y border-line/5 bg-content/[0.015] py-3.5"
      style={fade}
      aria-hidden="true"
    >
      <div className="flex w-max animate-marquee">
        {[0, 1].map((run) => (
          <div key={run} className="flex shrink-0">
            {ITEMS.map((item) => (
              <span
                key={item}
                className="flex items-center text-[11px] font-medium uppercase tracking-wideish text-muted"
              >
                <span className="px-5">{item}</span>
                <span className="text-accent-teal/40">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

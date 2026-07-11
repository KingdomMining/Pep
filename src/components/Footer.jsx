import { useStore } from '../store/useStore.js';
import { RUO_LINE, FDA_LINE } from './Compliance.jsx';

// ---------------------------------------------------------------------------
// <Footer /> — carries the required RUO disclaimer, 21+ notice, the "not for
// human/animal consumption" line, the FDA non-evaluation statement, and a
// contact placeholder.
// ---------------------------------------------------------------------------

export default function Footer() {
  const navigate = useStore((s) => s.navigate);

  return (
    <footer className="relative border-t border-line/10 bg-surface2/60">
      <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent-teal to-accent-blue text-sm font-bold text-ink-900">
                Æ
              </span>
              <span className="text-sm font-semibold uppercase tracking-wideish text-content">
                AEGIS Research
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              Premium, third-party verified reference materials supplied
              exclusively for laboratory research.
            </p>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wideish text-muted">
              Explore
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li>
                <button
                  onClick={() => navigate('home')}
                  className="transition hover:text-content"
                >
                  Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('lab')}
                  className="transition hover:text-content"
                >
                  Lab results &amp; verification
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wideish text-muted">
              Contact
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm text-muted">
              <li>research@aegis.example</li>
              <li className="text-muted">Contact placeholder</li>
            </ul>
          </div>
        </div>

        {/* Required compliance block */}
        <div className="mt-12 space-y-2 border-t border-line/5 pt-8 text-xs leading-relaxed text-muted">
          <p className="font-medium text-muted">
            21+ only. {RUO_LINE}
          </p>
          <p>{FDA_LINE}</p>
          <p className="pt-2 text-muted">
            © {new Date().getFullYear()} AEGIS Research. All product names are
            used for identification purposes only. This is a design showcase
            demo; no orders are processed.
          </p>
        </div>
      </div>
    </footer>
  );
}

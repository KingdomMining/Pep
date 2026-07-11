import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore.js';

// ---------------------------------------------------------------------------
// <NavBar /> — fixed translucent top bar with brand, section links, and the
// cart button (with live item count).
// ---------------------------------------------------------------------------

export default function NavBar() {
  const navigate = useStore((s) => s.navigate);
  const openCart = useStore((s) => s.openCart);
  const count = useStore((s) => s.count());
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goHome = () => navigate('home');
  const goGallery = () => {
    navigate('home');
    // Defer so the home layout is mounted before we scroll to the gallery.
    requestAnimationFrame(() => {
      const el = document.getElementById('gallery');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  };

  return (
    <header
      className={
        'fixed inset-x-0 top-0 z-50 transition-all duration-300 ' +
        (scrolled
          ? 'border-b border-white/10 bg-ink-900/80 backdrop-blur-xl'
          : 'border-b border-transparent bg-transparent')
      }
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={goHome}
          className="flex items-center gap-2.5 text-left"
        >
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-accent-teal to-accent-blue text-sm font-bold text-ink-900">
            Æ
          </span>
          <span className="text-sm font-semibold uppercase tracking-wideish text-white">
            AEGIS<span className="text-slate-500"> Research</span>
          </span>
        </button>

        <div className="hidden items-center gap-7 text-sm text-slate-300 md:flex">
          <button onClick={goGallery} className="transition hover:text-white">
            Catalog
          </button>
          <button
            onClick={() => navigate('lab')}
            className="transition hover:text-white"
          >
            Verification
          </button>
        </div>

        <button
          type="button"
          onClick={openCart}
          className="relative inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:text-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path
              d="M6 6h15l-1.5 9h-12L6 6zM6 6L5 3H2m4 15a1 1 0 100 2 1 1 0 000-2zm11 0a1 1 0 100 2 1 1 0 000-2z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="hidden sm:inline">Cart</span>
          {count > 0 && (
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-[1.25rem] place-items-center rounded-full bg-accent-teal px-1 text-[11px] font-bold text-ink-900">
              {count}
            </span>
          )}
        </button>
      </nav>
    </header>
  );
}

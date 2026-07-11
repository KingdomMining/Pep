import { useEffect, useState } from 'react';
import { useStore } from '../store/useStore.js';

// ---------------------------------------------------------------------------
// <NavBar /> — fixed translucent top bar with brand, section links, a theme
// toggle, and the cart button (with live item count).
//
// The bar overlaps the cinematic dark hero at the top of the home page, so
// while it sits over the hero it uses light-on-dark styling regardless of the
// active theme; once it clears the hero (or on any other page) it switches to
// the theme's semantic tokens and gains a translucent page-colored background.
// ---------------------------------------------------------------------------

export default function NavBar() {
  const navigate = useStore((s) => s.navigate);
  const openCart = useStore((s) => s.openCart);
  const count = useStore((s) => s.count());
  const theme = useStore((s) => s.theme);
  const toggleTheme = useStore((s) => s.toggleTheme);
  const view = useStore((s) => s.view);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  // Over the dark hero (home page, before scrolling past it) → light-on-dark.
  const onDark = view === 'home' && scrollY < vh - 90;
  const solid = !onDark && scrollY > 24;

  const goHome = () => navigate('home');
  const goGallery = () => {
    navigate('home');
    requestAnimationFrame(() => {
      const el = document.getElementById('gallery');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });
  };

  // Style sets that flip depending on whether the bar is over the dark hero.
  const brand = onDark ? 'text-white' : 'text-content';
  const brandSub = onDark ? 'text-white/45' : 'text-muted';
  const link = onDark
    ? 'text-white/80 hover:text-white'
    : 'text-muted hover:text-content';
  const chip = onDark
    ? 'border-white/15 bg-white/10 text-white/90 hover:border-white/30'
    : 'border-line/10 bg-content/5 text-content hover:border-line/25';

  return (
    <header
      className={
        'fixed inset-x-0 top-0 z-50 transition-all duration-300 ' +
        (solid
          ? 'border-b border-line/10 bg-page/80 backdrop-blur-xl'
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
          <span
            className={
              'text-sm font-semibold uppercase tracking-wideish ' + brand
            }
          >
            AEGIS<span className={brandSub}> Research</span>
          </span>
        </button>

        <div className={'hidden items-center gap-7 text-sm md:flex ' + link}>
          <button onClick={goGallery} className="transition">
            Catalog
          </button>
          <button onClick={() => navigate('lab')} className="transition">
            Verification
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={
              theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
            }
            className={
              'grid h-9 w-9 place-items-center rounded-lg border transition ' + chip
            }
          >
            {theme === 'dark' ? (
              // Sun
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle
                  cx="12"
                  cy="12"
                  r="4.2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                />
                <path
                  d="M12 2v2.5M12 19.5V22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M2 12h2.5M19.5 12H22M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              // Moon
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 14.5A8 8 0 019.5 4 7 7 0 1020 14.5z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={openCart}
            className={
              'relative inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ' +
              chip
            }
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
        </div>
      </nav>
    </header>
  );
}

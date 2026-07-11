import { useEffect, useRef, useState } from 'react';
import FlashBanner from './FlashBanner.jsx';
import NavBar from './NavBar.jsx';

// ---------------------------------------------------------------------------
// <Header /> — fixed top stack (flash banner + nav) that MINIMIZES when
// scrolling down and EXPANDS when scrolling up (and is always shown near the
// top of the page).
// ---------------------------------------------------------------------------

export default function Header() {
  const [hidden, setHidden] = useState(false);
  const last = useRef(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      if (y < 90) setHidden(false); // always show near the top
      else if (y > last.current + 6) setHidden(true); // scrolling down → minimize
      else if (y < last.current - 6) setHidden(false); // scrolling up → expand
      last.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div
      className="fixed inset-x-0 top-0 z-50 transition-transform duration-300 ease-out"
      style={{ transform: hidden ? 'translateY(-100%)' : 'translateY(0)' }}
    >
      <FlashBanner />
      <NavBar />
    </div>
  );
}

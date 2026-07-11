import { useEffect, useRef, useState } from 'react';

/**
 * IntersectionObserver-based visibility. Used to pause off-screen 3D canvases
 * (frameloop → 'demand') so we only spend GPU on what's actually on screen.
 * Returns [ref, inView]; attach ref to the element to observe.
 */
export function useInView({ rootMargin = '120px', threshold = 0 } = {}) {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true); // no IO support → don't pause anything
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { rootMargin, threshold }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin, threshold]);

  return [ref, inView];
}

/**
 * Track prefers-reduced-motion. When true, all idle 3D animation is frozen and
 * the hero vial is rendered static (compliance with the reduced-motion brief).
 */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e) => setReduced(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

/**
 * Very small heuristic for the render budget. On coarse-pointer / narrow
 * viewports we drop particle counts and pixel ratio so mobile stays smooth.
 * Returns a stable object; recomputes on resize (debounced by rAF).
 */
export function useQuality() {
  const [quality, setQuality] = useState(() => computeQuality());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setQuality(computeQuality()));
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return quality;
}

function computeQuality() {
  if (typeof window === 'undefined') {
    return { isMobile: false, particleScale: 1, dpr: [1, 2] };
  }
  const coarse =
    window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 768;
  const isMobile = coarse || narrow;
  return {
    isMobile,
    // Scale factor applied to every particle/segment count.
    particleScale: isMobile ? 0.45 : 1,
    // Cap device pixel ratio harder on mobile to protect frame rate.
    dpr: isMobile ? [1, 1.5] : [1, 2],
  };
}

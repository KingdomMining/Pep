import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore.js';
import AgeGate from './components/AgeGate.jsx';
import NavBar from './components/NavBar.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import TickerStrip from './components/TickerStrip.jsx';
import Hero from './pages/Hero.jsx';
import Gallery from './pages/Gallery.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import LabResults from './pages/LabResults.jsx';

// ---------------------------------------------------------------------------
// <App /> — top-level shell. Renders the blocking age gate, the persistent
// nav/cart/footer chrome, and swaps the active view. Lightweight state-based
// routing (no router dependency) keeps this a true single-page app.
//
// The site content is only rendered once the age/RUO gate is accepted; before
// that, the gate covers the entire experience.
// ---------------------------------------------------------------------------

export default function App() {
  const ageAccepted = useStore((s) => s.ageAccepted);
  const view = useStore((s) => s.view);
  const activeProductId = useStore((s) => s.activeProductId);

  return (
    <div className="relative min-h-screen bg-page">
      <AgeGate />

      {/* Only mount the experience after acceptance so nothing (including the
          heavy 3D canvases) runs behind the blocking gate. */}
      {ageAccepted && (
        <>
          {/* Ambient color-wash backdrop: two huge, ultra-soft glow blobs that
              sit behind every page and give the dark canvas gentle depth. */}
          <div
            className="pointer-events-none fixed inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div className="absolute -left-40 -top-44 h-[38rem] w-[38rem] rounded-full bg-accent-teal/[0.05] blur-[120px]" />
            <div className="absolute -bottom-52 -right-44 h-[42rem] w-[42rem] rounded-full bg-accent-violet/[0.05] blur-[130px]" />
          </div>

          <NavBar />
          <CartDrawer />

          <main className="relative z-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={view + (activeProductId || '')}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                {view === 'home' && (
                  <>
                    <Hero />
                    <TickerStrip />
                    <Gallery />
                  </>
                )}
                {view === 'product' && (
                  <ProductDetail productId={activeProductId} />
                )}
                {view === 'lab' && <LabResults />}
              </motion.div>
            </AnimatePresence>
          </main>

          <Footer />
        </>
      )}
    </div>
  );
}

import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore.js';
import AgeGate from './components/AgeGate.jsx';
import NavBar from './components/NavBar.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
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
    <div className="relative min-h-screen bg-ink-900">
      <AgeGate />

      {/* Only mount the experience after acceptance so nothing (including the
          heavy 3D canvases) runs behind the blocking gate. */}
      {ageAccepted && (
        <>
          <NavBar />
          <CartDrawer />

          <main>
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

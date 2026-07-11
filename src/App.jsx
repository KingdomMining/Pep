import { AnimatePresence, motion } from 'framer-motion';
import { useStore } from './store/useStore.js';
import AgeGate from './components/AgeGate.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import CartDrawer from './components/CartDrawer.jsx';
import PeptideAssistant from './components/PeptideAssistant.jsx';
import TickerStrip from './components/TickerStrip.jsx';
import Hero from './pages/Hero.jsx';
import Gallery from './pages/Gallery.jsx';
import ProductDetail from './pages/ProductDetail.jsx';
import LabResults from './pages/LabResults.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderConfirmation from './pages/OrderConfirmation.jsx';

// ---------------------------------------------------------------------------
// <App /> — top-level shell. Renders the blocking age gate (shown on every
// visit), the fixed header (flash banner + minimizing nav), cart, the docked
// research assistant, the footer, and swaps the active view.
// ---------------------------------------------------------------------------

export default function App() {
  const ageAccepted = useStore((s) => s.ageAccepted);
  const view = useStore((s) => s.view);
  const activeProductId = useStore((s) => s.activeProductId);

  return (
    <div className="relative min-h-screen bg-page">
      <AgeGate />

      {ageAccepted && (
        <>
          {/* Ambient color-wash backdrop behind every page. */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute -left-40 -top-44 h-[38rem] w-[38rem] rounded-full bg-accent-teal/[0.05] blur-[120px]" />
            <div className="absolute -bottom-52 -right-44 h-[42rem] w-[42rem] rounded-full bg-accent-violet/[0.05] blur-[130px]" />
          </div>

          <Header />
          <CartDrawer />
          <PeptideAssistant />

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
                {view === 'product' && <ProductDetail productId={activeProductId} />}
                {view === 'lab' && <LabResults />}
                {view === 'checkout' && <Checkout />}
                {view === 'order' && <OrderConfirmation />}
              </motion.div>
            </AnimatePresence>
          </main>

          <Footer />
        </>
      )}
    </div>
  );
}

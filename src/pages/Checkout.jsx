import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStore, SHIPPING, INDUSTRIES } from '../store/useStore.js';
import { formatUSD } from '../data/products.js';
import { RUO_LINE, FDA_LINE } from '../components/Compliance.jsx';

// ---------------------------------------------------------------------------
// <Checkout /> — placeholder checkout mirroring the reference flow: contact,
// shipping method, insurance, payment method, industry, order summary + coupon,
// and Place Order. No real payment is processed (design showcase).
// ---------------------------------------------------------------------------

const PAYMENTS = [
  { id: 'card', label: 'Credit card (Visa/Amex)', note: '' },
  { id: 'bank', label: 'Instant Bank Transfer', note: '$5 discount', desc: 'Connect your bank securely through Plaid to authorize an instant ACH transfer. No card required. Your data is never stored.' },
  { id: 'card-nomc', label: 'Credit card (No MC)', note: '' },
  { id: 'apple', label: 'Apple Pay', note: '' },
];

export default function Checkout() {
  const items = useStore((s) => s.items);
  const navigate = useStore((s) => s.navigate);
  const shippingMethod = useStore((s) => s.shippingMethod);
  const setShippingMethod = useStore((s) => s.setShippingMethod);
  const insurance = useStore((s) => s.insurance);
  const toggleInsurance = useStore((s) => s.toggleInsurance);
  const paymentMethod = useStore((s) => s.paymentMethod);
  const setPaymentMethod = useStore((s) => s.setPaymentMethod);
  const industry = useStore((s) => s.industry);
  const setIndustry = useStore((s) => s.setIndustry);
  const email = useStore((s) => s.email);
  const setEmail = useStore((s) => s.setEmail);
  const placeOrder = useStore((s) => s.placeOrder);

  const coupon = useStore((s) => s.coupon);
  const setCoupon = useStore((s) => s.setCoupon);
  const applyCoupon = useStore((s) => s.applyCoupon);
  const couponApplied = useStore((s) => s.couponApplied);

  const subtotal = useStore((s) => s.subtotal());
  const shippingCost = useStore((s) => s.shippingCost());
  const insuranceCost = useStore((s) => s.insuranceCost());
  const bankDiscount = useStore((s) => s.bankDiscount());
  const couponDiscount = useStore((s) => s.couponDiscount());
  const total = useStore((s) => s.total());

  const [error, setError] = useState('');

  if (items.length === 0) {
    return (
      <section className="mx-auto max-w-3xl px-5 pb-24 pt-32 text-center sm:px-8">
        <h1 className="text-2xl font-semibold text-content">Your cart is empty</h1>
        <button onClick={() => navigate('home')} className="mt-4 text-accent-teal hover:underline">
          Back to catalog
        </button>
      </section>
    );
  }

  const onPlace = () => {
    if (!industry) {
      setError('Please select an industry to continue.');
      return;
    }
    setError('');
    placeOrder();
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pb-24 pt-28 sm:px-8">
      <button
        onClick={() => navigate('home')}
        className="mb-8 inline-flex items-center gap-1.5 text-sm text-muted transition hover:text-content"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <path d="M19 12H5M11 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Continue shopping
      </button>

      <h1 className="text-3xl font-semibold tracking-tightish text-content">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Left: form */}
        <div className="space-y-8">
          {/* Contact */}
          <Panel title="Contact">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email for order confirmation"
              className="w-full rounded-lg border border-line/15 bg-content/[0.03] px-3.5 py-2.5 text-sm text-content outline-none placeholder:text-muted focus:border-accent-teal/50"
            />
          </Panel>

          {/* Shipping */}
          <Panel title="Shipment">
            <div className="space-y-2">
              {Object.values(SHIPPING).map((opt) => (
                <Radio
                  key={opt.id}
                  checked={shippingMethod === opt.id}
                  onChange={() => setShippingMethod(opt.id)}
                  label={opt.label}
                  right={formatUSD(opt.price)}
                />
              ))}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-3 rounded-lg border border-line/10 bg-content/[0.02] p-3 text-sm text-muted">
              <input type="checkbox" checked={insurance} onChange={toggleInsurance} className="h-4 w-4 accent-accent-teal" />
              <span className="flex-1">Shipping Insurance</span>
              <span className="text-content">{formatUSD(5)}</span>
            </label>
          </Panel>

          {/* Payment */}
          <Panel title="Payment method">
            <div className="space-y-2">
              {PAYMENTS.map((p) => (
                <div key={p.id}>
                  <Radio
                    checked={paymentMethod === p.id}
                    onChange={() => setPaymentMethod(p.id)}
                    label={p.label}
                    right={p.note ? <span className="text-accent-teal">{p.note}</span> : null}
                  />
                  {paymentMethod === p.id && p.desc && (
                    <p className="ml-7 mt-1.5 text-xs leading-relaxed text-muted">{p.desc}</p>
                  )}
                </div>
              ))}
            </div>
          </Panel>

          {/* Industry */}
          <Panel title="Select Industry *">
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-lg border border-line/15 bg-content/[0.03] px-3.5 py-2.5 text-sm text-content outline-none focus:border-accent-teal/50"
            >
              <option value="">Select an option</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>{i}</option>
              ))}
            </select>
          </Panel>
        </div>

        {/* Right: summary */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-line/10 bg-surface2 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wideish text-muted">Order summary</h2>
            <ul className="mt-4 space-y-3">
              {items.map((i) => (
                <li key={i.key} className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-content">
                    {i.name} <span className="text-muted">· {i.size} × {i.qty}</span>
                  </span>
                  <span className="text-content">{formatUSD(i.price * i.qty)}</span>
                </li>
              ))}
            </ul>

            {/* Coupon */}
            <div className="mt-5 flex gap-2">
              <input
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Coupon code"
                className="min-w-0 flex-1 rounded-lg border border-line/15 bg-content/[0.03] px-3 py-2 text-sm text-content outline-none placeholder:text-muted focus:border-accent-teal/50"
              />
              <button onClick={applyCoupon} className="rounded-lg border border-line/15 px-3 py-2 text-sm text-content transition hover:border-line/30">
                Apply
              </button>
            </div>
            {couponApplied?.invalid && (
              <p className="mt-1.5 text-xs text-red-400">Coupon not recognized.</p>
            )}
            {couponApplied && !couponApplied.invalid && (
              <p className="mt-1.5 text-xs text-accent-teal">Coupon {couponApplied.code} applied.</p>
            )}

            <div className="mt-5 space-y-2 border-t border-line/10 pt-4 text-sm">
              <Row k="Subtotal" v={formatUSD(subtotal)} />
              <Row k="Shipping" v={formatUSD(shippingCost)} />
              {insuranceCost > 0 && <Row k="Shipping insurance" v={formatUSD(insuranceCost)} />}
              {bankDiscount > 0 && <Row k="Bank payment discount" v={`−${formatUSD(bankDiscount)}`} accent />}
              {couponDiscount > 0 && <Row k="Coupon" v={`−${formatUSD(couponDiscount)}`} accent />}
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-line/10 pt-3">
              <span className="text-sm text-muted">Total</span>
              <span className="text-xl font-semibold text-content">{formatUSD(total)}</span>
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <button
              onClick={onPlace}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#c2172c] via-[#8f1f7a] to-[#5b2bd6] py-3.5 text-sm font-semibold text-white transition hover:opacity-95"
            >
              Place Order
            </button>
            <p className="mt-3 text-center text-[11px] text-muted">Demo checkout — no payment is processed.</p>
          </div>

          <div className="mt-4 rounded-xl border border-line/10 bg-content/[0.02] p-4 text-[11px] leading-relaxed text-muted">
            <p className="font-medium">{RUO_LINE}</p>
            <p className="mt-1.5">{FDA_LINE}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Panel({ title, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-line/10 bg-surface p-5"
    >
      <h3 className="mb-3 text-sm font-semibold text-content">{title}</h3>
      {children}
    </motion.div>
  );
}

function Radio({ checked, onChange, label, right }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-line/10 bg-content/[0.02] p-3 text-sm transition hover:border-line/20">
      <span
        className={
          'grid h-4 w-4 shrink-0 place-items-center rounded-full border ' +
          (checked ? 'border-accent-teal' : 'border-line/30')
        }
      >
        {checked && <span className="h-2 w-2 rounded-full bg-accent-teal" />}
      </span>
      <input type="radio" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1 text-content">{label}</span>
      {right && <span className="text-muted">{right}</span>}
    </label>
  );
}

function Row({ k, v, accent }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{k}</span>
      <span className={accent ? 'text-accent-teal' : 'text-content'}>{v}</span>
    </div>
  );
}

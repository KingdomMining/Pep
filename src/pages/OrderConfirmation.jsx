import { motion } from 'framer-motion';
import { useStore } from '../store/useStore.js';
import { formatUSD } from '../data/products.js';
import { RUO_LINE } from '../components/Compliance.jsx';

const PAYMENT_LABEL = {
  card: 'Credit card (Visa/Amex)',
  bank: 'Instant Bank Transfer ($5 discount)',
  'card-nomc': 'Credit card (No MC)',
  apple: 'Apple Pay',
};

// ---------------------------------------------------------------------------
// <OrderConfirmation /> — post-checkout "thank you" page mirroring the
// reference order-received screen.
// ---------------------------------------------------------------------------

export default function OrderConfirmation() {
  const order = useStore((s) => s.lastOrder);
  const navigate = useStore((s) => s.navigate);

  if (!order) {
    return (
      <section className="mx-auto max-w-3xl px-5 pb-24 pt-32 text-center sm:px-8">
        <p className="text-muted">No recent order.</p>
        <button onClick={() => navigate('home')} className="mt-4 text-accent-teal hover:underline">
          Back to catalog
        </button>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-5 pb-24 pt-28 sm:px-8">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="grid h-14 w-14 place-items-center rounded-full bg-accent-teal/15 text-accent-teal">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tightish text-content sm:text-4xl">
          Thank you. Your order has been received.
        </h1>
      </motion.div>

      <div className="mt-8 rounded-2xl border border-line/10 bg-surface p-6">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          <Field k="Order number" v={order.number} />
          <Field k="Date" v={order.date} />
          <Field k="Email" v={order.email} />
          <Field k="Total" v={formatUSD(order.total)} />
          <Field k="Payment method" v={PAYMENT_LABEL[order.payment] || order.payment} />
        </dl>
      </div>

      <h2 className="mt-10 text-xl font-semibold text-content">Order details</h2>
      <div className="mt-4 overflow-hidden rounded-2xl border border-line/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Product</th>
              <th className="px-5 py-3 text-right font-semibold">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/10">
            {order.items.map((i) => (
              <tr key={i.key}>
                <td className="px-5 py-3 text-content">
                  {i.name} <span className="text-muted">· {i.size} × {i.qty}</span>
                </td>
                <td className="px-5 py-3 text-right text-content">{formatUSD(i.price * i.qty)}</td>
              </tr>
            ))}
            <tr>
              <td className="px-5 py-3 text-muted">Shipping</td>
              <td className="px-5 py-3 text-right text-content">{formatUSD(order.shipping)}</td>
            </tr>
            {order.insurance > 0 && (
              <tr>
                <td className="px-5 py-3 text-muted">Shipping insurance</td>
                <td className="px-5 py-3 text-right text-content">{formatUSD(order.insurance)}</td>
              </tr>
            )}
            {order.bank > 0 && (
              <tr>
                <td className="px-5 py-3 text-muted">Bank payment discount</td>
                <td className="px-5 py-3 text-right text-accent-teal">−{formatUSD(order.bank)}</td>
              </tr>
            )}
            {order.couponDisc > 0 && (
              <tr>
                <td className="px-5 py-3 text-muted">Coupon</td>
                <td className="px-5 py-3 text-right text-accent-teal">−{formatUSD(order.couponDisc)}</td>
              </tr>
            )}
            <tr className="bg-surface2">
              <td className="px-5 py-3 font-semibold text-content">Total</td>
              <td className="px-5 py-3 text-right font-semibold text-content">{formatUSD(order.total)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-center text-[11px] text-muted">{RUO_LINE}</p>
      <div className="mt-6 flex justify-center">
        <button
          onClick={() => navigate('home')}
          className="rounded-xl border border-line/15 px-6 py-3 text-sm font-medium text-content transition hover:border-line/30"
        >
          Back to catalog
        </button>
      </div>
    </section>
  );
}

function Field({ k, v }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-wide text-muted">{k}</dt>
      <dd className="mt-0.5 font-medium text-content">{v}</dd>
    </div>
  );
}

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Toggle the `dark` class on <html>, which drives all semantic color tokens.
function applyThemeClass(theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme !== 'light');
}

// Shipping options (mirrors the reference checkout).
export const SHIPPING = {
  standard: { id: 'standard', label: 'Standard 3–6 Day Shipping (+1 Day Processing)', price: 10 },
  express: { id: 'express', label: 'Express 2–4 Day Air Shipping (Same Day Shipping)', price: 20 },
  premium: { id: 'premium', label: 'Premium 2 Day Air Shipping (Same Day Shipping)', price: 40 },
};

export const INDUSTRIES = [
  'Analytical / Scientific Research',
  'Academic / University Research',
  'Biotechnology / R&D',
  'Chemical / Material Sciences',
  'Private / Independent CRO',
  'None',
];

const INSURANCE_FEE = 5;
const BANK_DISCOUNT = 5; // Instant Bank Transfer discount

// ---------------------------------------------------------------------------
// Global app state: age/RUO gate, theme, lightweight routing, cart + checkout,
// and the peptide assistant / flash-banner UI flags.
//
// Age-gate acceptance is intentionally NOT persisted — the 21+ / RUO gate
// shows again on every fresh visit to the site. The cart + theme persist.
// ---------------------------------------------------------------------------

export const useStore = create(
  persist(
    (set, get) => ({
      // --- Age + RUO gate (session only; shows on each new visit) -----------
      ageAccepted: false,
      acceptAge: () => set({ ageAccepted: true }),
      resetAge: () => set({ ageAccepted: false }),

      // --- Theme ('dark' | 'light') ----------------------------------------
      theme: 'dark',
      setTheme: (theme) => {
        applyThemeClass(theme);
        set({ theme });
      },
      toggleTheme: () =>
        set((s) => {
          const next = s.theme === 'dark' ? 'light' : 'dark';
          applyThemeClass(next);
          return { theme: next };
        }),

      // --- Lightweight view routing ----------------------------------------
      // view: 'home' | 'product' | 'lab' | 'checkout' | 'order'
      view: 'home',
      activeProductId: null,
      navigate: (view, activeProductId = null) => {
        set({ view, activeProductId });
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      },

      // --- Peptide assistant + flash banner UI -----------------------------
      assistantOpen: false,
      toggleAssistant: () => set((s) => ({ assistantOpen: !s.assistantOpen })),
      closeAssistant: () => set({ assistantOpen: false }),
      flashDismissed: false,
      dismissFlash: () => set({ flashDismissed: true }),

      // --- Cart -------------------------------------------------------------
      cartOpen: false,
      openCart: () => set({ cartOpen: true }),
      closeCart: () => set({ cartOpen: false }),
      toggleCart: () => set((s) => ({ cartOpen: !s.cartOpen })),

      // items: [{ key, productId, name, size, price, qty }]
      items: [],

      addItem: (product, variant) => {
        const key = `${product.id}::${variant.size}`;
        set((s) => {
          const existing = s.items.find((i) => i.key === key);
          if (existing) {
            return {
              items: s.items.map((i) =>
                i.key === key ? { ...i, qty: i.qty + 1 } : i
              ),
              cartOpen: true,
            };
          }
          return {
            items: [
              ...s.items,
              {
                key,
                productId: product.id,
                name: product.name,
                size: variant.size,
                price: variant.price,
                qty: 1,
              },
            ],
            cartOpen: true,
          };
        });
      },

      setQty: (key, qty) =>
        set((s) => ({
          items:
            qty <= 0
              ? s.items.filter((i) => i.key !== key)
              : s.items.map((i) => (i.key === key ? { ...i, qty } : i)),
        })),

      removeItem: (key) =>
        set((s) => ({ items: s.items.filter((i) => i.key !== key) })),

      clearCart: () => set({ items: [] }),

      // --- Checkout state ---------------------------------------------------
      shippingMethod: 'standard',
      setShippingMethod: (id) => set({ shippingMethod: id }),
      insurance: true,
      toggleInsurance: () => set((s) => ({ insurance: !s.insurance })),
      paymentMethod: 'bank', // 'card' | 'bank' | 'card-nomc' | 'apple'
      setPaymentMethod: (m) => set({ paymentMethod: m }),
      industry: '',
      setIndustry: (v) => set({ industry: v }),
      email: '',
      setEmail: (v) => set({ email: v }),

      coupon: '',
      couponApplied: null, // { code, rate } once applied
      setCoupon: (v) => set({ coupon: v }),
      applyCoupon: () =>
        set((s) => {
          const code = s.coupon.trim().toUpperCase();
          // Demo coupons only.
          const table = { RESEARCH10: 0.1, LAB15: 0.15 };
          if (table[code]) return { couponApplied: { code, rate: table[code] } };
          return { couponApplied: { code, rate: 0, invalid: true } };
        }),
      clearCoupon: () => set({ coupon: '', couponApplied: null }),

      lastOrder: null,
      placeOrder: () =>
        set((s) => {
          const subtotal = s.items.reduce((a, i) => a + i.price * i.qty, 0);
          const shipping = SHIPPING[s.shippingMethod]?.price ?? 0;
          const insurance = s.insurance ? INSURANCE_FEE : 0;
          const bank = s.paymentMethod === 'bank' ? BANK_DISCOUNT : 0;
          const couponRate = s.couponApplied?.rate || 0;
          const couponDisc = +(subtotal * couponRate).toFixed(2);
          const total = Math.max(0, subtotal + shipping + insurance - bank - couponDisc);
          const order = {
            number: 100000 + Math.floor(Math.random() * 899999),
            date: new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            email: s.email || 'researcher@example.com',
            items: s.items,
            subtotal,
            shipping,
            insurance,
            bank,
            couponDisc,
            total,
            payment: s.paymentMethod,
          };
          return {
            lastOrder: order,
            items: [],
            couponApplied: null,
            coupon: '',
            view: 'order',
          };
        }),

      // --- Derived selectors ------------------------------------------------
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
      shippingCost: () => SHIPPING[get().shippingMethod]?.price ?? 0,
      insuranceCost: () => (get().insurance ? INSURANCE_FEE : 0),
      bankDiscount: () => (get().paymentMethod === 'bank' ? BANK_DISCOUNT : 0),
      couponDiscount: () => {
        const s = get();
        const rate = s.couponApplied?.rate || 0;
        return +(s.subtotal() * rate).toFixed(2);
      },
      total: () => {
        const s = get();
        return Math.max(
          0,
          s.subtotal() +
            s.shippingCost() +
            s.insuranceCost() -
            s.bankDiscount() -
            s.couponDiscount()
        );
      },
    }),
    {
      name: 'aegis-research-store',
      // Persist only the cart + theme. Age gate is deliberately session-only.
      partialize: (s) => ({ items: s.items, theme: s.theme }),
      onRehydrateStorage: () => (state) => {
        if (state) applyThemeClass(state.theme);
      },
    }
  )
);

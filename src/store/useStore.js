import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ---------------------------------------------------------------------------
// Global app state: age/RUO gate acceptance, cart, and lightweight routing.
//
// Age-gate acceptance is persisted to localStorage so a returning, already-
// verified researcher is not re-prompted on every visit. The cart is persisted
// too so an in-progress order survives a refresh.
// ---------------------------------------------------------------------------

export const useStore = create(
  persist(
    (set, get) => ({
      // --- Age + RUO gate ---------------------------------------------------
      ageAccepted: false,
      acceptAge: () => set({ ageAccepted: true }),
      // (No reset in the UI; exposed for testing / a future "sign out".)
      resetAge: () => set({ ageAccepted: false }),

      // --- Lightweight view routing (SPA, no router dependency) -------------
      // view: 'home' | 'product' | 'lab'
      view: 'home',
      activeProductId: null,
      navigate: (view, activeProductId = null) => {
        set({ view, activeProductId });
        if (typeof window !== 'undefined') {
          window.scrollTo({ top: 0, behavior: 'auto' });
        }
      },

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

      // --- Derived selectors ------------------------------------------------
      count: () => get().items.reduce((n, i) => n + i.qty, 0),
      subtotal: () => get().items.reduce((sum, i) => sum + i.price * i.qty, 0),
    }),
    {
      name: 'aegis-research-store',
      // Only persist durable state — not transient UI like cartOpen/view.
      partialize: (s) => ({ ageAccepted: s.ageAccepted, items: s.items }),
    }
  )
);

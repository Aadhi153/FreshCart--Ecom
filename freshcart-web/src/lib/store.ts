import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  addServerWishlistItem,
  removeServerWishlistItem,
  addServerCartItem,
  updateServerCartQuantity,
  removeServerCartItem,
} from './api';

export interface CartItem {
  id: string | number;
  productId: string;
  variantId?: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
  categoryId?: string;
}

interface CartState {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
  hydrateFromServer: (items: CartItem[]) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addItem: (item) => {
        const qtyToAdd = item.quantity || 1;
        // Omit quantity before spreading so we don't accidentally nest it
        const { quantity, ...itemWithoutQty } = item as any;
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + qtyToAdd } : i
              )
            };
          }
          return { items: [...state.items, { ...itemWithoutQty, quantity: qtyToAdd }] };
        });
        // Best-effort: persists to the account so it follows the user across devices/refreshes.
        // Silently ignored for guests (no session) — the local store above is their cart.
        const finalQty = get().items.find((i) => i.id === item.id)?.quantity ?? qtyToAdd;
        addServerCartItem(item.productId, item.variantId ?? null, finalQty).catch(() => {});
      },
      removeItem: (id) => {
        const item = get().items.find((i) => i.id === id);
        set((state) => ({
          items: state.items.filter((i) => i.id !== id)
        }));
        if (item) removeServerCartItem(item.productId, item.variantId ?? null).catch(() => {});
      },
      updateQuantity: (id, quantity) => {
        const nextQty = Math.max(1, quantity);
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: nextQty } : i
          )
        }));
        const item = get().items.find((i) => i.id === id);
        if (item) updateServerCartQuantity(item.productId, item.variantId ?? null, nextQty).catch(() => {});
      },
      clearCart: () => set({ items: [] }),
      // Merges items already saved on the account (fetched after sign-in) into the local
      // store, without clobbering anything a guest already added locally this session.
      hydrateFromServer: (items) => set((state) => {
        const existingIds = new Set(state.items.map((i) => String(i.id)));
        const toAdd = items.filter((i) => !existingIds.has(String(i.id)));
        return toAdd.length > 0 ? { items: [...state.items, ...toAdd] } : state;
      }),
    }),
    {
      name: 'freshcart-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

export interface WishlistItem {
  id: string | number;
  name: string;
  price: number;
  image?: string;
  category?: string;
}

interface WishlistState {
  items: WishlistItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (item: WishlistItem) => void;
  removeItem: (id: string | number) => void;
  isInWishlist: (id: string | number) => boolean;
  clearAll: () => void;
  hydrateFromServer: (items: WishlistItem[]) => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addItem: (item) => {
        set((state) => {
          if (state.items.some((existing) => existing.id === item.id)) {
            return state;
          }
          return { items: [...state.items, item] };
        });
        // Best-effort: persists to the account so it follows the user across devices.
        // Silently ignored for guests (no session) — the local store above is their wishlist.
        addServerWishlistItem(String(item.id)).catch(() => {});
      },
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
        removeServerWishlistItem(String(id)).catch(() => {});
      },
      isInWishlist: (id) => get().items.some((item) => item.id === id),
      clearAll: () => set({ items: [] }),
      // Merges items already saved on the account (fetched after sign-in) into the local
      // store, without clobbering anything a guest already added locally this session.
      hydrateFromServer: (items) => set((state) => {
        const existingIds = new Set(state.items.map((i) => String(i.id)));
        const toAdd = items.filter((i) => !existingIds.has(String(i.id)));
        return toAdd.length > 0 ? { items: [...state.items, ...toAdd] } : state;
      }),
    }),
    {
      name: 'freshcart-wishlist-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Saved addresses used to live here as a zustand `persist` store (localStorage
// only, no account sync — see 00035_addresses.sql). They're now backed by the
// addresses table via lib/api.ts (getAddresses/addAddress/updateAddress/
// removeAddress/setDefaultAddress); AddressType/Address types live in api.ts.

export interface AppliedPromotion {
  id: string;
  name: string;
  code: string | null;   // null for auto-applied offers
  discountAmount: number; // last server-confirmed amount, for display only
  source: 'coupon' | 'auto';
  discountType: 'percentage' | 'flat' | 'bogo' | 'free_shipping' | 'gift_with_purchase';
  discountValue: number;
  freeItemName?: string; // the free item's name for bogo, or the gift's name for gift_with_purchase
}

interface PromotionState {
  applied: AppliedPromotion | null;
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  setApplied: (promo: AppliedPromotion | null) => void;
  clear: () => void;
}

// Single source of truth for "which promotion is currently applied", shared by the
// cart sidebar, full cart page, and checkout page — previously each of those kept its
// own local useState, so an applied coupon was silently lost navigating cart→checkout.
export const usePromotionStore = create<PromotionState>()(
  persist(
    (set) => ({
      applied: null,
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      setApplied: (promo) => set({ applied: promo }),
      clear: () => set({ applied: null }),
    }),
    {
      name: 'freshcart-promotion-storage',
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// In-memory (not persisted) profile summary shared between the account sidebar
// and the profile page, so an avatar/name change on one shows up on the other
// immediately without a full page reload.
interface ProfileSummaryState {
  fullName: string;
  avatarUrl: string | null;
  hasLoaded: boolean;
  setProfileSummary: (data: { fullName?: string; avatarUrl?: string | null }) => void;
}

export const useProfileSummaryStore = create<ProfileSummaryState>((set) => ({
  fullName: '',
  avatarUrl: null,
  hasLoaded: false,
  setProfileSummary: (data) => set((state) => ({ ...state, ...data, hasLoaded: true })),
}));


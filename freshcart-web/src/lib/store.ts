import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addServerWishlistItem, removeServerWishlistItem } from './api';

export interface CartItem {
  id: string | number;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  category?: string;
}

interface CartState {
  items: CartItem[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  addItem: (item: Omit<CartItem, 'quantity'> & { quantity?: number }) => void;
  removeItem: (id: string | number) => void;
  updateQuantity: (id: string | number, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      addItem: (item) => set((state) => {
        const qtyToAdd = item.quantity || 1;
        // Omit quantity before spreading so we don't accidentally nest it
        const { quantity, ...itemWithoutQty } = item as any;
        const existing = state.items.find((i) => i.id === item.id);
        if (existing) {
          return {
            items: state.items.map((i) => 
              i.id === item.id ? { ...i, quantity: i.quantity + qtyToAdd } : i
            )
          };
        }
        return { items: [...state.items, { ...itemWithoutQty, quantity: qtyToAdd }] };
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter((i) => i.id !== id)
      })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map((i) => 
          i.id === id ? { ...i, quantity: Math.max(1, quantity) } : i
        )
      })),
      clearCart: () => set({ items: [] })
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

export type AddressType = 'home' | 'work' | 'other';

export interface SavedAddress {
  id: string;
  label: string;
  type?: AddressType;
  fullName: string;
  phone: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
  isDefault?: boolean;
}

interface AddressState {
  addresses: SavedAddress[];
  hasHydrated: boolean;
  setHasHydrated: (value: boolean) => void;
  upsertAddress: (address: SavedAddress) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
}

export const useAddressStore = create<AddressState>()(
  persist(
    (set) => ({
      addresses: [],
      hasHydrated: false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
      upsertAddress: (address) => set((state) => {
        const exists = state.addresses.some((item) => item.id === address.id);
        const isFirst = state.addresses.length === 0;
        const next = { ...address, isDefault: isFirst ? true : address.isDefault };
        const clearOthers = (list: SavedAddress[]) =>
          next.isDefault ? list.map((item) => ({ ...item, isDefault: false })) : list;

        if (!exists) {
          return { addresses: [...clearOthers(state.addresses), next] };
        }

        return {
          addresses: clearOthers(state.addresses).map((item) => item.id === next.id ? next : item),
        };
      }),
      removeAddress: (id) => set((state) => {
        const wasDefault = state.addresses.find((item) => item.id === id)?.isDefault;
        const remaining = state.addresses.filter((item) => item.id !== id);
        if (wasDefault && remaining.length > 0 && !remaining.some((item) => item.isDefault)) {
          remaining[0] = { ...remaining[0], isDefault: true };
        }
        return { addresses: remaining };
      }),
      setDefaultAddress: (id) => set((state) => ({
        addresses: state.addresses.map((item) => ({ ...item, isDefault: item.id === id })),
      })),
    }),
    {
      name: 'freshcart-address-storage',
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


'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getServerCart } from '../lib/api';
import { useCartStore } from '../lib/store';

// Headless: on sign-in, pulls the account's server-side cart into the local store so
// items added on another device (or before a refresh) show up here too. Renders nothing.
export function CartSync() {
  const hydrateFromServer = useCartStore((s) => s.hydrateFromServer);

  useEffect(() => {
    async function syncIfSignedIn() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        const rows = await getServerCart();
        hydrateFromServer(
          rows
            .filter((row) => row.products)
            .map((row) => ({
              id: row.variant_id ? `${row.product_id}-${row.variant_id}` : row.product_id,
              productId: row.product_id,
              variantId: row.variant_id || undefined,
              name: row.product_variants ? `${row.products!.name} - ${row.product_variants.name}` : row.products!.name,
              price: row.products!.price + (row.product_variants?.price_adjustment || 0),
              quantity: row.quantity,
              image: row.product_variants?.image_url || row.products!.image_url || undefined,
              category: row.products!.categories?.name,
            }))
        );
      } catch {
        // Best-effort — local cart still works if this fails.
      }
    }

    syncIfSignedIn();
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') syncIfSignedIn();
    });
    return () => listener.subscription.unsubscribe();
  }, [hydrateFromServer]);

  return null;
}

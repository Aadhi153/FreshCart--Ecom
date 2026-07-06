'use client';

import { useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getServerWishlist } from '../lib/api';
import { useWishlistStore } from '../lib/store';

// Headless: on sign-in, pulls the account's server-side wishlist into the local
// store so items saved on another device show up here too. Renders nothing.
export function WishlistSync() {
  const hydrateFromServer = useWishlistStore((s) => s.hydrateFromServer);

  useEffect(() => {
    async function syncIfSignedIn() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;
      try {
        const rows = await getServerWishlist();
        hydrateFromServer(
          rows
            .filter((row) => row.products)
            .map((row) => ({
              id: row.products!.id,
              name: row.products!.name,
              price: row.products!.price,
              image: row.products!.image_url || undefined,
              category: row.products!.categories?.name,
            }))
        );
      } catch {
        // Best-effort — local wishlist still works if this fails.
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

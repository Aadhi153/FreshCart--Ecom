-- Server-side wishlist persistence. The web app previously stored wishlist items only in
-- localStorage (zustand persist), so a signed-in customer's wishlist didn't follow them to
-- another device/browser. This adds an owner-scoped table the backend can read/write for
-- authenticated users; the localStorage store is kept as the instant-UI/guest fallback.

BEGIN;

CREATE TABLE IF NOT EXISTS public.wishlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE (user_id, product_id)
);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own wishlist" ON public.wishlists;
CREATE POLICY "Users can view their own wishlist" ON public.wishlists
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own wishlist items" ON public.wishlists;
CREATE POLICY "Users can insert their own wishlist items" ON public.wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own wishlist items" ON public.wishlists;
CREATE POLICY "Users can delete their own wishlist items" ON public.wishlists
  FOR DELETE USING (auth.uid() = user_id);

COMMIT;

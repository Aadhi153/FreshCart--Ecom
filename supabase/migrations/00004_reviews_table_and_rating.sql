-- Fix a migration-chain gap: 00001_align_live_schema.sql enables RLS and adds policies
-- on `reviews` assuming the table already exists (true on the live DB, created long ago
-- by the legacy freshcart-backend/setup-db.js) -- but no migration in this chain actually
-- creates it, so a fresh database bootstrapped only from supabase/migrations/*.sql would
-- fail at that ALTER TABLE. This migration is idempotent (IF NOT EXISTS everywhere) so it's
-- a no-op on the live DB and a real fix for fresh environments.
--
-- Also adds a rating/review_count sync so pages that only need a quick average (e.g. a
-- product grid) don't have to fetch every review row per product.

BEGIN;

CREATE TABLE IF NOT EXISTS public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE (product_id, user_id)
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;
CREATE POLICY "Reviews are viewable by everyone" ON public.reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.reviews;
CREATE POLICY "Users can insert their own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS review_count INTEGER NOT NULL DEFAULT 0;

-- SECURITY DEFINER (same pattern as public.is_admin() in 00002) so a non-admin user's
-- review insert can still update products.rating/review_count despite the admin-only
-- "Admins can update products" policy on products.
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID := COALESCE(NEW.product_id, OLD.product_id);
BEGIN
  UPDATE products SET
    rating = COALESCE((SELECT AVG(rating) FROM reviews WHERE product_id = target_id), 0),
    review_count = (SELECT COUNT(*) FROM reviews WHERE product_id = target_id)
  WHERE id = target_id;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_product_rating ON public.reviews;
CREATE TRIGGER trg_update_product_rating
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- One-time backfill for any reviews that already exist on the live DB.
UPDATE products p SET
  rating = COALESCE((SELECT AVG(rating) FROM reviews r WHERE r.product_id = p.id), 0),
  review_count = (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id);

COMMIT;

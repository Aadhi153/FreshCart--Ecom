-- Minimal coupon code support. No INSERT/UPDATE/DELETE policy is defined -- coupons are
-- authored directly in Supabase (service role) for now, since there's no admin coupon
-- authoring UI in this pass. Public SELECT lets the web checkout validate a code client-side
-- before submitting the order; the backend re-validates and applies the discount
-- authoritatively in POST /api/orders regardless.

BEGIN;

CREATE TABLE IF NOT EXISTS public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('flat', 'percent')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_discount_amount NUMERIC(10,2),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Active coupons are viewable by everyone" ON public.coupons;
CREATE POLICY "Active coupons are viewable by everyone" ON public.coupons
  FOR SELECT USING (active = true AND (expires_at IS NULL OR expires_at > now()));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) NOT NULL DEFAULT 0;

COMMIT;

-- Admin coupon management: coupons could previously only be authored directly in Supabase
-- (see 00005_coupons.sql). This adds the missing admin read/write policies so the new
-- admin Coupons page can list (including inactive/expired) and manage coupons via the
-- authenticated Supabase client, mirroring the categories/products admin policies.

BEGIN;

DROP POLICY IF EXISTS "Admins can view all coupons" ON public.coupons;
CREATE POLICY "Admins can view all coupons" ON public.coupons
  FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert coupons" ON public.coupons;
CREATE POLICY "Admins can insert coupons" ON public.coupons
  FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update coupons" ON public.coupons;
CREATE POLICY "Admins can update coupons" ON public.coupons
  FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete coupons" ON public.coupons;
CREATE POLICY "Admins can delete coupons" ON public.coupons
  FOR DELETE USING (public.is_admin(auth.uid()));

COMMIT;

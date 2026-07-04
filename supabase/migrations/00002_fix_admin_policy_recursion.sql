-- Fix "infinite recursion detected in policy for relation profiles".
-- Every admin-check policy did EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
-- directly inside a policy on profiles (and other tables) -- when Postgres evaluates that
-- subquery it must also apply profiles' own RLS policies to it, including this same
-- self-referencing one, causing infinite recursion for any non-service-role caller.
--
-- Fix: a SECURITY DEFINER function runs as its owner (the postgres role, which owns these
-- tables and is therefore exempt from their RLS by default, since FORCE ROW LEVEL SECURITY
-- was never set). Calling it from a policy avoids re-triggering RLS on profiles.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = uid AND role = 'admin');
$$;

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
CREATE POLICY "Admins can insert categories" ON categories FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Active products are viewable by everyone" ON products;
CREATE POLICY "Active products are viewable by everyone" ON products FOR SELECT USING (is_active = true OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products" ON products FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products" ON products FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products" ON products FOR DELETE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR public.is_admin(auth.uid()))));

DROP POLICY IF EXISTS "Admins can insert variants" ON product_variants;
CREATE POLICY "Admins can insert variants" ON product_variants FOR INSERT WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update variants" ON product_variants;
CREATE POLICY "Admins can update variants" ON product_variants FOR UPDATE USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete variants" ON product_variants;
CREATE POLICY "Admins can delete variants" ON product_variants FOR DELETE USING (public.is_admin(auth.uid()));

COMMIT;

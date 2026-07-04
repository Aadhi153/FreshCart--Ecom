-- FreshCart: align live DB (old setup-db.js schema) with the intended schema
-- from 00000_schema_and_seed.sql, without losing existing real data.
-- Idempotent: safe to re-run.

BEGIN;

-- 1. Enums --------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('customer', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE order_status AS ENUM ('placed', 'packed', 'shipped', 'delivered', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. categories table -----------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    image_url TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO categories (name, slug, display_order) VALUES
  ('Eggs', 'eggs', 1),
  ('Coconuts', 'coconuts', 2),
  ('Vegetables', 'vegetables', 3),
  ('T-Shirts', 't-shirts', 4),
  ('Snacks', 'snacks', 5)
ON CONFLICT (slug) DO NOTHING;

-- 3. profiles alterations --------------------------------------------------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

UPDATE profiles p SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND p.email IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE email IS NULL) THEN
    ALTER TABLE profiles ALTER COLUMN email SET NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'customer'::user_role NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"push": true, "email": true}'::jsonb;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone_number')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='profiles' AND column_name='phone') THEN
    ALTER TABLE profiles RENAME COLUMN phone_number TO phone;
  END IF;
END $$;

-- Backfill profile rows for existing auth.users that have none yet
INSERT INTO profiles (id, email, full_name, phone, role)
SELECT u.id, u.email, u.raw_user_meta_data->>'full_name', u.phone, 'customer'
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- Grant admin role to the target account
UPDATE profiles SET role = 'admin', updated_at = now()
WHERE id = '4ad92da0-8283-437e-930a-7cec19263105';

-- 4. products alterations ---------------------------------------------------
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
ALTER TABLE products ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Create any missing categories from existing free-text product.category values
INSERT INTO categories (name, slug)
SELECT DISTINCT p.category, lower(regexp_replace(trim(p.category), '\s+', '-', 'g'))
FROM products p
WHERE p.category IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM categories c WHERE c.name = p.category)
ON CONFLICT (slug) DO NOTHING;

UPDATE products p SET category_id = c.id
FROM categories c
WHERE c.name = p.category AND p.category_id IS NULL;

-- 5. orders alterations -------------------------------------------------
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address JSONB;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_slot TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;

DO $$ BEGIN
  IF (SELECT data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='orders' AND column_name='status') <> 'USER-DEFINED' THEN
    ALTER TABLE orders ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE orders ALTER COLUMN status TYPE order_status USING (
      CASE status
        WHEN 'pending' THEN 'placed'
        WHEN 'processing' THEN 'packed'
        WHEN 'shipped' THEN 'shipped'
        WHEN 'delivered' THEN 'delivered'
        WHEN 'cancelled' THEN 'cancelled'
        ELSE 'placed'
      END
    )::order_status;
    ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'placed'::order_status;
  END IF;
END $$;

-- 6. RLS + policies -------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert categories" ON categories;
CREATE POLICY "Admins can insert categories" ON categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update categories" ON categories;
CREATE POLICY "Admins can update categories" ON categories FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Active products are viewable by everyone" ON products;
CREATE POLICY "Active products are viewable by everyone" ON products FOR SELECT USING (is_active = true OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can insert products" ON products;
CREATE POLICY "Admins can insert products" ON products FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update products" ON products;
CREATE POLICY "Admins can update products" ON products FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete products" ON products;
CREATE POLICY "Admins can delete products" ON products FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
CREATE POLICY "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
CREATE POLICY "Users can insert their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update orders" ON orders;
CREATE POLICY "Admins can update orders" ON orders FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
CREATE POLICY "Users can view their own order items" ON order_items FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND (orders.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))));

DROP POLICY IF EXISTS "Users can insert order items for their own orders" ON order_items;
CREATE POLICY "Users can insert order items for their own orders" ON order_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid()));

-- Supplementary: product_variants (not in the original migration file, but has live CRUD usage)
DROP POLICY IF EXISTS "Variants are viewable by everyone" ON product_variants;
CREATE POLICY "Variants are viewable by everyone" ON product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert variants" ON product_variants;
CREATE POLICY "Admins can insert variants" ON product_variants FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update variants" ON product_variants;
CREATE POLICY "Admins can update variants" ON product_variants FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete variants" ON product_variants;
CREATE POLICY "Admins can delete variants" ON product_variants FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Supplementary: reviews (not in the original migration file, but has a live POST endpoint)
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
CREATE POLICY "Users can insert their own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Trigger: auto-create profile row on signup ---------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, phone)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.phone);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

COMMIT;

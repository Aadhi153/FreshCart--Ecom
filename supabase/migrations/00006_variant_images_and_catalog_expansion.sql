-- Adds a per-variant image (variants previously only inherited the parent product's
-- image) and expands the catalog seed data to 10+ categories, 16+ products, and
-- 45+ variants so the storefront has a realistic amount of browsable data.
--
-- product_variants itself was never created by a tracked migration (00001 only adds
-- RLS policies for it, assuming it already exists live) -- CREATE TABLE IF NOT EXISTS
-- here closes that gap for a fresh database, same pattern as 00004's reviews fix.
-- Everything below is idempotent (ON CONFLICT / NOT EXISTS guards), safe to re-run.

BEGIN;

-- 1. product_variants table + new image_url column ------------------------------
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS image_url TEXT;

ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Variants are viewable by everyone" ON public.product_variants;
CREATE POLICY "Variants are viewable by everyone" ON public.product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can insert variants" ON public.product_variants;
CREATE POLICY "Admins can insert variants" ON public.product_variants FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can update variants" ON public.product_variants;
CREATE POLICY "Admins can update variants" ON public.product_variants FOR UPDATE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

DROP POLICY IF EXISTS "Admins can delete variants" ON public.product_variants;
CREATE POLICY "Admins can delete variants" ON public.product_variants FOR DELETE USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. Categories (7 new + the 5 existing = 12 total) ------------------------------
INSERT INTO categories (name, slug, display_order) VALUES
  ('Dairy', 'dairy', 6),
  ('Bakery', 'bakery', 7),
  ('Fruits', 'fruits', 8),
  ('Beverages', 'beverages', 9),
  ('Personal Care', 'personal-care', 10),
  ('Household', 'household', 11),
  ('Frozen Foods', 'frozen-foods', 12)
ON CONFLICT (slug) DO NOTHING;

-- 3. Products (19 new + the 7 existing = 26 total) -------------------------------
INSERT INTO products (category_id, name, description, price, stock_quantity, is_active, rating, image_url)
SELECT c.id, v.name, v.description, v.price, v.stock_quantity, true, v.rating, v.image_url
FROM (VALUES
  ('dairy',          'Whole Milk',            'Farm-fresh pasteurized whole milk, rich and creamy.',           40.00, 150, 4.6, 'https://picsum.photos/seed/fc-whole-milk/600/600'),
  ('dairy',          'Greek Yogurt',          'Thick and creamy Greek-style yogurt, high in protein.',         55.00,  90, 4.7, 'https://picsum.photos/seed/fc-greek-yogurt/600/600'),
  ('dairy',          'Paneer',                'Soft and fresh cottage cheese, perfect for curries.',           70.00,  60, 4.5, 'https://picsum.photos/seed/fc-paneer/600/600'),
  ('bakery',         'Whole Wheat Bread',     'Freshly baked whole wheat bread loaf.',                         35.00, 100, 4.4, 'https://picsum.photos/seed/fc-whole-wheat-bread/600/600'),
  ('bakery',         'Butter Croissant',      'Flaky, buttery croissants baked fresh daily.',                  60.00,  70, 4.6, 'https://picsum.photos/seed/fc-butter-croissant/600/600'),
  ('bakery',         'Chocolate Muffin',      'Rich chocolate muffins with a soft, moist crumb.',              45.00,  80, 4.5, 'https://picsum.photos/seed/fc-chocolate-muffin/600/600'),
  ('fruits',         'Organic Bananas',       'Sweet, naturally ripened organic bananas.',                     50.00, 200, 4.7, 'https://picsum.photos/seed/fc-organic-bananas/600/600'),
  ('fruits',         'Fresh Avocado',         'Creamy Hass avocados, perfect for guacamole and toast.',        65.00,  90, 4.6, 'https://picsum.photos/seed/fc-fresh-avocado/600/600'),
  ('fruits',         'Red Apples',            'Crisp and juicy red apples.',                                   90.00, 110, 4.5, 'https://picsum.photos/seed/fc-red-apples/600/600'),
  ('beverages',      'Cold Brew Coffee',      'Smooth, slow-steeped cold brew coffee concentrate.',           120.00,  50, 4.8, 'https://picsum.photos/seed/fc-cold-brew-coffee/600/600'),
  ('beverages',      'Orange Juice',          '100 percent pure squeezed orange juice, no added sugar.',       80.00,  70, 4.6, 'https://picsum.photos/seed/fc-orange-juice/600/600'),
  ('personal-care',  'Herbal Shampoo',        'Gentle herbal shampoo for daily use.',                         150.00,  60, 4.4, 'https://picsum.photos/seed/fc-herbal-shampoo/600/600'),
  ('personal-care',  'Aloe Vera Face Wash',   'Soothing aloe vera face wash for all skin types.',             110.00,  55, 4.3, 'https://picsum.photos/seed/fc-aloe-face-wash/600/600'),
  ('household',      'Dish Soap',             'Grease-cutting dish soap, tough on grime, gentle on hands.',    65.00, 100, 4.5, 'https://picsum.photos/seed/fc-dish-soap/600/600'),
  ('household',      'Multi-Surface Cleaner', 'All-purpose cleaner for kitchens, bathrooms, and more.',        95.00,  85, 4.4, 'https://picsum.photos/seed/fc-multi-surface-cleaner/600/600'),
  ('frozen-foods',   'Frozen Peas',           'Flash-frozen green peas, locked in freshness.',                 55.00, 130, 4.5, 'https://picsum.photos/seed/fc-frozen-peas/600/600'),
  ('frozen-foods',   'Veggie Nuggets',        'Crispy vegetable nuggets, ready in minutes.',                  140.00,  70, 4.3, 'https://picsum.photos/seed/fc-veggie-nuggets/600/600'),
  ('vegetables',     'Spinach Bunch',         'Fresh green spinach, packed with iron.',                        25.00,  90, 4.4, 'https://picsum.photos/seed/fc-spinach-bunch/600/600'),
  ('snacks',         'Potato Chips',          'Crunchy potato chips in classic and masala flavors.',           30.00, 150, 4.6, 'https://picsum.photos/seed/fc-potato-chips/600/600')
) AS v(category_slug, name, description, price, stock_quantity, rating, image_url)
JOIN categories c ON c.slug = v.category_slug
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.name = v.name AND p.category_id = c.id
);

-- 4. Variants, each with its own image -------------------------------------------
-- Covers both the 19 new products above and the 7 original products from
-- 00000_schema_and_seed.sql (which had no variants of their own yet).
INSERT INTO product_variants (product_id, name, price_adjustment, stock_quantity, image_url)
SELECT p.id, v.variant_name, v.price_adjustment, v.stock_quantity, v.image_url
FROM (VALUES
  -- Original catalog
  ('Farm Fresh Brown Eggs (12 pcs)', '6 pcs',            -2.50, 60, 'https://picsum.photos/seed/fc-brown-eggs-6/300/300'),
  ('Farm Fresh Brown Eggs (12 pcs)', '12 pcs',             0.00, 80, 'https://picsum.photos/seed/fc-brown-eggs-12/300/300'),
  ('Farm Fresh Brown Eggs (12 pcs)', '30 pcs',             7.50, 30, 'https://picsum.photos/seed/fc-brown-eggs-30/300/300'),
  ('White Eggs (6 pcs)',             '6 pcs',              0.00, 90, 'https://picsum.photos/seed/fc-white-eggs-6/300/300'),
  ('White Eggs (6 pcs)',             '12 pcs',             2.00, 60, 'https://picsum.photos/seed/fc-white-eggs-12/300/300'),
  ('Tender Coconut',                 'Single',             0.00, 40, 'https://picsum.photos/seed/fc-coconut-single/300/300'),
  ('Tender Coconut',                 'Pack of 3',          7.00, 20, 'https://picsum.photos/seed/fc-coconut-pack3/300/300'),
  ('Organic Carrots (1kg)',          '500g',              -1.50, 50, 'https://picsum.photos/seed/fc-carrots-500g/300/300'),
  ('Organic Carrots (1kg)',          '1kg',                0.00, 60, 'https://picsum.photos/seed/fc-carrots-1kg/300/300'),
  ('Organic Carrots (1kg)',          '2kg',                2.50, 25, 'https://picsum.photos/seed/fc-carrots-2kg/300/300'),
  ('Broccoli Head',                  'Single Head',        0.00, 35, 'https://picsum.photos/seed/fc-broccoli-single/300/300'),
  ('Broccoli Head',                  'Pack of 2',          1.80, 20, 'https://picsum.photos/seed/fc-broccoli-pack2/300/300'),
  ('FreshCart Logo Tee - Green',     'Small',              0.00, 25, 'https://picsum.photos/seed/fc-tee-green-s/300/300'),
  ('FreshCart Logo Tee - Green',     'Medium',             0.00, 30, 'https://picsum.photos/seed/fc-tee-green-m/300/300'),
  ('FreshCart Logo Tee - Green',     'Large',              2.00, 25, 'https://picsum.photos/seed/fc-tee-green-l/300/300'),
  ('FreshCart Logo Tee - Green',     'XL',                 3.00, 15, 'https://picsum.photos/seed/fc-tee-green-xl/300/300'),
  ('Roasted Almonds (250g)',         '250g',               0.00, 40, 'https://picsum.photos/seed/fc-almonds-250g/300/300'),
  ('Roasted Almonds (250g)',         '500g',               5.50, 25, 'https://picsum.photos/seed/fc-almonds-500g/300/300'),
  ('Roasted Almonds (250g)',         '1kg',               10.00, 15, 'https://picsum.photos/seed/fc-almonds-1kg/300/300'),
  -- New catalog
  ('Whole Milk',                    '500 ml',            -20.00,  70, 'https://picsum.photos/seed/fc-milk-500ml/300/300'),
  ('Whole Milk',                    '1 Litre',             0.00,  90, 'https://picsum.photos/seed/fc-milk-1l/300/300'),
  ('Whole Milk',                    '2 Litre',            35.00,  40, 'https://picsum.photos/seed/fc-milk-2l/300/300'),
  ('Greek Yogurt',                  '200g',                0.00,  50, 'https://picsum.photos/seed/fc-yogurt-200g/300/300'),
  ('Greek Yogurt',                  '500g',               25.00,  30, 'https://picsum.photos/seed/fc-yogurt-500g/300/300'),
  ('Paneer',                        '200g',                0.00,  35, 'https://picsum.photos/seed/fc-paneer-200g/300/300'),
  ('Paneer',                        '500g',               55.00,  20, 'https://picsum.photos/seed/fc-paneer-500g/300/300'),
  ('Whole Wheat Bread',             '400g',                0.00,  60, 'https://picsum.photos/seed/fc-bread-400g/300/300'),
  ('Whole Wheat Bread',             '800g',               25.00,  35, 'https://picsum.photos/seed/fc-bread-800g/300/300'),
  ('Butter Croissant',              'Pack of 2',           0.00,  40, 'https://picsum.photos/seed/fc-croissant-2/300/300'),
  ('Butter Croissant',              'Pack of 4',          45.00,  25, 'https://picsum.photos/seed/fc-croissant-4/300/300'),
  ('Chocolate Muffin',              'Single',            -30.00,  45, 'https://picsum.photos/seed/fc-muffin-single/300/300'),
  ('Chocolate Muffin',              'Pack of 4',           0.00,  30, 'https://picsum.photos/seed/fc-muffin-4/300/300'),
  ('Organic Bananas',               'Half Dozen',        -20.00, 100, 'https://picsum.photos/seed/fc-bananas-half-dozen/300/300'),
  ('Organic Bananas',               'Dozen',               0.00, 100, 'https://picsum.photos/seed/fc-bananas-dozen/300/300'),
  ('Fresh Avocado',                 'Single',            -45.00,  50, 'https://picsum.photos/seed/fc-avocado-single/300/300'),
  ('Fresh Avocado',                 'Pack of 3',           0.00,  40, 'https://picsum.photos/seed/fc-avocado-pack3/300/300'),
  ('Red Apples',                    '1kg',                 0.00,  65, 'https://picsum.photos/seed/fc-apples-1kg/300/300'),
  ('Red Apples',                    '2kg',                80.00,  45, 'https://picsum.photos/seed/fc-apples-2kg/300/300'),
  ('Cold Brew Coffee',              '250ml',               0.00,  30, 'https://picsum.photos/seed/fc-coldbrew-250ml/300/300'),
  ('Cold Brew Coffee',              '500ml',              90.00,  20, 'https://picsum.photos/seed/fc-coldbrew-500ml/300/300'),
  ('Orange Juice',                  '500ml',             -30.00,  40, 'https://picsum.photos/seed/fc-oj-500ml/300/300'),
  ('Orange Juice',                  '1 Litre',             0.00,  30, 'https://picsum.photos/seed/fc-oj-1l/300/300'),
  ('Herbal Shampoo',                '200ml',               0.00,  35, 'https://picsum.photos/seed/fc-shampoo-200ml/300/300'),
  ('Herbal Shampoo',                '400ml',             110.00,  25, 'https://picsum.photos/seed/fc-shampoo-400ml/300/300'),
  ('Aloe Vera Face Wash',           '100ml',               0.00,  30, 'https://picsum.photos/seed/fc-facewash-100ml/300/300'),
  ('Aloe Vera Face Wash',           '200ml',              80.00,  25, 'https://picsum.photos/seed/fc-facewash-200ml/300/300'),
  ('Dish Soap',                     '500ml',               0.00,  55, 'https://picsum.photos/seed/fc-dishsoap-500ml/300/300'),
  ('Dish Soap',                     '1 Litre',            45.00,  45, 'https://picsum.photos/seed/fc-dishsoap-1l/300/300'),
  ('Multi-Surface Cleaner',         '500ml',               0.00,  45, 'https://picsum.photos/seed/fc-cleaner-500ml/300/300'),
  ('Multi-Surface Cleaner',         '1 Litre',            70.00,  40, 'https://picsum.photos/seed/fc-cleaner-1l/300/300'),
  ('Frozen Peas',                   '500g',                0.00,  70, 'https://picsum.photos/seed/fc-peas-500g/300/300'),
  ('Frozen Peas',                   '1kg',                40.00,  60, 'https://picsum.photos/seed/fc-peas-1kg/300/300'),
  ('Veggie Nuggets',                '400g',                0.00,  40, 'https://picsum.photos/seed/fc-nuggets-400g/300/300'),
  ('Veggie Nuggets',                '800g',              110.00,  30, 'https://picsum.photos/seed/fc-nuggets-800g/300/300'),
  ('Spinach Bunch',                 '250g',               -8.00,  50, 'https://picsum.photos/seed/fc-spinach-250g/300/300'),
  ('Spinach Bunch',                 '500g',                0.00,  40, 'https://picsum.photos/seed/fc-spinach-500g/300/300'),
  ('Potato Chips',                  'Classic Salted',      0.00,  80, 'https://picsum.photos/seed/fc-chips-classic/300/300'),
  ('Potato Chips',                  'Masala',              2.00,  70, 'https://picsum.photos/seed/fc-chips-masala/300/300')
) AS v(product_name, variant_name, price_adjustment, stock_quantity, image_url)
JOIN products p ON p.name = v.product_name
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.name = v.variant_name
);

COMMIT;

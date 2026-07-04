-- Replaces the random picsum.photos placeholders (from 00006/00007) with real,
-- keyword-matched photos via loremflickr.com (each URL's ?lock=N pins a specific
-- deterministic photo instead of a new random one per page load). Also fills in
-- the handful of pre-existing variants that never had an image at all (they
-- predate the per-variant-image feature). Does not touch the 4 pre-existing
-- products' own images (Avocado, Organic Bananas, Whole Milk, Whole Wheat Bread) --
-- those were already real photos uploaded via the admin UI. Idempotent (plain
-- UPDATE, safe to re-run; it will just reassign the same URLs).

BEGIN;

-- Product-level images (only the 16 products this migration chain introduced)
UPDATE products p
SET image_url = v.image_url
FROM (VALUES
  ('Aloe Vera Face Wash',    'https://loremflickr.com/600/600/facewash?lock=201'),
  ('Butter Croissant',       'https://loremflickr.com/600/600/croissant?lock=202'),
  ('Chocolate Muffin',       'https://loremflickr.com/600/600/muffin?lock=203'),
  ('Cold Brew Coffee',       'https://loremflickr.com/600/600/coffee?lock=204'),
  ('Dish Soap',              'https://loremflickr.com/600/600/dishsoap?lock=205'),
  ('Fresh Avocado',          'https://loremflickr.com/600/600/avocados?lock=206'),
  ('Frozen Peas',            'https://loremflickr.com/600/600/peas?lock=207'),
  ('Greek Yogurt',           'https://loremflickr.com/600/600/yogurt?lock=208'),
  ('Herbal Shampoo',         'https://loremflickr.com/600/600/shampoo?lock=209'),
  ('Multi-Surface Cleaner',  'https://loremflickr.com/600/600/cleaner?lock=210'),
  ('Orange Juice',           'https://loremflickr.com/600/600/orangejuice?lock=211'),
  ('Paneer',                 'https://loremflickr.com/600/600/paneer?lock=212'),
  ('Potato Chips',           'https://loremflickr.com/600/600/chips?lock=213'),
  ('Red Apples',             'https://loremflickr.com/600/600/apple?lock=214'),
  ('Spinach Bunch',          'https://loremflickr.com/600/600/spinach?lock=215'),
  ('Veggie Nuggets',         'https://loremflickr.com/600/600/nuggets?lock=216')
) AS v(name, image_url)
WHERE p.name = v.name;

-- Variant-level images: every variant this migration chain added (previously
-- picsum) plus the pre-existing variants that had none (Avocado "500 kg ",
-- Organic Bananas "gram", Whole Milk "500 ml"/"1 L", Whole Wheat Bread "1 pack").
UPDATE product_variants pv
SET image_url = v.image_url
FROM (VALUES
  ('Aloe Vera Face Wash',   '100ml',          'https://loremflickr.com/300/300/facewash?lock=301'),
  ('Aloe Vera Face Wash',   '200ml',          'https://loremflickr.com/300/300/facewash?lock=302'),
  ('Butter Croissant',      'Pack of 4',      'https://loremflickr.com/300/300/croissant?lock=303'),
  ('Butter Croissant',      'Pack of 2',      'https://loremflickr.com/300/300/croissant?lock=304'),
  ('Chocolate Muffin',      'Pack of 4',      'https://loremflickr.com/300/300/muffin?lock=305'),
  ('Chocolate Muffin',      'Single',         'https://loremflickr.com/300/300/muffin?lock=306'),
  ('Cold Brew Coffee',      '500ml',          'https://loremflickr.com/300/300/coffee?lock=307'),
  ('Cold Brew Coffee',      '250ml',          'https://loremflickr.com/300/300/coffee?lock=308'),
  ('Dish Soap',             '500ml',          'https://loremflickr.com/300/300/dishsoap?lock=309'),
  ('Dish Soap',             '1 Litre',        'https://loremflickr.com/300/300/dishsoap?lock=310'),
  ('Fresh Avocado',         'Single',         'https://loremflickr.com/300/300/avocados?lock=311'),
  ('Fresh Avocado',         'Pack of 3',      'https://loremflickr.com/300/300/avocados?lock=312'),
  ('Frozen Peas',           '1kg',            'https://loremflickr.com/300/300/peas?lock=313'),
  ('Frozen Peas',           '500g',           'https://loremflickr.com/300/300/peas?lock=314'),
  ('Frozen Peas',           '2kg',            'https://loremflickr.com/300/300/peas?lock=315'),
  ('Greek Yogurt',          '200g',           'https://loremflickr.com/300/300/yogurt?lock=316'),
  ('Greek Yogurt',          '500g',           'https://loremflickr.com/300/300/yogurt?lock=317'),
  ('Greek Yogurt',          '1kg',            'https://loremflickr.com/300/300/yogurt?lock=318'),
  ('Herbal Shampoo',        '400ml',          'https://loremflickr.com/300/300/shampoo?lock=319'),
  ('Herbal Shampoo',        '200ml',          'https://loremflickr.com/300/300/shampoo?lock=320'),
  ('Multi-Surface Cleaner', '1 Litre',        'https://loremflickr.com/300/300/cleaner?lock=321'),
  ('Multi-Surface Cleaner', '500ml',          'https://loremflickr.com/300/300/cleaner?lock=322'),
  ('Orange Juice',          '500ml',          'https://loremflickr.com/300/300/orangejuice?lock=323'),
  ('Orange Juice',          '1 Litre',        'https://loremflickr.com/300/300/orangejuice?lock=324'),
  ('Organic Bananas',       'Half Dozen',     'https://loremflickr.com/300/300/banana?lock=325'),
  ('Organic Bananas',       'Dozen',          'https://loremflickr.com/300/300/banana?lock=326'),
  ('Organic Bananas',       'gram',           'https://loremflickr.com/300/300/banana?lock=327'),
  ('Paneer',                '500g',           'https://loremflickr.com/300/300/paneer?lock=328'),
  ('Paneer',                '200g',           'https://loremflickr.com/300/300/paneer?lock=329'),
  ('Potato Chips',          'Masala',         'https://loremflickr.com/300/300/chips?lock=330'),
  ('Potato Chips',          'Classic Salted', 'https://loremflickr.com/300/300/chips?lock=331'),
  ('Red Apples',            '1kg',            'https://loremflickr.com/300/300/apple?lock=332'),
  ('Red Apples',            '2kg',            'https://loremflickr.com/300/300/apple?lock=333'),
  ('Red Apples',            '500g',           'https://loremflickr.com/300/300/apple?lock=334'),
  ('Spinach Bunch',         '250g',           'https://loremflickr.com/300/300/spinach?lock=335'),
  ('Spinach Bunch',         '500g',           'https://loremflickr.com/300/300/spinach?lock=336'),
  ('Veggie Nuggets',        '800g',           'https://loremflickr.com/300/300/nuggets?lock=337'),
  ('Veggie Nuggets',        '400g',           'https://loremflickr.com/300/300/nuggets?lock=338'),
  ('Whole Milk',            '1 Litre',        'https://loremflickr.com/300/300/milk?lock=339'),
  ('Whole Milk',            '2 Litre',        'https://loremflickr.com/300/300/milk?lock=340'),
  ('Whole Milk',            '500 ml',         'https://loremflickr.com/300/300/milk?lock=341'),
  ('Whole Milk',            '1 L',            'https://loremflickr.com/300/300/milk?lock=342'),
  ('Whole Wheat Bread',     '800g',           'https://loremflickr.com/300/300/bread?lock=343'),
  ('Whole Wheat Bread',     '400g',           'https://loremflickr.com/300/300/bread?lock=344'),
  ('Whole Wheat Bread',     '1 pack',         'https://loremflickr.com/300/300/bread?lock=345'),
  ('Avocado',                '500 kg',         'https://loremflickr.com/300/300/avocados?lock=346')
) AS v(product_name, variant_name, image_url)
JOIN products p ON p.name = v.product_name
WHERE pv.product_id = p.id AND trim(pv.name) = trim(v.variant_name);

COMMIT;

-- 00006 skipped one planned variant (Whole Milk "500 ml") because a variant with
-- that exact name already existed live before the migration ran, leaving the
-- catalog at 43 variants instead of the intended 45+. Tops it up with a few more
-- distinct, image-bearing variants on existing products. Idempotent, safe to re-run.

BEGIN;

INSERT INTO product_variants (product_id, name, price_adjustment, stock_quantity, image_url)
SELECT p.id, v.variant_name, v.price_adjustment, v.stock_quantity, v.image_url
FROM (VALUES
  ('Greek Yogurt', '1kg',  55.00, 15, 'https://picsum.photos/seed/fc-yogurt-1kg/300/300'),
  ('Red Apples',   '500g', -40.00, 60, 'https://picsum.photos/seed/fc-apples-500g/300/300'),
  ('Frozen Peas',  '2kg',  75.00, 35, 'https://picsum.photos/seed/fc-peas-2kg/300/300')
) AS v(product_name, variant_name, price_adjustment, stock_quantity, image_url)
JOIN products p ON p.name = v.product_name
WHERE NOT EXISTS (
  SELECT 1 FROM product_variants pv WHERE pv.product_id = p.id AND pv.name = v.variant_name
);

COMMIT;

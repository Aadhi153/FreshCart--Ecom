-- Whole Milk has two variants that both mean "1 litre": a pre-existing live
-- "1 L" row (predating the 00006 migration chain) and the "1 Litre" variant
-- seeded by 00006, priced differently (1 L => +80.00, 1 Litre => +0.00).
-- order_items only references product_id, not variant_id, so it's safe to
-- delete the stray duplicate outright. Idempotent, safe to re-run.

BEGIN;

DELETE FROM product_variants pv
USING products p
WHERE pv.product_id = p.id
  AND p.name = 'Whole Milk'
  AND pv.name = '1 L'
  AND EXISTS (
    SELECT 1 FROM product_variants pv2
    WHERE pv2.product_id = p.id AND pv2.name = '1 Litre'
  );

COMMIT;

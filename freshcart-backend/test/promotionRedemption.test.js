// Integration test proving redeem_promotion() (supabase/migrations/00019) closes
// the usage-limit race: two concurrent redemption attempts against a promotion
// with usage_limit_total: 1 must yield exactly one successful redemption, never
// two. This can only be proven against a real Postgres connection — a mocked
// client wouldn't exercise the SELECT ... FOR UPDATE row lock at all.
//
// Requires DATABASE_URL (see freshcart-backend/.env). Skipped automatically if
// it isn't set, so this doesn't break `npm test` in environments without DB access.
const test = require('node:test');
const assert = require('node:assert/strict');
const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;

test('redeem_promotion serializes concurrent redemptions under usage_limit_total', { skip: !DATABASE_URL && 'DATABASE_URL not set' }, async () => {
  const setupClient = new Client({ connectionString: DATABASE_URL });
  await setupClient.connect();

  const promoCode = `TESTRACE${Date.now()}`;
  let promotionId;
  try {
    const { rows } = await setupClient.query(
      `INSERT INTO public.promotions (code, name, requires_code, discount_type, discount_value, applicable_scope, usage_limit_total)
       VALUES ($1, 'Race test promo', true, 'flat', 1, 'cart', 1)
       RETURNING id`,
      [promoCode]
    );
    promotionId = rows[0].id;

    const clientA = new Client({ connectionString: DATABASE_URL });
    const clientB = new Client({ connectionString: DATABASE_URL });
    await Promise.all([clientA.connect(), clientB.connect()]);

    try {
      const [resA, resB] = await Promise.all([
        clientA.query('SELECT redeem_promotion($1, NULL, 1) AS id', [promotionId]),
        clientB.query('SELECT redeem_promotion($1, NULL, 1) AS id', [promotionId]),
      ]);

      const ids = [resA.rows[0].id, resB.rows[0].id];
      const succeeded = ids.filter((id) => id !== null);
      assert.equal(succeeded.length, 1, `expected exactly one redemption to succeed, got ${succeeded.length}`);

      const { rows: redemptionRows } = await setupClient.query(
        'SELECT id FROM public.promotion_redemptions WHERE promotion_id = $1',
        [promotionId]
      );
      assert.equal(redemptionRows.length, 1, `expected exactly one promotion_redemptions row, got ${redemptionRows.length}`);
    } finally {
      await clientA.end();
      await clientB.end();
    }
  } finally {
    if (promotionId) {
      await setupClient.query('DELETE FROM public.promotion_redemptions WHERE promotion_id = $1', [promotionId]);
      await setupClient.query('DELETE FROM public.promotions WHERE id = $1', [promotionId]);
    }
    await setupClient.end();
  }
});

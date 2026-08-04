const test = require('node:test');
const assert = require('node:assert/strict');
const { selectBestPromotion, computeDiscountForCart, meetsMinimumOrder, bogoFreeItem } = require('../lib/promotions');

const cartItems = [{ product_id: 'p1', category_id: 'c1', quantity: 1, price: 500 }];
const cartSubtotal = 500;

test('selectBestPromotion never stacks — the larger of a coupon and an auto-offer wins alone', () => {
  const coupon = { id: 'coupon-1', name: 'Small Coupon', discount_type: 'flat', discount_value: 20, applicable_scope: 'cart' };
  const autoOffer = { id: 'offer-1', name: 'Big Auto Offer', discount_type: 'percentage', discount_value: 20, applicable_scope: 'cart' };

  const couponAmount = computeDiscountForCart(coupon, cartItems, cartSubtotal); // 20
  const offerAmount = computeDiscountForCart(autoOffer, cartItems, cartSubtotal); // 100

  const result = selectBestPromotion({ coupon, autoOffers: [autoOffer], cartItems, cartSubtotal });

  assert.equal(result.id, 'offer-1');
  assert.equal(result.amount, offerAmount);
  // The winning amount must equal the single larger discount, never the sum of both.
  assert.notEqual(result.amount, couponAmount + offerAmount);
});

test('selectBestPromotion keeps the coupon on a tie', () => {
  const coupon = { id: 'coupon-1', name: 'Coupon', discount_type: 'flat', discount_value: 50, applicable_scope: 'cart' };
  const autoOffer = { id: 'offer-1', name: 'Offer', discount_type: 'flat', discount_value: 50, applicable_scope: 'cart' };

  const result = selectBestPromotion({ coupon, autoOffers: [autoOffer], cartItems, cartSubtotal });

  assert.equal(result.id, 'coupon-1');
});

test('selectBestPromotion returns null when nothing is eligible', () => {
  const result = selectBestPromotion({ coupon: null, autoOffers: [], cartItems, cartSubtotal });
  assert.equal(result, null);
});

// 1.1 — BOGO is converted to a real ₹ amount (price of the cheapest matching
// item) before being compared against other discount types, in both
// directions, so it's never ranked incorrectly for being "non-numeric."
test('selectBestPromotion ranks BOGO correctly against a flat coupon — BOGO wins when its item value is larger', () => {
  const expensiveItemCart = [{ product_id: 'p1', category_id: 'c1', quantity: 1, price: 200 }];
  const coupon = { id: 'coupon-1', name: 'Small Coupon', discount_type: 'flat', discount_value: 20, applicable_scope: 'cart' };
  const bogoOffer = { id: 'offer-1', name: 'BOGO Offer', discount_type: 'bogo', discount_value: 0, applicable_scope: 'cart' };

  const result = selectBestPromotion({ coupon, autoOffers: [bogoOffer], cartItems: expensiveItemCart, cartSubtotal: 200 });

  assert.equal(result.id, 'offer-1');
  assert.equal(result.amount, 200); // the free item's price, not a raw "0" or non-numeric value
});

test('selectBestPromotion ranks BOGO correctly against a flat coupon — coupon wins when BOGO\'s item value is smaller', () => {
  // Mixed cart so the flat coupon isn't capped down to the cheap item's price —
  // BOGO only frees the cheapest item (5), while the flat coupon discounts 50
  // off a subtotal well above that.
  const mixedCart = [
    { product_id: 'p1', category_id: 'c1', quantity: 1, price: 5 },
    { product_id: 'p2', category_id: 'c1', quantity: 1, price: 100 },
  ];
  const coupon = { id: 'coupon-1', name: 'Big Coupon', discount_type: 'flat', discount_value: 50, applicable_scope: 'cart' };
  const bogoOffer = { id: 'offer-1', name: 'BOGO Offer', discount_type: 'bogo', discount_value: 0, applicable_scope: 'cart' };

  const result = selectBestPromotion({ coupon, autoOffers: [bogoOffer], cartItems: mixedCart, cartSubtotal: 105 });

  assert.equal(result.id, 'coupon-1');
  assert.equal(result.amount, 50);
});

// 1.2 — min_order_value eligibility is decided once, against the pre-discount
// subtotal, and never re-checked after a discount is subtracted (a discount
// pushing the order below its own threshold must not retroactively disqualify it).
test('meetsMinimumOrder checks against the pre-discount subtotal, not a post-discount total', () => {
  const promotion = { min_order_value: 500 };
  const preDiscountSubtotal = 500;
  const discountAmount = 100;
  const postDiscountTotal = preDiscountSubtotal - discountAmount; // 400 — below the threshold

  // The check is satisfied using the pre-discount figure...
  assert.equal(meetsMinimumOrder(promotion, preDiscountSubtotal), true);
  // ...and would (incorrectly) fail if a post-discount figure were ever passed instead —
  // proving the two are not interchangeable and callers must use the pre-discount value.
  assert.equal(meetsMinimumOrder(promotion, postDiscountTotal), false);
});

test('meetsMinimumOrder treats a missing min_order_value as "no minimum"', () => {
  assert.equal(meetsMinimumOrder({ min_order_value: null }, 0), true);
});

// 1.5 — naming which item a BOGO promotion made free.
test('bogoFreeItem returns the cheapest matching item', () => {
  const promotion = { applicable_scope: 'cart' };
  const items = [
    { product_id: 'p1', name: 'Bananas', price: 50, quantity: 1 },
    { product_id: 'p2', name: 'Milk', price: 20, quantity: 1 },
  ];
  assert.equal(bogoFreeItem(promotion, items).name, 'Milk');
});

test('bogoFreeItem returns null when nothing in the cart matches the promotion scope', () => {
  const promotion = { applicable_scope: 'product', applicable_ids: ['does-not-exist'] };
  const items = [{ product_id: 'p1', name: 'Bananas', price: 50, quantity: 1 }];
  assert.equal(bogoFreeItem(promotion, items), null);
});

// 2.1 — free_shipping never discounts items; its numeric value (for ranking and for
// the amount actually redeemed) is the delivery fee it waives, or 0 if the cart
// already qualifies for free delivery on its own.
test('computeDiscountForCart values free_shipping as the delivery fee it waives, below the free-delivery threshold', () => {
  const promotion = { discount_type: 'free_shipping', applicable_scope: 'cart' };
  const amount = computeDiscountForCart(promotion, cartItems, 100);
  assert.equal(amount, 40);
});

test('computeDiscountForCart values free_shipping at 0 once the cart already qualifies for free delivery', () => {
  const promotion = { discount_type: 'free_shipping', applicable_scope: 'cart' };
  const amount = computeDiscountForCart(promotion, cartItems, 500);
  assert.equal(amount, 0);
});

test('selectBestPromotion carries discount_type through so callers can branch on free_shipping', () => {
  const freeShippingOffer = { id: 'offer-1', name: 'Free Ship Friday', discount_type: 'free_shipping', applicable_scope: 'cart' };
  const result = selectBestPromotion({ coupon: null, autoOffers: [freeShippingOffer], cartItems, cartSubtotal: 100 });
  assert.equal(result.discount_type, 'free_shipping');
  assert.equal(result.amount, 40);
});

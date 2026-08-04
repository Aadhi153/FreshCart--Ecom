'use client';

import { useEffect, useRef, useState } from 'react';
import type { ActivePromotion } from '@freshcart/types';
import { getActivePromotions, validateCoupon } from './api';
import { usePromotionStore, type CartItem } from './store';
import { bestAutoOffer, findBogoFreeItem } from './promotionMath';

// Shared by the cart sidebar, full cart page, and checkout page so all three read and
// write the same applied-promotion state (fixes the bug where a coupon applied on one
// page silently vanished on another). Each caller passes in its own view of the cart
// (items + subtotal); this hook auto-applies the best matching offer as the cart
// changes, and exposes a coupon-code apply/remove flow backed by /api/coupons/validate.
export function usePromotion(items: CartItem[], subtotal: number) {
  const { applied, setApplied, clear, hasHydrated } = usePromotionStore();
  const [activeOffers, setActiveOffers] = useState<ActivePromotion[]>([]);
  const [couponInput, setCouponInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getActivePromotions().then(setActiveOffers);
  }, []);

  // Auto-apply the best matching no-code offer whenever the cart changes, but never
  // override a promotion the shopper explicitly applied via a coupon code.
  const itemsKey = items.map((i) => `${i.productId}:${i.quantity}`).join(',');
  const prevAutoRef = useRef<string | null>(null);
  useEffect(() => {
    if (!hasHydrated) return;
    if (applied?.source === 'coupon') return;

    const best = subtotal > 0 ? bestAutoOffer(activeOffers, items, subtotal) : null;
    if (best) {
      const next = {
        id: best.promotion.id,
        name: best.promotion.name,
        code: null,
        discountAmount: best.amount,
        source: 'auto' as const,
        discountType: best.promotion.discount_type,
        discountValue: best.promotion.discount_value,
        freeItemName: best.promotion.discount_type === 'bogo'
          ? findBogoFreeItem(best.promotion, items)?.name
          : best.promotion.discount_type === 'gift_with_purchase'
            ? best.promotion.gift_product?.name
            : undefined,
      };
      if (prevAutoRef.current !== `${next.id}:${next.discountAmount}`) {
        prevAutoRef.current = `${next.id}:${next.discountAmount}`;
        setApplied(next);
      }
    } else if (applied?.source === 'auto') {
      prevAutoRef.current = null;
      clear();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasHydrated, activeOffers, itemsKey, subtotal]);

  const applyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim();
    if (!code) return;
    setValidating(true);
    setError('');
    try {
      const result = await validateCoupon({
        code,
        cart_items: items.map((item) => ({ product_id: item.productId, quantity: item.quantity })),
        cart_subtotal: subtotal,
      });
      if (!result.valid || !result.discount_amount || !result.promotion_id || !result.promotion_name) {
        setError(result.error_message || 'This coupon could not be applied.');
        return;
      }
      // Largest wins — a coupon only replaces an already-applied auto-offer if it's bigger.
      if (applied && applied.source === 'auto' && applied.discountAmount >= result.discount_amount) {
        setError(`Your current offer ("${applied.name}") already gives you a bigger discount.`);
        return;
      }
      setApplied({
        id: result.promotion_id,
        name: result.promotion_name,
        code: code.toUpperCase(),
        discountAmount: result.discount_amount,
        source: 'coupon',
        discountType: result.discount_type ?? 'flat',
        discountValue: result.discount_value ?? result.discount_amount,
        freeItemName: result.free_item_name ?? result.gift_item_name,
      });
      setCouponInput('');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to validate coupon.');
    } finally {
      setValidating(false);
    }
  };

  const removeCoupon = () => {
    setError('');
    clear();
  };

  return { applied, activeOffers, couponInput, setCouponInput, validating, error, applyCoupon, removeCoupon };
}

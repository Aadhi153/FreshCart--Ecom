export interface PromotionTierFormData {
  min_order_value: string;
  discount_type: 'flat' | 'percentage';
  discount_value: string;
}

export interface PromotionFormData {
  name: string;
  description: string;
  is_public: boolean;
  requires_code: boolean;
  code: string;
  discount_type: 'percentage' | 'flat' | 'bogo' | 'free_shipping' | 'gift_with_purchase';
  discount_value: number;
  min_order_value: string;
  max_discount_amount: string;
  applicable_scope: 'cart' | 'category' | 'product';
  applicable_ids: string[];
  usage_limit_total: string;
  usage_limit_per_user: string;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  // Eligible only for customers with zero prior non-cancelled orders.
  first_order_only: boolean;
  target_segment: 'all' | 'vip' | 'referral' | 'inactive_30_days';
  // When is_tiered, tiers[] drives the discount instead of discount_type/discount_value/
  // min_order_value above — a UI-only mode switch, not a server field.
  is_tiered: boolean;
  tiers: PromotionTierFormData[];
  recurrence_enabled: boolean;
  recurrence_day_of_week: string; // '0'-'6', Sunday-first — kept as a string for the Dropdown
  // Required when discount_type === 'gift_with_purchase'.
  gift_product_id: string;
}

export const EMPTY_PROMOTION_FORM: PromotionFormData = {
  name: '',
  description: '',
  is_public: false,
  requires_code: true,
  code: '',
  discount_type: 'percentage',
  discount_value: 0,
  min_order_value: '',
  max_discount_amount: '',
  applicable_scope: 'cart',
  applicable_ids: [],
  usage_limit_total: '',
  usage_limit_per_user: '',
  valid_from: new Date().toISOString().slice(0, 10),
  valid_until: '',
  is_active: true,
  first_order_only: false,
  target_segment: 'all',
  is_tiered: false,
  tiers: [],
  recurrence_enabled: false,
  recurrence_day_of_week: '0',
  gift_product_id: '',
};

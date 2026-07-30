export interface PromotionFormData {
  name: string;
  requires_code: boolean;
  code: string;
  discount_type: 'percentage' | 'flat' | 'bogo';
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
}

export const EMPTY_PROMOTION_FORM: PromotionFormData = {
  name: '',
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
};

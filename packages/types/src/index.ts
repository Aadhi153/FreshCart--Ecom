import { z } from 'zod';

// ── Products ──────────────────────────────────────────────────────────────────
export const ProductVariantSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  name: z.string().min(1),
  price_adjustment: z.number().default(0),
  stock_quantity: z.number().int().min(0).default(0),
  image_url: z.string().optional().nullable(),
});
export type ProductVariant = z.infer<typeof ProductVariantSchema>;

export const CategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  image_url: z.string().optional().nullable(),
  display_order: z.number().int().optional(),
});
export type Category = z.infer<typeof CategorySchema>;

// ── Promotions ────────────────────────────────────────────────────────────────
// A promotion is either a coupon (requires_code=true, shopper must type `code`) or an
// auto-applied offer (requires_code=false, code is always null). Both can be scoped to
// the whole cart, a category, or a specific set of products via applicable_ids/applicable_scope
// — coupons are not restricted to cart-wide, despite requires_code implying "special".
export const DiscountTypeSchema = z.enum(['percentage', 'flat', 'bogo', 'free_shipping', 'gift_with_purchase']);
export type DiscountType = z.infer<typeof DiscountTypeSchema>;

// One rung of a promotion's tiers ladder, e.g. "10% off ₹500+". When a promotion has a
// non-empty tiers array, computeDiscountForCart uses only the highest tier whose
// min_order_value the cart subtotal meets — the top-level discount_type/discount_value
// are ignored. Tiers deliberately don't support bogo/free_shipping/gift_with_purchase.
export const PromotionTierSchema = z.object({
  min_order_value: z.number().min(0),
  discount_type: z.enum(['flat', 'percentage']),
  discount_value: z.number().min(0),
});
export type PromotionTier = z.infer<typeof PromotionTierSchema>;

// Weekly recurrence only, matching the product's own example shape — the promotion is
// only "within validity" on the matching weekday, checked live (no scheduler exists in
// this repo; see isWithinValidity in freshcart-backend/lib/promotions.js).
export const PromotionRecurrenceSchema = z.object({
  day_of_week: z.number().int().min(0).max(6), // 0 = Sunday, matching Date#getDay()
});
export type PromotionRecurrence = z.infer<typeof PromotionRecurrenceSchema>;

export const PromotionSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, "Code is required").transform(v => v.toUpperCase()).optional().nullable(),
  name: z.string().min(1, "Name is required"),
  requires_code: z.boolean().default(true),
  discount_type: DiscountTypeSchema,
  discount_value: z.number().min(0, "Discount value must be zero or positive"),
  min_order_value: z.number().min(0).optional().nullable(),
  max_discount_amount: z.number().positive().optional().nullable(),
  applicable_scope: z.enum(['cart', 'category', 'product']).default('cart'),
  applicable_ids: z.array(z.string().uuid()).optional().nullable(),
  usage_limit_total: z.number().int().positive().optional().nullable(),
  usage_limit_per_user: z.number().int().positive().optional().nullable(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  // Customer-facing copy for the /offers page and homepage banner, e.g. "10% off all
  // dairy this weekend." Optional — /offers falls back to an auto-generated summary
  // (discount + minimum spend) when it's blank.
  description: z.string().optional().nullable(),
  // Whether a coupon is listed on /offers and eligible for the homepage banner.
  // Auto-offers (requires_code=false) are always listed regardless of this flag —
  // they auto-apply with no code to keep secret, so there's nothing to gate. Coupons
  // default to unlisted so a targeted/one-off code isn't accidentally broadcast to
  // every shopper the moment it's created.
  is_public: z.boolean().default(false),
  // Eligible only for customers with zero prior non-cancelled orders — distinct from
  // usage_limit_per_user, which counts redemptions of this specific promotion.
  first_order_only: z.boolean().default(false),
  // Which customers this promotion is offered to; see getUserEligibilityContext in
  // freshcart-backend/lib/promotions.js for how each segment is resolved.
  target_segment: z.enum(['all', 'vip', 'referral', 'inactive_30_days']).default('all'),
  tiers: z.array(PromotionTierSchema).optional().nullable(),
  recurrence: PromotionRecurrenceSchema.optional().nullable(),
  // Required iff discount_type === 'gift_with_purchase'; the product auto-added to the
  // order at price 0 (never a real, removable cart line — see usePromotion.ts).
  gift_product_id: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
  redemption_count: z.number().int().optional(), // admin list/detail responses only
});
export type Promotion = z.infer<typeof PromotionSchema>;

export const PromotionValidationRequestSchema = z.object({
  code: z.string().min(1),
  cart_items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
  })).min(1),
  cart_subtotal: z.number().min(0),
  user_id: z.string().uuid().optional(), // accepted for shape-compat; the server always uses the authenticated user
});
export type PromotionValidationRequest = z.infer<typeof PromotionValidationRequestSchema>;

export const PromotionValidationResponseSchema = z.object({
  valid: z.boolean(),
  discount_amount: z.number().min(0).optional(),
  promotion_name: z.string().optional(),
  promotion_id: z.string().uuid().optional(),
  discount_type: DiscountTypeSchema.optional(),
  discount_value: z.number().optional(),
  free_item_name: z.string().optional(),
  gift_item_name: z.string().optional(),
  error_message: z.string().optional(),
});
export type PromotionValidationResponse = z.infer<typeof PromotionValidationResponseSchema>;

// The product a gift_with_purchase promotion gives away — denormalized onto
// ActivePromotion/PublicOffer so the client can rank and display the offer (e.g. "Free
// {name} with orders over ₹X") without a second round-trip per offer.
const GiftProductSchema = z.object({ id: z.string().uuid(), name: z.string(), price: z.number() });

export const ActivePromotionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  discount_type: DiscountTypeSchema,
  discount_value: z.number(),
  min_order_value: z.number().nullable().optional(),
  max_discount_amount: z.number().nullable().optional(),
  applicable_scope: z.enum(['cart', 'category', 'product']),
  applicable_ids: z.array(z.string().uuid()).nullable().optional(),
  valid_until: z.string().nullable().optional(),
  gift_product: GiftProductSchema.nullable().optional(),
  tiers: z.array(PromotionTierSchema).nullable().optional(),
  // Deliberately no first_order_only/target_segment/recurrence here — eligibility
  // filtering for those happens server-side before the client ever sees this list
  // (GET /api/promotions/active), so a segment-gated offer's targeting criteria never
  // needs to leak into a payload the client also uses for display.
});
export type ActivePromotion = z.infer<typeof ActivePromotionSchema>;

// Shape returned by GET /api/promotions/offers — the customer-browsable list (the
// /offers page and the homepage banner), as opposed to ActivePromotion which only
// covers auto-offers for the silent auto-apply engine. Includes coupon `code` (only
// public coupons and all active auto-offers are ever returned by that endpoint, so
// there's nothing sensitive about exposing it here).
export const PublicOfferSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable().optional(),
  code: z.string().nullable().optional(),
  requires_code: z.boolean(),
  discount_type: DiscountTypeSchema,
  discount_value: z.number(),
  min_order_value: z.number().nullable().optional(),
  max_discount_amount: z.number().nullable().optional(),
  applicable_scope: z.enum(['cart', 'category', 'product']),
  valid_until: z.string().nullable().optional(),
  gift_product: GiftProductSchema.nullable().optional(),
  tiers: z.array(PromotionTierSchema).nullable().optional(),
  target_segment: z.enum(['all', 'vip', 'referral', 'inactive_30_days']).optional(),
});
export type PublicOffer = z.infer<typeof PublicOfferSchema>;

export const ReviewSchema = z.object({
  id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional().nullable(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional().nullable(),
  created_at: z.string().datetime().optional(),
  profiles: z.any().optional(), // For joined user data
});
export type Review = z.infer<typeof ReviewSchema>;

export const ProductSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.number().min(0, "Price must be positive"),
  compare_at_price: z.number().min(0).optional().nullable(),
  image_url: z.string().url().optional().or(z.literal('')),
  category_id: z.string().uuid().optional().nullable(),
  categories: CategorySchema.optional().nullable(),
  in_stock: z.boolean().default(true),
  stock_quantity: z.number().int().min(0).default(0),
  low_stock_threshold: z.number().int().min(0).optional().nullable(),
  unit: z.string().optional().nullable(),
  // Storefront visibility toggle, independent of `status` (a draft can still be
  // marked visible ahead of publishing; a published product can be hidden without
  // being demoted back to draft).
  is_active: z.boolean().default(true),
  status: z.enum(['draft', 'published']).default('published'),
  created_at: z.string().datetime().optional(),
  variants: z.array(ProductVariantSchema).optional(),
  reviews: z.array(ReviewSchema).optional(),
});
export type Product = z.infer<typeof ProductSchema>;

// ── Orders ────────────────────────────────────────────────────────────────────
export const OrderItemSchema = z.object({
  id: z.string().uuid().optional(),
  order_id: z.string().uuid().optional(),
  product_id: z.string().uuid().optional(),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  price_at_time: z.number().min(0),
  name: z.string().optional(), // Used in web store
  price: z.number().optional(), // Used in web store
  // True for a gift-with-purchase freebie (price_at_time 0) — kept explicit rather than
  // inferred from price, since a flat/percentage discount can also legitimately zero out
  // a cheap item via rounding.
  is_gift: z.boolean().optional(),
});
export type OrderItem = z.infer<typeof OrderItemSchema>;

export const OrderSchema = z.object({
  id: z.string().optional(), // Can be UUID or custom ID from frontend
  user_id: z.string().uuid().nullable().optional(),
  status: z.enum(['placed', 'packed', 'shipped', 'delivered', 'cancelled']).default('placed'),
  total_amount: z.number().min(0),
  created_at: z.string().datetime().optional(),
  order_items: z.array(OrderItemSchema).optional(),
  delivery_slot: z.string().nullable().optional(),
  coupon_code: z.string().nullable().optional(),
  discount_amount: z.number().min(0).optional(),
  promotion_id: z.string().uuid().nullable().optional(),
  delivery_fee: z.number().min(0).optional(),
  delivered_at: z.string().datetime().nullable().optional(),
  payment_method: z.string().nullable().optional(),

  // Frontend specific fields
  total: z.number().optional(),
  createdAt: z.string().optional(),
  items: z.array(OrderItemSchema).optional(),
  deliveryAddress: z.any().optional(), // Can refine later
});
export type Order = z.infer<typeof OrderSchema>;
// Runtime placeholder export to satisfy Vite import (types are erased at runtime)
export const Order = {} as unknown as Order;

// ── Delivery slots ────────────────────────────────────────────────────────────
// Fixed, small set of delivery windows — v1 has no admin UI to configure these.
export const DELIVERY_SLOT_WINDOWS = [
  { id: '08:00-10:00', startHour: 8, endHour: 10, label: '8:00 AM – 10:00 AM' },
  { id: '10:00-12:00', startHour: 10, endHour: 12, label: '10:00 AM – 12:00 PM' },
  { id: '14:00-16:00', startHour: 14, endHour: 16, label: '2:00 PM – 4:00 PM' },
  { id: '16:00-18:00', startHour: 16, endHour: 18, label: '4:00 PM – 6:00 PM' },
  { id: '18:00-20:00', startHour: 18, endHour: 20, label: '6:00 PM – 8:00 PM' },
  { id: '20:00-22:00', startHour: 20, endHour: 22, label: '8:00 PM – 10:00 PM' },
] as const;
export type DeliverySlotWindowId = typeof DELIVERY_SLOT_WINDOWS[number]['id'];
const DELIVERY_SLOT_WINDOW_IDS = DELIVERY_SLOT_WINDOWS.map((w) => w.id) as [string, ...string[]];

export const DELIVERY_SLOT_DAYS_AHEAD = 3; // today + next 2 days
export const DELIVERY_SLOT_BOOKING_BUFFER_MINUTES = 60; // can't book a window starting <60min from now
export const DELIVERY_SLOT_MAX_ORDERS_PER_WINDOW = 20; // simple fixed capacity, no separate table

// Shared between freshcart-web (cart/checkout display) and freshcart-backend (order
// pricing) so the two can't silently drift out of sync — the same reason the delivery
// slot constants above live here rather than being redefined per app.
export const FREE_DELIVERY_THRESHOLD = 299;
export const DELIVERY_FEE = 40;

// Placeholder warehouse location (Bengaluru) — no real store location has been
// configured anywhere in this codebase yet. Update alongside a real admin-configurable
// setting if/when one is built (see RETURN_WINDOW_DAYS above for the same caveat).
export const DELIVERY_ZONE_CENTER = { lat: 12.9716, lng: 77.5946 };
export const DELIVERY_ZONE_RADIUS_KM = 15;

export const DeliverySlotSelectionSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  window: z.enum(DELIVERY_SLOT_WINDOW_IDS),
});
export type DeliverySlotSelection = z.infer<typeof DeliverySlotSelectionSchema>;

export const PlaceOrderPayloadSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1, "Order must contain at least one item"),
  total_amount: z.number().min(0),
  delivery_address: z.any(),
  delivery_slot: DeliverySlotSelectionSchema,
  payment_method: z.string().optional(),
  coupon_code: z.string().optional(),
  idempotency_key: z.string().uuid().optional(),
});
export type PlaceOrderPayload = z.infer<typeof PlaceOrderPayloadSchema>;

// ── Returns ───────────────────────────────────────────────────────────────────
// No admin-configurable settings mechanism exists in this codebase yet (Settings.tsx
// is localStorage-only, unwired to the backend) — follow the same precedent as
// FREE_DELIVERY_THRESHOLD/DELIVERY_FEE above: a shared constant, not a DB-backed setting.
export const RETURN_WINDOW_DAYS = 7;

export const RETURN_REASONS = [
  'Damaged',
  'Wrong item received',
  "Doesn't match description",
  'No longer needed',
  'Other',
] as const;
export const ReturnReasonSchema = z.enum(RETURN_REASONS);
export type ReturnReason = z.infer<typeof ReturnReasonSchema>;

export const RETURN_REQUEST_STATUSES = ['requested', 'approved', 'rejected', 'picked_up', 'completed'] as const;
export const ReturnRequestStatusSchema = z.enum(RETURN_REQUEST_STATUSES);
export type ReturnRequestStatus = z.infer<typeof ReturnRequestStatusSchema>;

export const ReturnRequestSchema = z.object({
  id: z.string().uuid().optional(),
  order_id: z.string().uuid(),
  order_item_id: z.string().uuid(),
  user_id: z.string().uuid().optional().nullable(),
  type: z.enum(['return', 'replace']),
  reason: ReturnReasonSchema,
  refund_method: z.enum(['original_payment', 'store_credit']).optional().nullable(),
  note: z.string().optional().nullable(),
  status: ReturnRequestStatusSchema.default('requested'),
  refund_amount: z.number().min(0).optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
  // Joined data for admin/customer list views
  orders: z.any().optional(),
  order_items: z.any().optional(),
  profiles: z.any().optional(),
});
export type ReturnRequest = z.infer<typeof ReturnRequestSchema>;

export const CreateReturnRequestPayloadSchema = z.object({
  order_id: z.string().uuid(),
  order_item_id: z.string().uuid(),
  type: z.enum(['return', 'replace']),
  reason: ReturnReasonSchema,
  refund_method: z.enum(['original_payment', 'store_credit']).optional(),
  note: z.string().optional(),
}).refine(
  (data) => data.type !== 'return' || !!data.refund_method,
  { message: 'refund_method is required for a return', path: ['refund_method'] }
);
export type CreateReturnRequestPayload = z.infer<typeof CreateReturnRequestPayloadSchema>;

// ── Profiles ──────────────────────────────────────────────────────────────────
export const ProfileSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  full_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.string().optional(),
  is_vip: z.boolean().optional(),
  referral_code: z.string().optional().nullable(),
  referred_by: z.string().uuid().optional().nullable(),
  created_at: z.string().datetime().optional(),
  updated_at: z.string().datetime().optional(),
});
export type Profile = z.infer<typeof ProfileSchema>;

export const AuthRegisterSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  full_name: z.string().optional(),
  phone: z.string().optional(),
});

export const AuthLoginSchema = z.object({
  email: z.string().email("Invalid email format"),
  password: z.string().min(1, "Password is required"),
});

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
// auto-applied offer (requires_code=false, code is always null). Coupons are always
// cart-wide (applicable_scope='cart'); offers can additionally be scoped to a category
// or a specific set of products via applicable_ids.
export const PromotionSchema = z.object({
  id: z.string().uuid().optional(),
  code: z.string().min(1, "Code is required").transform(v => v.toUpperCase()).optional().nullable(),
  name: z.string().min(1, "Name is required"),
  requires_code: z.boolean().default(true),
  discount_type: z.enum(['percentage', 'flat', 'bogo']),
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
  error_message: z.string().optional(),
});
export type PromotionValidationResponse = z.infer<typeof PromotionValidationResponseSchema>;

export const ActivePromotionSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  discount_type: z.enum(['percentage', 'flat', 'bogo']),
  discount_value: z.number(),
  min_order_value: z.number().nullable().optional(),
  max_discount_amount: z.number().nullable().optional(),
  applicable_scope: z.enum(['cart', 'category', 'product']),
  applicable_ids: z.array(z.string().uuid()).nullable().optional(),
  valid_until: z.string().nullable().optional(),
});
export type ActivePromotion = z.infer<typeof ActivePromotionSchema>;

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
});
export type PlaceOrderPayload = z.infer<typeof PlaceOrderPayloadSchema>;

// ── Profiles ──────────────────────────────────────────────────────────────────
export const ProfileSchema = z.object({
  id: z.string().uuid().optional(),
  email: z.string().email().optional(),
  full_name: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone_number: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  role: z.string().optional(),
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

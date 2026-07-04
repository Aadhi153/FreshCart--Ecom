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
  image_url: z.string().url().optional().or(z.literal('')),
  category_id: z.string().uuid().optional().nullable(),
  categories: CategorySchema.optional().nullable(),
  in_stock: z.boolean().default(true),
  stock_quantity: z.number().int().min(0).default(0),
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
  
  // Frontend specific fields
  total: z.number().optional(),
  createdAt: z.string().optional(),
  items: z.array(OrderItemSchema).optional(),
  deliveryAddress: z.any().optional(), // Can refine later
});
export type Order = z.infer<typeof OrderSchema>;
// Runtime placeholder export to satisfy Vite import (types are erased at runtime)
export const Order = {} as unknown as Order;

export const PlaceOrderPayloadSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1),
    price: z.number().min(0),
  })).min(1, "Order must contain at least one item"),
  total_amount: z.number().min(0),
  delivery_address: z.any(),
  delivery_slot: z.string().optional(),
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

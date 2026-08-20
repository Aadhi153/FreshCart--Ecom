const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan('dev'));
const allowedOrigins = [
  'http://localhost:3000',  // Next.js web
  'http://localhost:19006', // Expo mobile
];
if (process.env.ALLOWED_ORIGIN) allowedOrigins.push(process.env.ALLOWED_ORIGIN);
app.use(cors({
  origin(origin, callback) {
    // Vite picks the next free port (5173, 5174, 5175, ...) when one is taken,
    // so allow any localhost/127.0.0.1 port in addition to the fixed list above.
    if (!origin || allowedOrigins.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  exposedHeaders: ['X-Total-Count'],
}));

// Stripe webhook needs the raw request body for signature verification, so its body
// parser must run before the global express.json() parser consumes the stream.
// (Only the parser runs here — the router itself is mounted below, after the rate
// limiter, so payments requests are still rate-limited like everything else.)
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

app.use(express.json({ limit: '10mb' }));

// Global rate limiter (per IP). Raised from 100 to 400 per window — the account
// section (Orders/Wishlist/Reviews) now does several personalized background
// fetches per page (stats, repeat-items, promotions, reviews) plus a 20s order-
// status poll, which was blowing through 100/15min during ordinary browsing.
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 400, standardHeaders: true });
app.use('/api/', limiter);

// ── Routes ───────────────────────────────────────────────────────────────────
const productsRouter   = require('./routes/products');
const ordersRouter     = require('./routes/orders');
const customersRouter  = require('./routes/customers');
const categoriesRouter = require('./routes/categories');
const authRouter       = require('./routes/auth');
const analyticsRouter  = require('./routes/analytics');
const paymentsRouter   = require('./routes/payments');
const reviewsRouter    = require('./routes/reviews');
const wishlistRouter   = require('./routes/wishlist');
const cartRouter       = require('./routes/cart');
const notificationsRouter = require('./routes/notifications');
const deliverySlotsRouter = require('./routes/deliverySlots');
const promotionsRouter = require('./routes/promotions');
const adminPromotionsRouter = require('./routes/adminPromotions');
const returnsRouter = require('./routes/returns');
const paymentMethodsRouter = require('./routes/paymentMethods');
const addressesRouter = require('./routes/addresses');

app.use('/api/products',   productsRouter);
app.use('/api/orders',     ordersRouter);
app.use('/api/customers',  customersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/auth',       authRouter);
app.use('/api/analytics',  analyticsRouter);
app.use('/api/payments',   paymentsRouter);
app.use('/api/reviews',    reviewsRouter);
app.use('/api/wishlist',   wishlistRouter);
app.use('/api/cart',       cartRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/delivery-slots', deliverySlotsRouter);
app.use('/api/admin/promotions', adminPromotionsRouter);
app.use('/api/returns', returnsRouter);
app.use('/api/payment-methods', paymentMethodsRouter);
app.use('/api/addresses', addressesRouter);
app.use('/api', promotionsRouter); // exposes /api/promotions/active and /api/coupons/validate

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    message: 'FreshCart Backend is running.',
    timestamp: new Date().toISOString(),
    supabase: !!process.env.SUPABASE_URL,
  });
});

// ── 404 / Error Handler ───────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 FreshCart Backend running at http://localhost:${PORT}`);
  console.log(`   ├─ Supabase URL : ${process.env.SUPABASE_URL || 'NOT SET'}`);
  console.log(`   └─ Environment  : ${process.env.NODE_ENV || 'development'}\n`);
});

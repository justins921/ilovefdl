import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { authMiddleware } from './middleware/auth';
import { securityHeaders, apiRateLimit, authRateLimit, strictRateLimit } from './middleware/security';

// Route imports
import authRoutes from './routes/auth';
import vendorRoutes from './routes/vendors';
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import blogRoutes from './routes/blog';
import barRoutes from './routes/bars';
import specialRoutes from './routes/specials';
import notificationRoutes from './routes/notifications';
import integrationRoutes from './routes/integrations';
import reviewRoutes from './routes/reviews';
import couponRoutes from './routes/coupons';
import shippingRoutes from './routes/shipping';
import wishlistRoutes from './routes/wishlist';
import addressRoutes from './routes/addresses';
import messageRoutes from './routes/messages';
import refundRoutes from './routes/refunds';
import analyticsRoutes from './routes/analytics';
import adminRoutes from './routes/admin';
import abandonedCartRoutes from './routes/abandoned-carts';
import giftCardRoutes from './routes/gift-cards';
import taxRoutes from './routes/tax';
import paymentMethodRoutes from './routes/payment-methods';
import loyaltyRoutes from './routes/loyalty';
import subscriptionRoutes from './routes/subscriptions';
import campaignRoutes from './routes/campaigns';
import currencyRoutes from './routes/currency';
import shippingRateRoutes from './routes/shipping-rates';

const app = express();
const PORT = process.env.PORT || 4000;

// ─── Security Headers ────────────────────────────────────
app.use(securityHeaders);

// ─── CORS ────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  })
);

// ─── Stripe webhook route (must be before JSON parsing) ──
// Raw body is required for Stripe webhook signature verification
app.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  orderRoutes
);

// ─── Body parsing ────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Rate Limiting ───────────────────────────────────────
app.use(apiRateLimit);

// ─── Health check (before auth so it responds instantly) ──
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Cookie parsing (manual, lightweight) ────────────────
app.use((req, _res, next) => {
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((cookie) => {
      const [name, ...rest] = cookie.trim().split('=');
      if (name) {
        cookies[name.trim()] = decodeURIComponent(rest.join('='));
      }
    });
    (req as unknown as Record<string, unknown>).cookies = cookies;
  }
  next();
});

// ─── Auth middleware (attaches user to request if valid JWT) ─
app.use(authMiddleware);

// ─── Static file serving for uploads ─────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── API Routes ──────────────────────────────────────────
app.use('/auth', authRateLimit, authRoutes);
app.use('/vendors', vendorRoutes);
app.use('/products', productRoutes);
app.use('/checkout', orderRoutes);
app.use('/orders', orderRoutes);
app.use('/posts', blogRoutes);
app.use('/bars', barRoutes);
app.use('/specials', specialRoutes);
app.use('/push', notificationRoutes);
app.use('/integrations', integrationRoutes);
app.use('/reviews', reviewRoutes);
app.use('/coupons', strictRateLimit, couponRoutes);
app.use('/shipping', shippingRoutes);
app.use('/wishlist', wishlistRoutes);
app.use('/addresses', addressRoutes);
app.use('/messages', messageRoutes);
app.use('/refunds', refundRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/admin', adminRoutes);
app.use('/abandoned-carts', abandonedCartRoutes);
app.use('/gift-cards', strictRateLimit, giftCardRoutes);
app.use('/tax', taxRoutes);
app.use('/payment-methods', paymentMethodRoutes);
app.use('/loyalty', loyaltyRoutes);
app.use('/subscriptions', subscriptionRoutes);
app.use('/campaigns', campaignRoutes);
app.use('/currency', currencyRoutes);
app.use('/shipping', shippingRateRoutes);

// ─── 404 handler ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ─── Error handling middleware ───────────────────────────
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
    });
  }
);

// ─── Start server ────────────────────────────────────────
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`API server running on 0.0.0.0:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

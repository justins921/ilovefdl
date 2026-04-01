import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { createCheckoutSchema, createMultiVendorCheckoutSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import stripe from '../utils/stripe';
import { requireAuth, requireRole } from '../middleware/auth';
import { calculateCommission } from '../utils/commission';
import Stripe from 'stripe';

const router = Router();

/**
 * POST /checkout/session
 * Create Stripe Checkout session with application_fee_amount
 */
router.post('/checkout/session', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createCheckoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { items, vendorId, shippingAddress, notes } = parsed.data;

    // Get vendor with stripe account
    const vendor = await prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    if (vendor.status !== 'APPROVED') {
      res.status(400).json({ error: 'Vendor is not approved for sales' });
      return;
    }

    if (!stripe) {
      res.status(503).json({ error: 'Stripe is not configured' });
      return;
    }

    if (!vendor.stripeAccountId || !vendor.stripeOnboarded) {
      res.status(400).json({ error: 'Vendor has not completed Stripe setup' });
      return;
    }

    // Fetch products and validate
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, vendorId },
    });

    if (products.length !== items.length) {
      res.status(400).json({ error: 'One or more products are unavailable' });
      return;
    }

    // Build line items for Stripe and calculate commission
    const commissionItems = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return { price: product.price, quantity: item.quantity };
    });

    const { commissionBaseAmount, commissionAmount, vendorNetAmount } =
      calculateCommission(commissionItems, vendor.commissionRate);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            images: product.images.length > 0 ? [product.images[0]] : undefined,
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Create Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: Math.round(commissionAmount * 100),
        transfer_data: {
          destination: vendor.stripeAccountId,
        },
      },
      success_url: `${appUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/orders/cancel`,
      customer_email: req.user!.email,
      metadata: {
        userId: req.user!.id,
        vendorId: vendor.id,
        notes: notes || '',
      },
    });

    // Create order in pending state
    const order = await prisma.order.create({
      data: {
        userId: req.user!.id,
        vendorId: vendor.id,
        status: 'PENDING',
        subtotal: commissionBaseAmount,
        total: commissionBaseAmount,
        commissionBaseAmount,
        commissionRate: vendor.commissionRate,
        commissionAmount,
        vendorNetAmount,
        stripeSessionId: session.id,
        shippingAddress: shippingAddress || undefined,
        notes,
        items: {
          create: items.map((item) => {
            const product = products.find((p) => p.id === item.productId)!;
            return {
              productId: product.id,
              quantity: item.quantity,
              unitPrice: product.price,
              total: product.price * item.quantity,
            };
          }),
        },
      },
      include: { items: true },
    });

    res.json({
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
        orderId: order.id,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

/**
 * POST /checkout/multi
 * Create a multi-vendor Stripe Checkout session.
 * Groups items by vendor, calculates commission per vendor, creates one
 * Stripe session for all items and one Order record per vendor.
 */
router.post('/checkout/multi', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createMultiVendorCheckoutSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { items, shippingAddress, notes } = parsed.data;

    if (!stripe) {
      res.status(503).json({ error: 'Stripe is not configured' });
      return;
    }

    // Fetch all products by ID (must be active)
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
    });

    if (products.length !== items.length) {
      res.status(400).json({ error: 'One or more products are unavailable' });
      return;
    }

    // Group products by vendorId
    const vendorGroups = new Map<string, typeof items>();
    for (const item of items) {
      const product = products.find((p) => p.id === item.productId)!;
      const group = vendorGroups.get(product.vendorId) || [];
      group.push(item);
      vendorGroups.set(product.vendorId, group);
    }

    // Fetch and validate all vendors
    const vendorIds = Array.from(vendorGroups.keys());
    const vendors = await prisma.vendor.findMany({
      where: { id: { in: vendorIds } },
    });

    if (vendors.length !== vendorIds.length) {
      res.status(400).json({ error: 'One or more vendors not found' });
      return;
    }

    // Verify each vendor is APPROVED and Stripe-onboarded
    for (const vendor of vendors) {
      if (vendor.status !== 'APPROVED') {
        res.status(400).json({ error: `Vendor "${vendor.businessName}" is not approved for sales` });
        return;
      }
      if (!vendor.stripeAccountId || !vendor.stripeOnboarded) {
        res.status(400).json({ error: `Vendor "${vendor.businessName}" has not completed Stripe setup` });
        return;
      }
    }

    // Calculate commission per vendor
    const vendorCommissions = new Map<string, { commissionBaseAmount: number; commissionAmount: number; vendorNetAmount: number }>();
    let totalApplicationFee = 0;

    for (const vendor of vendors) {
      const vendorItems = vendorGroups.get(vendor.id)!;
      const commissionItems = vendorItems.map((item) => {
        const product = products.find((p) => p.id === item.productId)!;
        return { price: product.price, quantity: item.quantity };
      });

      const commission = calculateCommission(commissionItems, vendor.commissionRate);
      vendorCommissions.set(vendor.id, commission);
      totalApplicationFee += commission.commissionAmount;
    }

    // Generate a unique orderGroupId
    const orderGroupId = crypto.randomUUID();

    // Build Stripe Checkout line items for ALL products (flat list)
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map((item) => {
      const product = products.find((p) => p.id === item.productId)!;
      return {
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.name,
            images: product.images.length > 0 ? [product.images[0]] : undefined,
          },
          unit_amount: Math.round(product.price * 100),
        },
        quantity: item.quantity,
      };
    });

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Create a SINGLE Stripe Checkout session (no transfer_data -- transfers happen via webhook)
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      payment_intent_data: {
        application_fee_amount: Math.round(totalApplicationFee * 100),
      },
      success_url: `${appUrl}/orders/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/orders/cancel`,
      customer_email: req.user!.email,
      metadata: {
        userId: req.user!.id,
        orderGroupId,
        vendorIds: vendorIds.join(','),
      },
    });

    // Create one Order record per vendor atomically
    const orders = await prisma.$transaction(async (tx) => {
      const createdOrders = [];
      let isFirst = true;

      for (const vendor of vendors) {
        const vendorItems = vendorGroups.get(vendor.id)!;
        const commission = vendorCommissions.get(vendor.id)!;

        const order = await tx.order.create({
          data: {
            userId: req.user!.id,
            vendorId: vendor.id,
            status: 'PENDING',
            subtotal: commission.commissionBaseAmount,
            total: commission.commissionBaseAmount,
            commissionBaseAmount: commission.commissionBaseAmount,
            commissionRate: vendor.commissionRate,
            commissionAmount: commission.commissionAmount,
            vendorNetAmount: commission.vendorNetAmount,
            orderGroupId,
            // Only the FIRST order gets the stripeSessionId (unique constraint)
            stripeSessionId: isFirst ? session.id : null,
            shippingAddress: shippingAddress || undefined,
            notes,
            items: {
              create: vendorItems.map((item) => {
                const product = products.find((p) => p.id === item.productId)!;
                return {
                  productId: product.id,
                  quantity: item.quantity,
                  unitPrice: product.price,
                  total: product.price * item.quantity,
                };
              }),
            },
          },
          include: { items: true },
        });

        createdOrders.push(order);
        isFirst = false;
      }

      return createdOrders;
    });

    const orderIds = orders.map((o) => o.id);

    res.json({
      data: {
        sessionId: session.id,
        sessionUrl: session.url,
        orderGroupId,
        orderIds,
      },
    });
  } catch (error) {
    console.error('Multi-vendor checkout error:', error);
    res.status(500).json({ error: 'Failed to create multi-vendor checkout session' });
  }
});

/**
 * GET /orders
 * Get user's orders (auth) or all orders (admin), paginated
 */
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '20', vendorId, status } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    let where: Record<string, unknown> = { userId: req.user!.id };
    if (req.user!.role === 'ADMIN') {
      where = {};
    } else if (req.user!.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
      if (vendor) {
        where = { OR: [{ userId: req.user!.id }, { vendorId: vendor.id }] };
      }
    }

    // Apply optional filters
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          items: {
            include: {
              product: {
                select: { id: true, name: true, slug: true, images: true },
              },
            },
          },
          vendor: {
            select: { id: true, businessName: true, slug: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      data: orders,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('List orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /orders/:id
 * Get order details
 */
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, slug: true, images: true, price: true },
            },
          },
        },
        vendor: {
          select: { id: true, businessName: true, slug: true, logoUrl: true },
        },
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    // Order owner, vendor owner, or admin can view
    let canView = order.userId === req.user!.id || req.user!.role === 'ADMIN';
    if (!canView && req.user!.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
      if (vendor && order.vendorId === vendor.id) canView = true;
    }
    if (!canView) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    res.json({ data: order });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

/**
 * POST /webhooks/stripe
 * Handle Stripe webhooks
 * Note: This route uses raw body parsing configured in the main app
 */
router.post('/webhooks/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error('Stripe not configured');
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).json({ error: 'Invalid webhook signature' });
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderGroupId = session.metadata?.orderGroupId;

        if (orderGroupId) {
          // Multi-vendor order: update ALL orders in the group to PAID
          const groupOrders = await prisma.order.findMany({
            where: { orderGroupId },
            include: {
              vendor: {
                select: { id: true, stripeAccountId: true, businessName: true },
              },
            },
          });

          await prisma.order.updateMany({
            where: { orderGroupId },
            data: {
              status: 'PAID',
              stripePaymentIntent: session.payment_intent as string,
            },
          });

          // Create Stripe transfers for each vendor
          for (const order of groupOrders) {
            try {
              await stripe!.transfers.create({
                amount: Math.round(order.vendorNetAmount * 100),
                currency: 'usd',
                destination: order.vendor.stripeAccountId!,
                transfer_group: orderGroupId,
                source_transaction: session.payment_intent as string || undefined,
              });
            } catch (transferError) {
              console.error(
                `Failed to create transfer for vendor "${order.vendor.businessName}" (order ${order.id}):`,
                transferError,
              );
            }
          }
        } else {
          // Single-vendor order: existing behavior
          await prisma.order.update({
            where: { stripeSessionId: session.id },
            data: {
              status: 'PAID',
              stripePaymentIntent: session.payment_intent as string,
            },
          });
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        await prisma.order.updateMany({
          where: { stripePaymentIntent: paymentIntent.id },
          data: { status: 'PAID' },
        });
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent as string;

        if (paymentIntentId) {
          await prisma.order.updateMany({
            where: { stripePaymentIntent: paymentIntentId },
            data: { status: 'REFUNDED' },
          });
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

export default router;

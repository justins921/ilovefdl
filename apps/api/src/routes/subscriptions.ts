import { Router, Request, Response } from 'express';
import { createSubscriptionSchema, updateSubscriptionSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /subscriptions — list user's subscriptions
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user!.id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            price: true,
            vendor: { select: { id: true, businessName: true, slug: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: subscriptions });
  } catch (error) {
    console.error('List subscriptions error:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// POST /subscriptions — create a subscription
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const { productId, quantity, intervalDays } = parsed.data;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    if (!product.isActive) { res.status(400).json({ error: 'Product is not active' }); return; }

    const price = product.price * quantity;
    const nextDeliveryAt = new Date();
    nextDeliveryAt.setDate(nextDeliveryAt.getDate() + intervalDays);

    const subscription = await prisma.subscription.create({
      data: {
        userId: req.user!.id,
        productId,
        vendorId: product.vendorId,
        quantity,
        intervalDays,
        price,
        nextDeliveryAt,
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            slug: true,
            images: true,
            price: true,
            vendor: { select: { id: true, businessName: true, slug: true } },
          },
        },
      },
    });

    res.status(201).json({ data: subscription });
  } catch (error) {
    console.error('Create subscription error:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// PUT /subscriptions/:id — update a subscription
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateSubscriptionSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!subscription) { res.status(404).json({ error: 'Subscription not found' }); return; }
    if (subscription.userId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }

    const { status, quantity, intervalDays } = parsed.data;

    // If cancelling, just update status
    if (status === 'CANCELLED') {
      const updated = await prisma.subscription.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
      });
      res.json({ data: updated });
      return;
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    if (status) updateData.status = status;
    if (quantity) {
      updateData.quantity = quantity;
      updateData.price = subscription.product.price * quantity;
    }
    if (intervalDays) {
      updateData.intervalDays = intervalDays;
      const nextDeliveryAt = new Date();
      nextDeliveryAt.setDate(nextDeliveryAt.getDate() + intervalDays);
      updateData.nextDeliveryAt = nextDeliveryAt;
    }

    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ data: updated });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// DELETE /subscriptions/:id — cancel a subscription
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findUnique({
      where: { id: req.params.id },
    });
    if (!subscription) { res.status(404).json({ error: 'Subscription not found' }); return; }
    if (subscription.userId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }

    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status: 'CANCELLED' },
    });
    res.json({ data: updated });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { createRefundSchema, updateRefundSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import stripe from '../utils/stripe';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /refunds — list refunds (vendor sees own, admin sees all)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    const where = req.user!.role === 'ADMIN'
      ? {}
      : { order: { vendorId: vendor?.id ?? '' } };

    const refunds = await prisma.refund.findMany({
      where,
      include: { order: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: refunds });
  } catch (error) {
    console.error('List refunds error:', error);
    res.status(500).json({ error: 'Failed to fetch refunds' });
  }
});

// POST /refunds — request a refund (customer)
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createRefundSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } });
    if (!order) { res.status(404).json({ error: 'Order not found' }); return; }
    if (order.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    if (!['PAID', 'FULFILLED'].includes(order.status)) {
      res.status(400).json({ error: 'Order is not eligible for refund' }); return;
    }
    // Check cumulative refunds don't exceed order total
    const existingRefunds = await prisma.refund.aggregate({
      where: { orderId: parsed.data.orderId, status: { not: 'REJECTED' } },
      _sum: { amount: true },
    });
    const totalRefunded = existingRefunds._sum.amount ?? 0;
    if (parsed.data.amount + totalRefunded > order.total) {
      res.status(400).json({ error: 'Total refund amount would exceed order total' }); return;
    }

    const refund = await prisma.refund.create({
      data: {
        orderId: parsed.data.orderId,
        amount: parsed.data.amount,
        reason: parsed.data.reason,
        status: 'REQUESTED',
      },
    });
    res.status(201).json({ data: refund });
  } catch (error) {
    console.error('Create refund error:', error);
    res.status(500).json({ error: 'Failed to create refund request' });
  }
});

// PUT /refunds/:id — approve/reject/process refund (admin or vendor)
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateRefundSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const refund = await prisma.refund.findUnique({
      where: { id: req.params.id },
      include: { order: true },
    });
    if (!refund) { res.status(404).json({ error: 'Refund not found' }); return; }

    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    const isVendorOwner = vendor && refund.order.vendorId === vendor.id;
    if (!isVendorOwner && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }

    const updateData: Record<string, unknown> = { status: parsed.data.status };

    // If processing, actually issue the Stripe refund
    if (parsed.data.status === 'PROCESSED' && refund.order.stripePaymentIntent && stripe) {
      try {
        const stripeRefund = await stripe.refunds.create({
          payment_intent: refund.order.stripePaymentIntent,
          amount: Math.round(refund.amount * 100),
        });
        updateData.stripeRefundId = stripeRefund.id;
        updateData.processedAt = new Date();

        // Update order status
        await prisma.order.update({
          where: { id: refund.orderId },
          data: { status: 'REFUNDED' },
        });
      } catch (stripeErr) {
        console.error('Stripe refund failed:', stripeErr);
        res.status(500).json({ error: 'Stripe refund failed' }); return;
      }
    }

    if (parsed.data.status === 'REJECTED') {
      updateData.processedAt = new Date();
    }

    const updated = await prisma.refund.update({ where: { id: req.params.id }, data: updateData });
    res.json({ data: updated });
  } catch (error) {
    console.error('Update refund error:', error);
    res.status(500).json({ error: 'Failed to update refund' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import { addPaymentMethodSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /payment-methods — list user's payment methods
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const paymentMethods = await prisma.paymentMethod.findMany({
      where: { userId: req.user!.id },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: paymentMethods });
  } catch (error) {
    console.error('List payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

// POST /payment-methods — add a payment method
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = addPaymentMethodSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    // In a real implementation, you'd call Stripe to retrieve payment method details.
    // For now, mock the type, last4, and brand from the paymentMethodId.
    const type = 'card';
    const last4 = parsed.data.paymentMethodId.slice(-4);
    const brand = 'visa';

    const paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: req.user!.id,
        stripePaymentMethodId: parsed.data.paymentMethodId,
        type,
        last4,
        brand,
      },
    });

    res.status(201).json({ data: paymentMethod });
  } catch (error) {
    console.error('Add payment method error:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

// PUT /payment-methods/:id/default — set a payment method as default
router.put('/:id/default', requireAuth, async (req: Request, res: Response) => {
  try {
    const paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: req.params.id } });
    if (!paymentMethod) { res.status(404).json({ error: 'Payment method not found' }); return; }

    if (paymentMethod.userId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }

    // Unset all other default payment methods for this user
    await prisma.paymentMethod.updateMany({
      where: { userId: req.user!.id, isDefault: true },
      data: { isDefault: false },
    });

    // Set the selected payment method as default
    const updated = await prisma.paymentMethod.update({
      where: { id: req.params.id },
      data: { isDefault: true },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Set default payment method error:', error);
    res.status(500).json({ error: 'Failed to set default payment method' });
  }
});

// DELETE /payment-methods/:id — delete a payment method
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const paymentMethod = await prisma.paymentMethod.findUnique({ where: { id: req.params.id } });
    if (!paymentMethod) { res.status(404).json({ error: 'Payment method not found' }); return; }

    if (paymentMethod.userId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }

    await prisma.paymentMethod.delete({ where: { id: req.params.id } });

    res.json({ data: { message: 'Payment method deleted' } });
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

// POST /payment-methods/setup-intent — create a Stripe SetupIntent (placeholder)
router.post('/setup-intent', requireAuth, async (req: Request, res: Response) => {
  try {
    // Placeholder for Stripe SetupIntent creation
    const clientSecret = 'seti_mock_' + req.user!.id;

    res.json({ data: { clientSecret } });
  } catch (error) {
    console.error('Create setup intent error:', error);
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

export default router;

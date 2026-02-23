import { Router, Request, Response } from 'express';
import { saveAbandonedCartSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { sendCartRecoveryEmail } from '../utils/email';

const router = Router();

// POST /abandoned-carts — save an abandoned cart
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = saveAbandonedCartSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const cart = await prisma.abandonedCart.create({
      data: {
        userId: req.user!.id,
        email: parsed.data.email ?? req.user!.email,
        items: parsed.data.items,
        subtotal: parsed.data.subtotal,
      },
    });
    res.status(201).json({ data: cart });
  } catch (error) {
    console.error('Save abandoned cart error:', error);
    res.status(500).json({ error: 'Failed to save abandoned cart' });
  }
});

// GET /abandoned-carts — list abandoned carts (admin/vendor)
router.get('/', requireAuth, requireRole(['ADMIN', 'VENDOR']), async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const skip = (page - 1) * limit;

    const where = { isRecovered: false };

    const [carts, total] = await Promise.all([
      prisma.abandonedCart.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.abandonedCart.count({ where }),
    ]);

    res.json({ data: carts, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  } catch (error) {
    console.error('List abandoned carts error:', error);
    res.status(500).json({ error: 'Failed to fetch abandoned carts' });
  }
});

// GET /abandoned-carts/stats — abandoned cart stats (admin)
router.get('/stats', requireAuth, requireRole(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const [total, recovered] = await Promise.all([
      prisma.abandonedCart.count(),
      prisma.abandonedCart.count({ where: { isRecovered: true } }),
    ]);

    const recoveryRate = total > 0 ? recovered / total : 0;

    res.json({ data: { total, recovered, recoveryRate } });
  } catch (error) {
    console.error('Abandoned cart stats error:', error);
    res.status(500).json({ error: 'Failed to fetch abandoned cart stats' });
  }
});

// GET /abandoned-carts/recover/:token — recover a cart by token (public)
router.get('/recover/:token', async (req: Request, res: Response) => {
  try {
    const cart = await prisma.abandonedCart.findUnique({
      where: { recoveryToken: req.params.token },
    });

    if (!cart) { res.status(404).json({ error: 'Cart not found' }); return; }

    res.json({ data: cart });
  } catch (error) {
    console.error('Recover cart error:', error);
    res.status(500).json({ error: 'Failed to recover cart' });
  }
});

// POST /abandoned-carts/:id/send-recovery — send recovery email (admin)
router.post('/:id/send-recovery', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const cart = await prisma.abandonedCart.findUnique({ where: { id: req.params.id } });
    if (!cart) { res.status(404).json({ error: 'Cart not found' }); return; }

    if (cart.emailsSent >= 3) {
      res.status(400).json({ error: 'Maximum recovery emails already sent' }); return;
    }

    await prisma.abandonedCart.update({
      where: { id: req.params.id },
      data: {
        emailsSent: cart.emailsSent + 1,
        lastEmailAt: new Date(),
      },
    });

    if (cart.email) {
      const items = (cart.items as Array<{ name: string; price: number; quantity: number; image?: string | null }>);
      await sendCartRecoveryEmail({
        email: cart.email,
        items,
        subtotal: cart.subtotal,
        recoveryToken: cart.recoveryToken,
      });
    }

    res.json({ data: { message: 'Recovery email sent', emailsSent: cart.emailsSent + 1 } });
  } catch (error) {
    console.error('Send recovery email error:', error);
    res.status(500).json({ error: 'Failed to send recovery email' });
  }
});

export default router;

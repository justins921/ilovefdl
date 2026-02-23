import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { createGiftCardSchema, redeemGiftCardSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /gift-cards — create a gift card
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createGiftCardSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const code = crypto.randomBytes(8).toString('hex').toUpperCase(); // 16-char alphanumeric

    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        initialBalance: parsed.data.amount,
        currentBalance: parsed.data.amount,
        purchasedById: req.user!.id,
        recipientEmail: parsed.data.recipientEmail ?? null,
        recipientName: parsed.data.recipientName ?? null,
        message: parsed.data.message ?? null,
        transactions: {
          create: {
            type: 'purchase',
            amount: parsed.data.amount,
          },
        },
      },
      include: { transactions: true },
    });

    res.status(201).json({ data: giftCard });
  } catch (error) {
    console.error('Create gift card error:', error);
    res.status(500).json({ error: 'Failed to create gift card' });
  }
});

// GET /gift-cards — list user's gift cards
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const giftCards = await prisma.giftCard.findMany({
      where: {
        OR: [
          { purchasedById: req.user!.id },
          { recipientEmail: req.user!.email },
        ],
      },
      include: { transactions: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: giftCards });
  } catch (error) {
    console.error('List gift cards error:', error);
    res.status(500).json({ error: 'Failed to fetch gift cards' });
  }
});

// GET /gift-cards/balance/:code — check gift card balance (public)
router.get('/balance/:code', async (req: Request, res: Response) => {
  try {
    const giftCard = await prisma.giftCard.findUnique({
      where: { code: req.params.code },
    });

    if (!giftCard) { res.status(404).json({ error: 'Gift card not found' }); return; }

    res.json({ data: { balance: giftCard.currentBalance, status: giftCard.status } });
  } catch (error) {
    console.error('Check gift card balance error:', error);
    res.status(500).json({ error: 'Failed to check gift card balance' });
  }
});

// POST /gift-cards/redeem — redeem a gift card
router.post('/redeem', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = redeemGiftCardSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const giftCard = await prisma.giftCard.findUnique({
      where: { code: parsed.data.code },
    });

    if (!giftCard) { res.status(404).json({ error: 'Gift card not found' }); return; }

    if (giftCard.status !== 'ACTIVE') {
      res.status(400).json({ error: 'Gift card is not active' }); return;
    }

    if (giftCard.currentBalance <= 0) {
      res.status(400).json({ error: 'Gift card has no remaining balance' }); return;
    }

    res.json({ data: { discount: giftCard.currentBalance, remainingBalance: 0 } });
  } catch (error) {
    console.error('Redeem gift card error:', error);
    res.status(500).json({ error: 'Failed to redeem gift card' });
  }
});

export default router;

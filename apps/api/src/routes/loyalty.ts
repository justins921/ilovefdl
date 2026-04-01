import { Router, Request, Response } from 'express';
import { redeemPointsSchema, addBonusPointsSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /loyalty — get or create loyalty account for current user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const account = await prisma.loyaltyAccount.upsert({
      where: { userId: req.user!.id },
      update: {},
      create: { userId: req.user!.id },
      include: {
        transactions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    res.json({ data: account });
  } catch (error) {
    console.error('Get loyalty account error:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty account' });
  }
});

// GET /loyalty/transactions — list transactions with pagination
router.get('/transactions', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const account = await prisma.loyaltyAccount.findUnique({
      where: { userId: req.user!.id },
    });

    if (!account) {
      res.status(404).json({ error: 'Loyalty account not found' });
      return;
    }

    const [transactions, total] = await Promise.all([
      prisma.loyaltyTransaction.findMany({
        where: { accountId: account.id },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.loyaltyTransaction.count({ where: { accountId: account.id } }),
    ]);

    res.json({ data: transactions, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('List loyalty transactions error:', error);
    res.status(500).json({ error: 'Failed to fetch loyalty transactions' });
  }
});

// POST /loyalty/redeem — redeem points for a discount
router.post('/redeem', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = redeemPointsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const { points } = parsed.data;

    // Atomically check and deduct points using a raw query to prevent race conditions
    const updatedAccounts = await prisma.$executeRaw`
      UPDATE "LoyaltyAccount"
      SET points = points - ${points}
      WHERE "userId" = ${req.user!.id} AND points >= ${points}
    `;

    if (updatedAccounts === 0) {
      res.status(400).json({ error: 'Insufficient points or account not found' });
      return;
    }

    const account = await prisma.loyaltyAccount.findUnique({
      where: { userId: req.user!.id },
    });

    await prisma.loyaltyTransaction.create({
      data: {
        accountId: account!.id,
        points: -points,
        type: 'redeem',
        description: `Redeemed ${points} points for $${(points / 100).toFixed(2)} discount`,
      },
    });

    const updatedAccount = account!;

    res.json({
      data: {
        discount: points / 100,
        remainingPoints: updatedAccount.points,
      },
    });
  } catch (error) {
    console.error('Redeem points error:', error);
    res.status(500).json({ error: 'Failed to redeem points' });
  }
});

// POST /loyalty/bonus — add bonus points (admin only)
router.post('/bonus', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const parsed = addBonusPointsSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const { userId, points, description } = parsed.data;

    // Find or create target user's loyalty account
    const account = await prisma.loyaltyAccount.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });

    const newLifetimePoints = account.lifetimePoints + points;

    // Determine tier based on lifetime points
    let tier = 'BRONZE';
    if (newLifetimePoints >= 10000) tier = 'PLATINUM';
    else if (newLifetimePoints >= 5000) tier = 'GOLD';
    else if (newLifetimePoints >= 1000) tier = 'SILVER';

    const [updatedAccount] = await prisma.$transaction([
      prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: {
          points: { increment: points },
          lifetimePoints: newLifetimePoints,
          tier,
        },
      }),
      prisma.loyaltyTransaction.create({
        data: {
          accountId: account.id,
          points,
          type: 'bonus',
          description,
        },
      }),
    ]);

    res.json({ data: updatedAccount });
  } catch (error) {
    console.error('Add bonus points error:', error);
    res.status(500).json({ error: 'Failed to add bonus points' });
  }
});

export default router;

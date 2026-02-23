import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /wishlist — get current user's wishlist
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      include: {
        product: {
          include: { vendor: { select: { id: true, businessName: true, slug: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: items });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ error: 'Failed to fetch wishlist' });
  }
});

// POST /wishlist/:productId — add to wishlist
router.post('/:productId', requireAuth, async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.productId } });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }
    const item = await prisma.wishlistItem.upsert({
      where: { userId_productId: { userId: req.user!.id, productId: req.params.productId } },
      update: {},
      create: { userId: req.user!.id, productId: req.params.productId },
      include: { product: true },
    });
    res.status(201).json({ data: item });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ error: 'Failed to add to wishlist' });
  }
});

// DELETE /wishlist/:productId — remove from wishlist
router.delete('/:productId', requireAuth, async (req: Request, res: Response) => {
  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.id, productId: req.params.productId },
    });
    res.json({ data: { message: 'Removed from wishlist' } });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ error: 'Failed to remove from wishlist' });
  }
});

export default router;

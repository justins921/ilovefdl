import { Router, Request, Response } from 'express';
import { createReviewSchema, updateReviewSchema, reviewQuerySchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';
import { Prisma } from '@prisma/client';

const router = Router();

// GET /reviews — list reviews with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = reviewQuerySchema.safeParse(req.query);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const { productId, vendorId, rating, page, limit } = parsed.data;
    const skip = (page - 1) * limit;
    const where: Prisma.ReviewWhereInput = { isApproved: true };
    if (productId) where.productId = productId;
    if (vendorId) where.vendorId = vendorId;
    if (rating) where.rating = rating;

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
        skip, take: limit, orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);

    res.json({ data: reviews, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('List reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

// GET /reviews/product/:productId/summary — rating summary for a product
router.get('/product/:productId/summary', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const agg = await prisma.review.aggregate({
      where: { productId, isApproved: true },
      _avg: { rating: true },
      _count: { id: true },
    });
    const distribution = await prisma.review.groupBy({
      by: ['rating'],
      where: { productId, isApproved: true },
      _count: { id: true },
    });
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const d of distribution) dist[d.rating] = d._count.id;

    res.json({
      data: {
        averageRating: agg._avg.rating ?? 0,
        totalReviews: agg._count.id,
        distribution: dist,
      },
    });
  } catch (error) {
    console.error('Review summary error:', error);
    res.status(500).json({ error: 'Failed to fetch review summary' });
  }
});

// POST /reviews — create a review
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const product = await prisma.product.findUnique({
      where: { id: parsed.data.productId },
      select: { id: true, vendorId: true },
    });
    if (!product) { res.status(404).json({ error: 'Product not found' }); return; }

    // Check for duplicate
    const existing = await prisma.review.findUnique({
      where: { productId_userId: { productId: parsed.data.productId, userId: req.user!.id } },
    });
    if (existing) { res.status(409).json({ error: 'You have already reviewed this product' }); return; }

    // Check if verified purchase
    const hasPurchased = await prisma.orderItem.findFirst({
      where: {
        productId: parsed.data.productId,
        order: { userId: req.user!.id, status: { in: ['PAID', 'FULFILLED'] } },
      },
    });

    const review = await prisma.review.create({
      data: {
        productId: parsed.data.productId,
        userId: req.user!.id,
        vendorId: product.vendorId,
        rating: parsed.data.rating,
        title: parsed.data.title,
        body: parsed.data.body,
        images: parsed.data.images,
        isVerifiedPurchase: !!hasPurchased,
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    res.status(201).json({ data: review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
});

// PUT /reviews/:id — update own review
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateReviewSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) { res.status(404).json({ error: 'Review not found' }); return; }
    if (review.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    const updated = await prisma.review.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });
    res.json({ data: updated });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// DELETE /reviews/:id — delete own review or admin
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const review = await prisma.review.findUnique({ where: { id: req.params.id } });
    if (!review) { res.status(404).json({ error: 'Review not found' }); return; }
    if (review.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Review deleted' } });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});

export default router;

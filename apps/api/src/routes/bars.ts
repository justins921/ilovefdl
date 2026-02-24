import { Router, Request, Response } from 'express';
import { createBarSchema, updateBarSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { DayOfWeek } from '@prisma/client';

const router = Router();

function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY',
  ];
  return days[new Date().getDay()];
}

/**
 * GET /bars
 * List active bars with today's specials
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const today = getTodayDayOfWeek();

    const bars = await prisma.bar.findMany({
      where: { isActive: true },
      include: {
        specials: {
          where: { isActive: true, dayOfWeek: today },
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ data: bars });
  } catch (error) {
    console.error('List bars error:', error);
    res.status(500).json({ error: 'Failed to fetch bars' });
  }
});

/**
 * GET /bars/:slug
 * Get bar by slug with specials
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const bar = await prisma.bar.findUnique({
      where: { slug: req.params.slug },
      include: {
        specials: {
          where: { isActive: true },
          orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
        },
      },
    });

    if (!bar) {
      res.status(404).json({ error: 'Bar not found' });
      return;
    }

    res.json({ data: bar });
  } catch (error) {
    console.error('Get bar error:', error);
    res.status(500).json({ error: 'Failed to fetch bar' });
  }
});

/**
 * POST /bars
 * Create bar (admin only)
 */
router.post(
  '/',
  requireAuth,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const parsed = createBarSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: parsed.error.errors[0].message });
        return;
      }

      // Check slug uniqueness
      const existingSlug = await prisma.bar.findUnique({
        where: { slug: parsed.data.slug },
      });

      if (existingSlug) {
        res.status(409).json({ error: 'This bar slug is already taken' });
        return;
      }

      const bar = await prisma.bar.create({
        data: {
          ...parsed.data,
          photos: parsed.data.photos || [],
        },
      });

      res.status(201).json({ data: bar });
    } catch (error) {
      console.error('Create bar error:', error);
      res.status(500).json({ error: 'Failed to create bar' });
    }
  }
);

/**
 * PUT /bars/:id
 * Update bar (admin or bar owner)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateBarSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const bar = await prisma.bar.findUnique({
      where: { id: req.params.id },
    });

    if (!bar) {
      res.status(404).json({ error: 'Bar not found' });
      return;
    }

    // Only admin or bar owner can update
    if (req.user!.role !== 'ADMIN' && bar.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // If slug is being changed, check uniqueness
    if (parsed.data.slug && parsed.data.slug !== bar.slug) {
      const existingSlug = await prisma.bar.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (existingSlug) {
        res.status(409).json({ error: 'This bar slug is already taken' });
        return;
      }
    }

    const updated = await prisma.bar.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update bar error:', error);
    res.status(500).json({ error: 'Failed to update bar' });
  }
});

/**
 * DELETE /bars/:id
 * Soft delete bar
 */
router.delete(
  '/:id',
  requireAuth,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const bar = await prisma.bar.findUnique({
        where: { id: req.params.id },
      });

      if (!bar) {
        res.status(404).json({ error: 'Bar not found' });
        return;
      }

      await prisma.bar.update({
        where: { id: req.params.id },
        data: { isActive: false },
      });

      res.json({ data: { message: 'Bar deleted' } });
    } catch (error) {
      console.error('Delete bar error:', error);
      res.status(500).json({ error: 'Failed to delete bar' });
    }
  }
);

export default router;

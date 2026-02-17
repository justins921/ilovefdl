import { Router, Request, Response } from 'express';
import { createSpecialSchema, updateSpecialSchema, specialQuerySchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';
import { DayOfWeek, Prisma } from '@prisma/client';

const router = Router();

/**
 * Helper: get today's day-of-week as the DayOfWeek enum value
 */
function getTodayDayOfWeek(): DayOfWeek {
  const days: DayOfWeek[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
  ];
  return days[new Date().getDay()];
}

/**
 * GET /specials
 * List specials with filters (day, barId)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = specialQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { day, barId } = parsed.data;

    const where: Prisma.SpecialWhereInput = {
      isActive: true,
    };

    if (day) {
      where.dayOfWeek = day;
    }

    if (barId) {
      where.barId = barId;
    }

    const specials = await prisma.special.findMany({
      where,
      include: {
        bar: {
          select: { id: true, name: true, slug: true, address: true },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    res.json({ data: specials });
  } catch (error) {
    console.error('List specials error:', error);
    res.status(500).json({ error: 'Failed to fetch specials' });
  }
});

/**
 * GET /specials/today
 * Today's specials
 */
router.get('/today', async (_req: Request, res: Response) => {
  try {
    const today = getTodayDayOfWeek();

    const specials = await prisma.special.findMany({
      where: {
        dayOfWeek: today,
        isActive: true,
      },
      include: {
        bar: {
          select: { id: true, name: true, slug: true, address: true, photos: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    res.json({ data: specials });
  } catch (error) {
    console.error('Today specials error:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s specials' });
  }
});

/**
 * POST /specials
 * Create special (admin or bar owner)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createSpecialSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    // Verify bar exists and user has permission
    const bar = await prisma.bar.findUnique({
      where: { id: parsed.data.barId },
    });

    if (!bar) {
      res.status(404).json({ error: 'Bar not found' });
      return;
    }

    if (req.user!.role !== 'ADMIN' && bar.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const special = await prisma.special.create({
      data: parsed.data,
      include: {
        bar: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.status(201).json({ data: special });
  } catch (error) {
    console.error('Create special error:', error);
    res.status(500).json({ error: 'Failed to create special' });
  }
});

/**
 * PUT /specials/:id
 * Update special
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateSpecialSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const special = await prisma.special.findUnique({
      where: { id: req.params.id },
      include: { bar: true },
    });

    if (!special) {
      res.status(404).json({ error: 'Special not found' });
      return;
    }

    // Admin or bar owner can update
    if (req.user!.role !== 'ADMIN' && special.bar.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    const updated = await prisma.special.update({
      where: { id: req.params.id },
      data: parsed.data,
      include: {
        bar: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update special error:', error);
    res.status(500).json({ error: 'Failed to update special' });
  }
});

/**
 * DELETE /specials/:id
 * Delete special
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const special = await prisma.special.findUnique({
      where: { id: req.params.id },
      include: { bar: true },
    });

    if (!special) {
      res.status(404).json({ error: 'Special not found' });
      return;
    }

    // Admin or bar owner can delete
    if (req.user!.role !== 'ADMIN' && special.bar.ownerId !== req.user!.id) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    await prisma.special.delete({
      where: { id: req.params.id },
    });

    res.json({ data: { message: 'Special deleted' } });
  } catch (error) {
    console.error('Delete special error:', error);
    res.status(500).json({ error: 'Failed to delete special' });
  }
});

export default router;

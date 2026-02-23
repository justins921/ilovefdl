import { Router, Request, Response } from 'express';
import { createAddressSchema, updateAddressSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /addresses — list user's saved addresses
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const addresses = await prisma.savedAddress.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    res.json({ data: addresses });
  } catch (error) {
    console.error('List addresses error:', error);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// POST /addresses — create a saved address
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createAddressSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    // If new address is default, unset existing default
    if (parsed.data.isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.savedAddress.create({
      data: { ...parsed.data, userId: req.user!.id },
    });
    res.status(201).json({ data: address });
  } catch (error) {
    console.error('Create address error:', error);
    res.status(500).json({ error: 'Failed to create address' });
  }
});

// PUT /addresses/:id — update a saved address
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateAddressSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const address = await prisma.savedAddress.findUnique({ where: { id: req.params.id } });
    if (!address || address.userId !== req.user!.id) {
      res.status(404).json({ error: 'Address not found' }); return;
    }
    if (parsed.data.isDefault) {
      await prisma.savedAddress.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    const updated = await prisma.savedAddress.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ data: updated });
  } catch (error) {
    console.error('Update address error:', error);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// DELETE /addresses/:id — delete a saved address
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const address = await prisma.savedAddress.findUnique({ where: { id: req.params.id } });
    if (!address || address.userId !== req.user!.id) {
      res.status(404).json({ error: 'Address not found' }); return;
    }
    await prisma.savedAddress.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Address deleted' } });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

export default router;

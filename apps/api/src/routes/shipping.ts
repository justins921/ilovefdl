import { Router, Request, Response } from 'express';
import { createShippingProfileSchema, updateShippingProfileSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /shipping/vendor/:vendorId — public: get shipping options for a vendor
router.get('/vendor/:vendorId', async (req: Request, res: Response) => {
  try {
    const profiles = await prisma.shippingProfile.findMany({
      where: { vendorId: req.params.vendorId, isActive: true },
      orderBy: { price: 'asc' },
    });
    res.json({ data: profiles });
  } catch (error) {
    console.error('List shipping profiles error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping profiles' });
  }
});

// GET /shipping — list own shipping profiles (vendor)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (!vendor) { res.status(403).json({ error: 'Vendor access required' }); return; }
    const profiles = await prisma.shippingProfile.findMany({
      where: { vendorId: vendor.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: profiles });
  } catch (error) {
    console.error('List shipping profiles error:', error);
    res.status(500).json({ error: 'Failed to fetch shipping profiles' });
  }
});

// POST /shipping — create shipping profile
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createShippingProfileSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (!vendor) { res.status(403).json({ error: 'Vendor access required' }); return; }
    const profile = await prisma.shippingProfile.create({ data: { ...parsed.data, vendorId: vendor.id } });
    res.status(201).json({ data: profile });
  } catch (error) {
    console.error('Create shipping profile error:', error);
    res.status(500).json({ error: 'Failed to create shipping profile' });
  }
});

// PUT /shipping/:id — update shipping profile
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateShippingProfileSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const profile = await prisma.shippingProfile.findUnique({ where: { id: req.params.id } });
    if (!profile) { res.status(404).json({ error: 'Shipping profile not found' }); return; }
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (profile.vendorId !== vendor?.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    const updated = await prisma.shippingProfile.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ data: updated });
  } catch (error) {
    console.error('Update shipping profile error:', error);
    res.status(500).json({ error: 'Failed to update shipping profile' });
  }
});

// DELETE /shipping/:id — delete shipping profile
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const profile = await prisma.shippingProfile.findUnique({ where: { id: req.params.id } });
    if (!profile) { res.status(404).json({ error: 'Shipping profile not found' }); return; }
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (profile.vendorId !== vendor?.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    await prisma.shippingProfile.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Shipping profile deleted' } });
  } catch (error) {
    console.error('Delete shipping profile error:', error);
    res.status(500).json({ error: 'Failed to delete shipping profile' });
  }
});

export default router;

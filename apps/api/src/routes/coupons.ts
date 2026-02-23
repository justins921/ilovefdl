import { Router, Request, Response } from 'express';
import { createCouponSchema, updateCouponSchema, validateCouponSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /coupons — list coupons for the vendor
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (!vendor && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Vendor access required' }); return;
    }
    const where = req.user!.role === 'ADMIN' ? {} : { vendorId: vendor!.id };
    const coupons = await prisma.coupon.findMany({ where, orderBy: { createdAt: 'desc' } });
    res.json({ data: coupons });
  } catch (error) {
    console.error('List coupons error:', error);
    res.status(500).json({ error: 'Failed to fetch coupons' });
  }
});

// POST /coupons — create a coupon
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createCouponSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (!vendor && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Vendor access required' }); return;
    }

    const existing = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });
    if (existing) { res.status(409).json({ error: 'Coupon code already exists' }); return; }

    const coupon = await prisma.coupon.create({
      data: { ...parsed.data, vendorId: vendor?.id ?? null },
    });
    res.status(201).json({ data: coupon });
  } catch (error) {
    console.error('Create coupon error:', error);
    res.status(500).json({ error: 'Failed to create coupon' });
  }
});

// PUT /coupons/:id — update a coupon
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateCouponSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) { res.status(404).json({ error: 'Coupon not found' }); return; }
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (coupon.vendorId !== vendor?.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    // If code changed, check uniqueness
    if (parsed.data.code && parsed.data.code !== coupon.code) {
      const dup = await prisma.coupon.findUnique({ where: { code: parsed.data.code } });
      if (dup) { res.status(409).json({ error: 'Coupon code already exists' }); return; }
    }
    const updated = await prisma.coupon.update({ where: { id: req.params.id }, data: parsed.data });
    res.json({ data: updated });
  } catch (error) {
    console.error('Update coupon error:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
});

// DELETE /coupons/:id — deactivate a coupon
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const coupon = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!coupon) { res.status(404).json({ error: 'Coupon not found' }); return; }
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (coupon.vendorId !== vendor?.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' }); return;
    }
    await prisma.coupon.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ data: { message: 'Coupon deactivated' } });
  } catch (error) {
    console.error('Delete coupon error:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
});

// POST /coupons/validate — validate a coupon code at checkout
router.post('/validate', async (req: Request, res: Response) => {
  try {
    const parsed = validateCouponSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const { code, subtotal, vendorId } = parsed.data;

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon || !coupon.isActive) {
      res.status(404).json({ error: 'Invalid coupon code' }); return;
    }

    // Check vendor scope
    if (coupon.vendorId && vendorId && coupon.vendorId !== vendorId) {
      res.status(400).json({ error: 'This coupon is not valid for this vendor' }); return;
    }

    const now = new Date();
    if (coupon.startsAt && new Date(coupon.startsAt) > now) {
      res.status(400).json({ error: 'This coupon is not yet active' }); return;
    }
    if (coupon.expiresAt && new Date(coupon.expiresAt) < now) {
      res.status(400).json({ error: 'This coupon has expired' }); return;
    }
    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ error: 'This coupon has reached its usage limit' }); return;
    }
    if (coupon.minOrderAmount && subtotal < coupon.minOrderAmount) {
      res.status(400).json({ error: `Minimum order of $${coupon.minOrderAmount.toFixed(2)} required` }); return;
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discount = Math.round(subtotal * (coupon.value / 100) * 100) / 100;
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discount = Math.min(coupon.value, subtotal);
    }
    // FREE_SHIPPING: discount is 0 but shipping becomes free

    res.json({
      data: {
        valid: true,
        coupon: { id: coupon.id, code: coupon.code, type: coupon.type, value: coupon.value },
        discount,
        freeShipping: coupon.type === 'FREE_SHIPPING',
      },
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    res.status(500).json({ error: 'Failed to validate coupon' });
  }
});

export default router;

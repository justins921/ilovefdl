import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const vendorStatusSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'SUSPENDED']),
});

const orderStatusSchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'FULFILLED', 'REFUNDED', 'CANCELLED']),
});

const router = Router();

// GET /admin/vendors — list all vendors with stats
router.get('/vendors', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const where = status ? { status: status as 'PENDING' | 'APPROVED' | 'SUSPENDED' } : {};

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, createdAt: true } },
        _count: { select: { products: true, orders: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: vendors });
  } catch (error) {
    console.error('Admin list vendors error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

// PUT /admin/vendors/:id/status — approve/suspend vendor
router.put('/vendors/:id/status', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const parsed = vendorStatusSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const { status } = parsed.data;

    const vendor = await prisma.vendor.findUnique({ where: { id: req.params.id } });
    if (!vendor) { res.status(404).json({ error: 'Vendor not found' }); return; }

    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    // Grant VENDOR role when approved, revert to USER when suspended
    if (status === 'APPROVED') {
      await prisma.user.update({ where: { id: vendor.userId }, data: { role: 'VENDOR' } });
    } else if (status === 'SUSPENDED') {
      await prisma.user.update({ where: { id: vendor.userId }, data: { role: 'USER' } });
    }

    res.json({ data: updated });
  } catch (error) {
    console.error('Update vendor status error:', error);
    res.status(500).json({ error: 'Failed to update vendor status' });
  }
});

// GET /admin/orders — list all orders with filters
router.get('/orders', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { status, vendorId, page = '1', limit = '20' } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          vendor: { select: { id: true, businessName: true } },
          items: true,
          refunds: true,
        },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ data: orders, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Admin list orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// PUT /admin/orders/:id/status — update order status (admin)
router.put('/orders/:id/status', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const parsed = orderStatusSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }
    const { status } = parsed.data;

    const updateData: Record<string, unknown> = { status };
    if (status === 'SHIPPED') updateData.shippedAt = new Date();
    if (status === 'FULFILLED') updateData.fulfilledAt = new Date();

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true } },
        vendor: { select: { id: true, businessName: true } },
        items: true,
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

// GET /admin/users — list all users
router.get('/users', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { page = '1', limit = '50', role } = req.query as Record<string, string>;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = role ? { role: role as 'ADMIN' | 'VENDOR' | 'BAR_OWNER' | 'CONTRACTOR' | 'EDITOR' | 'USER' } : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ data: users, total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;

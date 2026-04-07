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

// GET /admin/bars — list all bars with owner info
router.get('/bars', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const status = req.query.status as string | undefined;
    const where: Record<string, unknown> = {};
    if (status === 'pending') where.isActive = false;
    else if (status === 'approved') where.isActive = true;

    const bars = await prisma.bar.findMany({
      where,
      include: {
        specials: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Attach owner info for bars that have an ownerId
    const ownerIds = bars.map((b) => b.ownerId).filter(Boolean) as string[];
    const owners = ownerIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: ownerIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const ownerMap = new Map(owners.map((o) => [o.id, o]));

    const enriched = bars.map((bar) => ({
      ...bar,
      owner: bar.ownerId ? ownerMap.get(bar.ownerId) || null : null,
      specialCount: bar.specials.length,
    }));

    res.json({ data: enriched });
  } catch (error) {
    console.error('Admin list bars error:', error);
    res.status(500).json({ error: 'Failed to fetch bars' });
  }
});

// PUT /admin/bars/:id/approve — approve or deny a bar/restaurant application
router.put('/bars/:id/approve', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const { approved } = req.body as { approved: boolean };
    if (typeof approved !== 'boolean') {
      res.status(400).json({ error: 'approved must be a boolean' });
      return;
    }

    const bar = await prisma.bar.findUnique({ where: { id: req.params.id } });
    if (!bar) {
      res.status(404).json({ error: 'Bar not found' });
      return;
    }

    if (approved) {
      // Approve: activate bar and grant BAR_OWNER role
      await prisma.bar.update({
        where: { id: req.params.id },
        data: { isActive: true },
      });

      if (bar.ownerId) {
        await prisma.user.update({
          where: { id: bar.ownerId },
          data: { role: 'BAR_OWNER' },
        });
      }
    } else {
      // Deny: delete the bar and keep user as USER
      await prisma.bar.delete({ where: { id: req.params.id } });

      if (bar.ownerId) {
        // Revert to USER role if they don't own any other active bars
        const otherBars = await prisma.bar.count({
          where: { ownerId: bar.ownerId, isActive: true },
        });
        if (otherBars === 0) {
          await prisma.user.update({
            where: { id: bar.ownerId },
            data: { role: 'USER' },
          });
        }
      }
    }

    res.json({ data: { id: req.params.id, approved } });
  } catch (error) {
    console.error('Approve bar error:', error);
    res.status(500).json({ error: 'Failed to process bar application' });
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

// PUT /admin/users/:id/role — change a user's role
const userRoleSchema = z.object({
  role: z.enum(['ADMIN', 'VENDOR', 'BAR_OWNER', 'CONTRACTOR', 'EDITOR', 'USER']),
});

router.put('/users/:id/role', requireAuth, requireRole(['ADMIN']), async (req: Request, res: Response) => {
  try {
    const parsed = userRoleSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Prevent admins from demoting themselves
    if (req.params.id === req.user!.id && parsed.data.role !== 'ADMIN') {
      res.status(400).json({ error: 'You cannot change your own role' });
      return;
    }

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: { role: parsed.data.role },
      select: { id: true, email: true, name: true, role: true, avatarUrl: true, createdAt: true },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update user role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import prisma from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

// GET /analytics/vendor — vendor analytics dashboard data
router.get('/vendor', requireAuth, async (req: Request, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
    if (!vendor) { res.status(403).json({ error: 'Vendor access required' }); return; }

    const [orders, products] = await Promise.all([
      prisma.order.findMany({
        where: { vendorId: vendor.id, status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'FULFILLED'] } },
        include: { items: { include: { product: { select: { id: true, name: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.count({ where: { vendorId: vendor.id, isActive: true } }),
    ]);

    const totalRevenue = orders.reduce((sum, o) => sum + o.vendorNetAmount, 0);
    const totalCommissionPaid = orders.reduce((sum, o) => sum + o.commissionAmount, 0);
    const averageOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

    // Revenue by month (last 12 months)
    const revenueByMonth: Array<{ month: string; revenue: number; orders: number }> = [];
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const monthOrders = orders.filter((o) => o.createdAt.toISOString().slice(0, 7) === monthStr);
      revenueByMonth.push({
        month: monthStr,
        revenue: monthOrders.reduce((s, o) => s + o.vendorNetAmount, 0),
        orders: monthOrders.length,
      });
    }

    // Top products by revenue
    const productRevenue = new Map<string, { name: string; revenue: number; quantity: number }>();
    for (const order of orders) {
      for (const item of order.items) {
        const existing = productRevenue.get(item.productId) || { name: item.product.name, revenue: 0, quantity: 0 };
        existing.revenue += item.total;
        existing.quantity += item.quantity;
        productRevenue.set(item.productId, existing);
      }
    }
    const topProducts = Array.from(productRevenue.entries())
      .map(([productId, data]) => ({ productId, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    // Pending payouts (paid orders not yet transferred)
    const pendingOrders = orders.filter((o) => o.status === 'PAID');
    const pendingPayouts = pendingOrders.reduce((sum, o) => sum + o.vendorNetAmount, 0);

    res.json({
      data: {
        totalRevenue,
        totalOrders: orders.length,
        totalProducts: products,
        averageOrderValue,
        totalCommissionPaid,
        pendingPayouts,
        revenueByMonth,
        topProducts,
      },
    });
  } catch (error) {
    console.error('Vendor analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// GET /analytics/admin — platform-wide analytics (admin only)
router.get('/admin', requireAuth, requireRole(['ADMIN']), async (_req: Request, res: Response) => {
  try {
    const [
      totalVendors,
      pendingVendors,
      totalProducts,
      totalOrders,
      totalUsers,
      totalReviews,
    ] = await Promise.all([
      prisma.vendor.count({ where: { status: 'APPROVED' } }),
      prisma.vendor.count({ where: { status: 'PENDING' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.order.count(),
      prisma.user.count(),
      prisma.review.count(),
    ]);

    const orders = await prisma.order.findMany({
      where: { status: { in: ['PAID', 'PROCESSING', 'SHIPPED', 'FULFILLED'] } },
      select: { total: true, commissionAmount: true, createdAt: true },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);
    const totalCommission = orders.reduce((sum, o) => sum + o.commissionAmount, 0);

    // Revenue by month
    const now = new Date();
    const revenueByMonth: Array<{ month: string; revenue: number; commission: number; orders: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = d.toISOString().slice(0, 7);
      const monthOrders = orders.filter((o) => o.createdAt.toISOString().slice(0, 7) === monthStr);
      revenueByMonth.push({
        month: monthStr,
        revenue: monthOrders.reduce((s, o) => s + o.total, 0),
        commission: monthOrders.reduce((s, o) => s + o.commissionAmount, 0),
        orders: monthOrders.length,
      });
    }

    res.json({
      data: {
        totalVendors,
        pendingVendors,
        totalProducts,
        totalOrders: orders.length,
        totalUsers,
        totalReviews,
        totalRevenue,
        totalCommission,
        revenueByMonth,
      },
    });
  } catch (error) {
    console.error('Admin analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch admin analytics' });
  }
});

export default router;

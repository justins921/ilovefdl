import { Router, Request, Response } from 'express';
import { createCampaignSchema, updateCampaignSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

// GET /campaigns — list campaigns (vendor sees own, admin sees all)
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    let vendorId: string | undefined;

    if (req.user!.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
      if (!vendor) { res.status(403).json({ error: 'Vendor access required' }); return; }
      vendorId = vendor.id;
    } else if (req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Vendor or admin access required' });
      return;
    }

    const where = vendorId ? { vendorId } : {};

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.campaign.count({ where }),
    ]);

    res.json({ data: campaigns, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (error) {
    console.error('List campaigns error:', error);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /campaigns/:id — get single campaign
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) { res.status(404).json({ error: 'Campaign not found' }); return; }

    // Verify ownership: vendor can only view their own campaigns
    if (req.user!.role !== 'ADMIN') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
      if (!vendor || campaign.vendorId !== vendor.id) {
        res.status(403).json({ error: 'Insufficient permissions' }); return;
      }
    }

    res.json({ data: campaign });
  } catch (error) {
    console.error('Get campaign error:', error);
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /campaigns — create a campaign
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createCampaignSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    let vendorId: string | null = null;

    if (req.user!.role === 'VENDOR') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
      if (!vendor) { res.status(403).json({ error: 'Vendor access required' }); return; }
      vendorId = vendor.id;
    } else if (req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Vendor or admin access required' });
      return;
    }

    const campaign = await prisma.campaign.create({
      data: {
        ...parsed.data,
        vendorId,
      },
    });

    res.status(201).json({ data: campaign });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /campaigns/:id — update a campaign
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateCampaignSchema.safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: parsed.error.errors[0].message }); return; }

    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) { res.status(404).json({ error: 'Campaign not found' }); return; }

    // Verify ownership: vendor must own the campaign, admin can edit any
    if (req.user!.role !== 'ADMIN') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
      if (!vendor || campaign.vendorId !== vendor.id) {
        res.status(403).json({ error: 'Insufficient permissions' }); return;
      }
    }

    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// POST /campaigns/:id/send — send a campaign
router.post('/:id/send', requireAuth, async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) { res.status(404).json({ error: 'Campaign not found' }); return; }

    // Verify ownership
    if (req.user!.role !== 'ADMIN') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
      if (!vendor || campaign.vendorId !== vendor.id) {
        res.status(403).json({ error: 'Insufficient permissions' }); return;
      }
    }

    // Update status to SENDING
    await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'SENDING' },
    });

    // Count audience
    let sentCount = 0;

    if (campaign.audience === 'all') {
      sentCount = await prisma.user.count();
    } else if (campaign.audience === 'customers') {
      sentCount = await prisma.user.count({
        where: { orders: { some: {} } },
      });
    } else if (campaign.audience === 'subscribers') {
      sentCount = await prisma.notificationPreference.count();
    }

    // Update campaign to SENT
    const updated = await prisma.campaign.update({
      where: { id: req.params.id },
      data: {
        sentCount,
        sentAt: new Date(),
        status: 'SENT',
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Send campaign error:', error);
    res.status(500).json({ error: 'Failed to send campaign' });
  }
});

// DELETE /campaigns/:id — delete a campaign
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const campaign = await prisma.campaign.findUnique({ where: { id: req.params.id } });
    if (!campaign) { res.status(404).json({ error: 'Campaign not found' }); return; }

    // Verify ownership
    if (req.user!.role !== 'ADMIN') {
      const vendor = await prisma.vendor.findUnique({ where: { userId: req.user!.id } });
      if (!vendor || campaign.vendorId !== vendor.id) {
        res.status(403).json({ error: 'Insufficient permissions' }); return;
      }
    }

    await prisma.campaign.delete({ where: { id: req.params.id } });
    res.json({ data: { message: 'Campaign deleted' } });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

export default router;

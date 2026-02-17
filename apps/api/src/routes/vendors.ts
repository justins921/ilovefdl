import { Router, Request, Response } from 'express';
import { createVendorSchema, updateVendorSchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import stripe from '../utils/stripe';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /vendors
 * List approved vendors (public)
 */
router.get('/', async (_req: Request, res: Response) => {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { status: 'APPROVED' },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        _count: { select: { products: true } },
      },
      orderBy: { businessName: 'asc' },
    });

    res.json({ data: vendors });
  } catch (error) {
    console.error('List vendors error:', error);
    res.status(500).json({ error: 'Failed to fetch vendors' });
  }
});

/**
 * GET /vendors/:slug
 * Get vendor by slug (public)
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { slug: req.params.slug },
      include: {
        user: { select: { name: true, email: true, avatarUrl: true } },
        products: {
          where: { isActive: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    res.json({ data: vendor });
  } catch (error) {
    console.error('Get vendor error:', error);
    res.status(500).json({ error: 'Failed to fetch vendor' });
  }
});

/**
 * POST /vendors
 * Create vendor application (auth required)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createVendorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    // Check if user already has a vendor profile
    const existingVendor = await prisma.vendor.findUnique({
      where: { userId: req.user!.id },
    });

    if (existingVendor) {
      res.status(409).json({ error: 'You already have a vendor profile' });
      return;
    }

    // Check slug uniqueness
    const existingSlug = await prisma.vendor.findUnique({
      where: { slug: parsed.data.slug },
    });

    if (existingSlug) {
      res.status(409).json({ error: 'This slug is already taken' });
      return;
    }

    const vendor = await prisma.vendor.create({
      data: {
        ...parsed.data,
        userId: req.user!.id,
      },
    });

    // Update user role to VENDOR
    await prisma.user.update({
      where: { id: req.user!.id },
      data: { role: 'VENDOR' },
    });

    res.status(201).json({ data: vendor });
  } catch (error) {
    console.error('Create vendor error:', error);
    res.status(500).json({ error: 'Failed to create vendor' });
  }
});

/**
 * PUT /vendors/:id
 * Update vendor (owner or admin)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateVendorSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    // Only owner or admin can update
    if (vendor.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // If slug is being changed, check uniqueness
    if (parsed.data.slug && parsed.data.slug !== vendor.slug) {
      const existingSlug = await prisma.vendor.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (existingSlug) {
        res.status(409).json({ error: 'This slug is already taken' });
        return;
      }
    }

    const updated = await prisma.vendor.update({
      where: { id: req.params.id },
      data: parsed.data,
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update vendor error:', error);
    res.status(500).json({ error: 'Failed to update vendor' });
  }
});

/**
 * POST /vendors/:id/stripe-onboard
 * Start Stripe Connect onboarding
 */
router.post('/:id/stripe-onboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    if (vendor.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    let stripeAccountId = vendor.stripeAccountId;

    // Create Stripe Connect account if one doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: 'standard',
        email: req.user!.email,
        metadata: { vendorId: vendor.id },
      });

      stripeAccountId = account.id;

      await prisma.vendor.update({
        where: { id: vendor.id },
        data: { stripeAccountId },
      });
    }

    const appUrl = process.env.APP_URL || 'http://localhost:3000';

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${appUrl}/vendor/stripe/refresh`,
      return_url: `${appUrl}/vendor/stripe/complete`,
      type: 'account_onboarding',
    });

    res.json({ data: { url: accountLink.url } });
  } catch (error) {
    console.error('Stripe onboard error:', error);
    res.status(500).json({ error: 'Failed to start Stripe onboarding' });
  }
});

/**
 * GET /vendors/:id/stripe-dashboard
 * Get Stripe dashboard link
 */
router.get('/:id/stripe-dashboard', requireAuth, async (req: Request, res: Response) => {
  try {
    const vendor = await prisma.vendor.findUnique({
      where: { id: req.params.id },
    });

    if (!vendor) {
      res.status(404).json({ error: 'Vendor not found' });
      return;
    }

    if (vendor.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    if (!vendor.stripeAccountId) {
      res.status(400).json({ error: 'Stripe account not connected' });
      return;
    }

    const loginLink = await stripe.accounts.createLoginLink(
      vendor.stripeAccountId
    );

    res.json({ data: { url: loginLink.url } });
  } catch (error) {
    console.error('Stripe dashboard error:', error);
    res.status(500).json({ error: 'Failed to get Stripe dashboard link' });
  }
});

export default router;

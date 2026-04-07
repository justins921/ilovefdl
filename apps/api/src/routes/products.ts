import { Router, Request, Response } from 'express';
import { createProductSchema, updateProductSchema, productQuerySchema } from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';
import { Prisma } from '@prisma/client';

function toJsonOrDbNull(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
  if (value === null) return Prisma.JsonNull;
  if (value === undefined) return undefined;
  return value as Prisma.InputJsonValue;
}

const router = Router();

/**
 * GET /products
 * List products with filters (vendor, category, search, pagination)
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = productQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const { vendorId, category, search, minPrice, maxPrice, sort, featured, page, limit } = parsed.data;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (category) {
      where.categoryTags = { has: category };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { categoryTags: { has: search } },
      ];
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) (where.price as Record<string, number>).gte = minPrice;
      if (maxPrice !== undefined) (where.price as Record<string, number>).lte = maxPrice;
    }

    if (featured) {
      where.isFeatured = true;
    }

    // Sort order
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          vendor: {
            select: { id: true, businessName: true, slug: true, logoUrl: true },
          },
        },
        skip,
        take: limit,
        orderBy,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

/**
 * GET /products/:slug
 * Get product by slug
 */
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        vendor: {
          select: { id: true, businessName: true, slug: true, logoUrl: true },
        },
        variants: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
        attributes: true,
        _count: { select: { reviews: true } },
      },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Get average rating
    const ratingAgg = await prisma.review.aggregate({
      where: { productId: product.id, isApproved: true },
      _avg: { rating: true },
    });

    res.json({
      data: {
        ...product,
        averageRating: ratingAgg._avg.rating ?? 0,
        reviewCount: product._count.reviews,
      },
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

/**
 * POST /products
 * Create product (vendor auth required)
 */
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = createProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    // Find vendor for this user
    const vendor = await prisma.vendor.findUnique({
      where: { userId: req.user!.id },
    });

    // Admins can pass vendorId in the body to create products for any vendor
    const bodyVendorId = (req.body as Record<string, unknown>).vendorId as string | undefined;
    let resolvedVendorId: string;

    if (req.user!.role === 'ADMIN' && bodyVendorId) {
      resolvedVendorId = bodyVendorId;
    } else if (vendor) {
      resolvedVendorId = vendor.id;
    } else {
      res.status(403).json({ error: 'You must be a vendor to create products' });
      return;
    }

    // Check slug uniqueness
    const existingSlug = await prisma.product.findUnique({
      where: { slug: parsed.data.slug },
    });

    if (existingSlug) {
      res.status(409).json({ error: 'This product slug is already taken' });
      return;
    }

    const { metadata, ...rest } = parsed.data;
    const product = await prisma.product.create({
      data: {
        ...rest,
        vendorId: resolvedVendorId,
        images: rest.images || [],
        categoryTags: rest.categoryTags || [],
        metadata: toJsonOrDbNull(metadata),
      },
    });

    res.status(201).json({ data: product });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ error: 'Failed to create product' });
  }
});

/**
 * PUT /products/:id
 * Update product (vendor owner)
 */
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = updateProductSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { vendor: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Only vendor owner or admin can update
    if (product.vendor.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // If slug is being changed, check uniqueness
    if (parsed.data.slug && parsed.data.slug !== product.slug) {
      const existingSlug = await prisma.product.findUnique({
        where: { slug: parsed.data.slug },
      });
      if (existingSlug) {
        res.status(409).json({ error: 'This product slug is already taken' });
        return;
      }
    }

    const { metadata: updateMetadata, vendorId: newVendorId, ...updateRest } = parsed.data;

    // Only admins can reassign products to a different vendor
    const vendorUpdate: Record<string, string> = {};
    if (newVendorId && req.user!.role === 'ADMIN') {
      const targetVendor = await prisma.vendor.findUnique({ where: { id: newVendorId } });
      if (!targetVendor) {
        res.status(404).json({ error: 'Target vendor not found' });
        return;
      }
      vendorUpdate.vendorId = newVendorId;
    }

    const updated = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...updateRest,
        ...vendorUpdate,
        ...(updateMetadata !== undefined && { metadata: toJsonOrDbNull(updateMetadata) }),
      },
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ error: 'Failed to update product' });
  }
});

/**
 * DELETE /products/:id
 * Soft delete (set isActive false)
 */
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { vendor: true },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    // Only vendor owner or admin can delete
    if (product.vendor.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    await prisma.product.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });

    res.json({ data: { message: 'Product deleted' } });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;

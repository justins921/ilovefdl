import { Router, Request, Response } from 'express';
import {
  connectPlatformSchema,
  importProductsSchema,
  syncInventorySchema,
  disconnectPlatformSchema,
  ExternalPlatform,
} from '@ilovefdl/shared';
import prisma from '../utils/prisma';
import { requireAuth } from '../middleware/auth';
import { getAdapter } from '../integrations';

const router = Router();

// ─── Helpers ───────────────────────────────────────────

/** Resolve the vendor record for the authenticated user (vendor or admin). */
async function resolveVendor(req: Request, res: Response) {
  const vendor = await prisma.vendor.findUnique({
    where: { userId: req.user!.id },
  });

  if (!vendor) {
    res.status(403).json({ error: 'You must be a vendor to manage integrations' });
    return null;
  }

  return vendor;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── GET /integrations/connections ─────────────────────

router.get('/connections', requireAuth, async (req: Request, res: Response) => {
  try {
    const vendor = await resolveVendor(req, res);
    if (!vendor) return;

    const connections = await prisma.vendorConnection.findMany({
      where: { vendorId: vendor.id },
    });

    // Count imported products per platform
    const productCounts = await prisma.product.groupBy({
      by: ['externalPlatform'],
      where: {
        vendorId: vendor.id,
        externalPlatform: { not: ExternalPlatform.NATIVE },
      },
      _count: { id: true },
    });

    const countMap = new Map(
      productCounts.map((pc) => [pc.externalPlatform, pc._count.id]),
    );

    const statuses = [
      ExternalPlatform.SHOPIFY,
      ExternalPlatform.SQUARE,
      ExternalPlatform.ETSY,
    ].map((platform) => {
      const conn = connections.find((c) => c.platform === platform);
      return {
        platform,
        isConnected: conn?.isActive ?? false,
        shopDomain: conn?.shopDomain ?? null,
        lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
        productCount: countMap.get(platform) ?? 0,
      };
    });

    res.json({ data: statuses });
  } catch (error) {
    console.error('List connections error:', error);
    res.status(500).json({ error: 'Failed to fetch connections' });
  }
});

// ─── POST /integrations/connect ────────────────────────

router.post('/connect', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = connectPlatformSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const vendor = await resolveVendor(req, res);
    if (!vendor) return;

    const { platform, shopDomain, code } = parsed.data;
    const adapter = getAdapter(platform as ExternalPlatform);

    // If no code provided, return the OAuth URL for the frontend to redirect to
    if (!code) {
      const authUrl = adapter.getAuthUrl(shopDomain);
      res.json({ data: { authUrl } });
      return;
    }

    // Exchange the code for tokens
    const tokens = await adapter.exchangeCode(code, shopDomain);

    // Upsert the vendor connection
    await prisma.vendorConnection.upsert({
      where: {
        vendorId_platform: {
          vendorId: vendor.id,
          platform: platform as ExternalPlatform,
        },
      },
      update: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        shopDomain: tokens.shopDomain ?? shopDomain ?? null,
        externalShopId: tokens.externalShopId ?? null,
        isActive: true,
      },
      create: {
        vendorId: vendor.id,
        platform: platform as ExternalPlatform,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken ?? null,
        shopDomain: tokens.shopDomain ?? shopDomain ?? null,
        externalShopId: tokens.externalShopId ?? null,
        isActive: true,
      },
    });

    res.json({ data: { connected: true, platform } });
  } catch (error) {
    console.error('Connect platform error:', error);
    res.status(500).json({ error: 'Failed to connect platform' });
  }
});

// ─── POST /integrations/disconnect ─────────────────────

router.post('/disconnect', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = disconnectPlatformSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const vendor = await resolveVendor(req, res);
    if (!vendor) return;

    await prisma.vendorConnection.updateMany({
      where: {
        vendorId: vendor.id,
        platform: parsed.data.platform as ExternalPlatform,
      },
      data: {
        isActive: false,
        accessToken: null,
        refreshToken: null,
      },
    });

    res.json({ data: { disconnected: true, platform: parsed.data.platform } });
  } catch (error) {
    console.error('Disconnect platform error:', error);
    res.status(500).json({ error: 'Failed to disconnect platform' });
  }
});

// ─── GET /integrations/products/:platform ──────────────
// Preview products available for import from the external platform

router.get('/products/:platform', requireAuth, async (req: Request, res: Response) => {
  try {
    const platform = req.params.platform.toUpperCase() as ExternalPlatform;
    if (!['SHOPIFY', 'SQUARE', 'ETSY'].includes(platform)) {
      res.status(400).json({ error: 'Invalid platform' });
      return;
    }

    const vendor = await resolveVendor(req, res);
    if (!vendor) return;

    const connection = await prisma.vendorConnection.findUnique({
      where: {
        vendorId_platform: { vendorId: vendor.id, platform },
      },
    });

    if (!connection?.isActive || !connection.accessToken) {
      res.status(400).json({ error: `${platform} is not connected` });
      return;
    }

    const adapter = getAdapter(platform);
    const externalProducts = await adapter.fetchProducts(
      connection.accessToken,
      connection.shopDomain ?? undefined,
    );

    // Mark which ones are already imported
    const existingExternalIds = new Set(
      (
        await prisma.product.findMany({
          where: {
            vendorId: vendor.id,
            externalPlatform: platform,
            externalId: { not: null },
          },
          select: { externalId: true },
        })
      ).map((p) => p.externalId),
    );

    const enriched = externalProducts.map((p) => ({
      ...p,
      alreadyImported: existingExternalIds.has(p.externalId),
    }));

    res.json({ data: enriched });
  } catch (error) {
    console.error('Fetch external products error:', error);
    res.status(500).json({ error: 'Failed to fetch products from platform' });
  }
});

// ─── POST /integrations/import ─────────────────────────

router.post('/import', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = importProductsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const vendor = await resolveVendor(req, res);
    if (!vendor) return;

    const { platform, externalProductIds } = parsed.data;

    const connection = await prisma.vendorConnection.findUnique({
      where: {
        vendorId_platform: {
          vendorId: vendor.id,
          platform: platform as ExternalPlatform,
        },
      },
    });

    if (!connection?.isActive || !connection.accessToken) {
      res.status(400).json({ error: `${platform} is not connected` });
      return;
    }

    const adapter = getAdapter(platform as ExternalPlatform);
    let externalProducts = await adapter.fetchProducts(
      connection.accessToken,
      connection.shopDomain ?? undefined,
    );

    // If specific IDs were given, filter to just those
    if (externalProductIds.length > 0) {
      const idSet = new Set(externalProductIds);
      externalProducts = externalProducts.filter((p) => idSet.has(p.externalId));
    }

    let imported = 0;
    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const ext of externalProducts) {
      try {
        // Check if this product already exists
        const existing = await prisma.product.findFirst({
          where: {
            vendorId: vendor.id,
            externalPlatform: platform as ExternalPlatform,
            externalId: ext.externalId,
          },
        });

        if (existing) {
          // Update existing product
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              name: ext.name,
              description: ext.description,
              price: ext.price,
              compareAtPrice: ext.compareAtPrice,
              images: ext.images,
              inventory: ext.inventory,
              categoryTags: ext.categoryTags,
              metadata: ext.sku ? { sku: ext.sku } : undefined,
            },
          });
          updated++;
        } else {
          // Create new product
          const baseSlug = slugify(ext.name);
          let slug = baseSlug;
          let attempt = 0;

          // Ensure slug uniqueness
          while (await prisma.product.findUnique({ where: { slug } })) {
            attempt++;
            slug = `${baseSlug}-${attempt}`;
          }

          await prisma.product.create({
            data: {
              vendorId: vendor.id,
              name: ext.name,
              slug,
              description: ext.description,
              price: ext.price,
              compareAtPrice: ext.compareAtPrice,
              images: ext.images,
              categoryTags: ext.categoryTags,
              inventory: ext.inventory,
              isActive: true,
              externalPlatform: platform as ExternalPlatform,
              externalId: ext.externalId,
              metadata: ext.sku ? { sku: ext.sku } : undefined,
            },
          });
          imported++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Failed to import "${ext.name}": ${msg}`);
        skipped++;
      }
    }

    // Update last sync time
    await prisma.vendorConnection.update({
      where: {
        vendorId_platform: {
          vendorId: vendor.id,
          platform: platform as ExternalPlatform,
        },
      },
      data: { lastSyncAt: new Date() },
    });

    res.json({
      data: { imported, updated, skipped, errors },
    });
  } catch (error) {
    console.error('Import products error:', error);
    res.status(500).json({ error: 'Failed to import products' });
  }
});

// ─── POST /integrations/sync ──────────────────────────

router.post('/sync', requireAuth, async (req: Request, res: Response) => {
  try {
    const parsed = syncInventorySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message });
      return;
    }

    const vendor = await resolveVendor(req, res);
    if (!vendor) return;

    const { platform, direction } = parsed.data;

    const connection = await prisma.vendorConnection.findUnique({
      where: {
        vendorId_platform: {
          vendorId: vendor.id,
          platform: platform as ExternalPlatform,
        },
      },
    });

    if (!connection?.isActive || !connection.accessToken) {
      res.status(400).json({ error: `${platform} is not connected` });
      return;
    }

    const adapter = getAdapter(platform as ExternalPlatform);

    // Get our local products that are linked to this platform
    const localProducts = await prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        externalPlatform: platform as ExternalPlatform,
        externalId: { not: null },
      },
    });

    let synced = 0;
    const errors: string[] = [];

    if (direction === 'pull' || direction === 'both') {
      // Pull: update local inventory from external platform
      try {
        const remoteInventory = await adapter.fetchInventory(
          connection.accessToken,
          connection.shopDomain ?? undefined,
        );

        for (const product of localProducts) {
          if (!product.externalId) continue;
          const remoteQty = remoteInventory.get(product.externalId);
          if (remoteQty !== undefined && remoteQty !== product.inventory) {
            await prisma.product.update({
              where: { id: product.id },
              data: { inventory: remoteQty },
            });
            synced++;
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        errors.push(`Pull failed: ${msg}`);
      }
    }

    if (direction === 'push' || direction === 'both') {
      // Push: update external platform with our local inventory
      for (const product of localProducts) {
        if (!product.externalId) continue;
        try {
          await adapter.pushInventory(
            connection.accessToken,
            product.externalId,
            product.inventory,
            connection.shopDomain ?? undefined,
          );
          synced++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'Unknown error';
          errors.push(`Push failed for "${product.name}": ${msg}`);
        }
      }
    }

    // Update last sync time
    await prisma.vendorConnection.update({
      where: {
        vendorId_platform: {
          vendorId: vendor.id,
          platform: platform as ExternalPlatform,
        },
      },
      data: { lastSyncAt: new Date() },
    });

    res.json({
      data: {
        synced,
        errors,
        direction,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Sync inventory error:', error);
    res.status(500).json({ error: 'Failed to sync inventory' });
  }
});

export default router;

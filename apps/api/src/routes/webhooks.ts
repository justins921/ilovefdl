import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { ExternalPlatform } from '@ilovefdl/shared';
import prisma from '../utils/prisma';

const router = Router();

// ─── Shopify Webhook ──────────────────────────────────────
// Shopify sends inventory_levels/update webhooks when stock changes

function verifyShopifyHmac(body: string, hmac: string): boolean {
  const secret = process.env.SHOPIFY_API_SECRET || '';
  const hash = crypto
    .createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmac));
}

router.post('/shopify', async (req: Request, res: Response) => {
  try {
    const hmac = req.headers['x-shopify-hmac-sha256'] as string;
    const topic = req.headers['x-shopify-topic'] as string;
    const shopDomain = req.headers['x-shopify-shop-domain'] as string;

    // Verify webhook signature
    if (hmac && process.env.SHOPIFY_API_SECRET) {
      const rawBody = JSON.stringify(req.body);
      if (!verifyShopifyHmac(rawBody, hmac)) {
        console.warn('Shopify webhook: invalid HMAC signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    console.log(`Shopify webhook received: ${topic} from ${shopDomain}`);

    if (topic === 'inventory_levels/update') {
      const { inventory_item_id, available, location_id } = req.body as {
        inventory_item_id: number;
        available: number;
        location_id: number;
      };

      // Find the vendor connection for this shop
      const connection = await prisma.vendorConnection.findFirst({
        where: {
          platform: ExternalPlatform.SHOPIFY,
          shopDomain,
          isActive: true,
        },
      });

      if (!connection || !connection.accessToken) {
        res.status(200).json({ ok: true, skipped: 'no active connection' });
        return;
      }

      // Look up which product has this inventory_item_id
      // We need to query Shopify to map inventory_item_id -> product
      const variantRes = await fetch(
        `https://${shopDomain}/admin/api/2024-01/inventory_items/${inventory_item_id}.json`,
        { headers: { 'X-Shopify-Access-Token': connection.accessToken } },
      );

      if (!variantRes.ok) {
        console.error(`Shopify lookup failed for inventory_item ${inventory_item_id}: ${variantRes.status}`);
        res.status(200).json({ ok: true, skipped: 'lookup failed' });
        return;
      }

      // Now find the product variant that owns this inventory item
      // Search our local products by checking metadata or Shopify product ID
      // The inventory_item belongs to a variant; we need the parent product ID
      // Unfortunately Shopify doesn't include product_id in inventory webhook
      // So we do a search across our Shopify-linked products
      const shopifyProducts = await prisma.product.findMany({
        where: {
          vendorId: connection.vendorId,
          externalPlatform: ExternalPlatform.SHOPIFY,
          externalId: { not: null },
        },
      });

      // For each product, check if it matches via Shopify API
      for (const product of shopifyProducts) {
        try {
          const prodRes = await fetch(
            `https://${shopDomain}/admin/api/2024-01/products/${product.externalId}.json`,
            { headers: { 'X-Shopify-Access-Token': connection.accessToken } },
          );
          if (!prodRes.ok) continue;

          const prodData = (await prodRes.json()) as {
            product: {
              variants: Array<{
                inventory_item_id: number;
                inventory_quantity: number;
              }>;
            };
          };

          const matchingVariant = prodData.product.variants.find(
            (v) => v.inventory_item_id === inventory_item_id,
          );

          if (matchingVariant) {
            await prisma.product.update({
              where: { id: product.id },
              data: { inventory: available },
            });
            console.log(
              `  Updated inventory for "${product.name}": ${product.inventory} → ${available}`,
            );
            break;
          }
        } catch {
          // Continue checking other products
        }
      }
    } else if (topic === 'products/update') {
      const shopifyProduct = req.body as {
        id: number;
        title: string;
        body_html: string | null;
        variants: Array<{
          price: string;
          compare_at_price: string | null;
          inventory_quantity: number;
          sku: string | null;
        }>;
        images: Array<{ src: string }>;
        tags: string;
      };

      // Find matching local product
      const connection = await prisma.vendorConnection.findFirst({
        where: {
          platform: ExternalPlatform.SHOPIFY,
          shopDomain,
          isActive: true,
        },
      });

      if (!connection) {
        res.status(200).json({ ok: true, skipped: 'no connection' });
        return;
      }

      const localProduct = await prisma.product.findFirst({
        where: {
          vendorId: connection.vendorId,
          externalPlatform: ExternalPlatform.SHOPIFY,
          externalId: String(shopifyProduct.id),
        },
      });

      if (localProduct) {
        const variant = shopifyProduct.variants[0];
        await prisma.product.update({
          where: { id: localProduct.id },
          data: {
            name: shopifyProduct.title,
            description: shopifyProduct.body_html,
            price: parseFloat(variant?.price || '0'),
            compareAtPrice: variant?.compare_at_price
              ? parseFloat(variant.compare_at_price)
              : null,
            inventory: variant?.inventory_quantity ?? localProduct.inventory,
            images: shopifyProduct.images.map((img) => img.src),
          },
        });
        console.log(`  Updated product from Shopify: "${shopifyProduct.title}"`);
      }
    }

    // Always respond 200 so Shopify doesn't retry
    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Shopify webhook error:', error);
    res.status(200).json({ ok: true, error: 'processed with errors' });
  }
});

// ─── Square Webhook ───────────────────────────────────────
// Square sends inventory.count.updated events

function verifySquareSignature(
  body: string,
  signature: string,
  url: string,
): boolean {
  const secret = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';
  if (!secret) return true; // Skip verification if no key configured
  const payload = url + body;
  const hash = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('base64');
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

router.post('/square', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-square-hmacsha256-signature'] as string;

    // Verify signature if configured
    if (signature && process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
      const webhookUrl = `${process.env.APP_URL || ''}/webhooks/square`;
      const rawBody = JSON.stringify(req.body);
      if (!verifySquareSignature(rawBody, signature, webhookUrl)) {
        console.warn('Square webhook: invalid signature');
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
    }

    const { type, data, merchant_id } = req.body as {
      type: string;
      merchant_id: string;
      data?: {
        type: string;
        object?: {
          inventory_counts?: Array<{
            catalog_object_id: string;
            quantity: string;
            state: string;
          }>;
        };
      };
    };

    console.log(`Square webhook received: ${type} from merchant ${merchant_id}`);

    // Find the vendor connection for this merchant
    const connection = await prisma.vendorConnection.findFirst({
      where: {
        platform: ExternalPlatform.SQUARE,
        externalShopId: merchant_id,
        isActive: true,
      },
    });

    if (!connection || !connection.accessToken) {
      res.status(200).json({ ok: true, skipped: 'no active connection' });
      return;
    }

    if (type === 'inventory.count.updated') {
      const counts = data?.object?.inventory_counts || [];

      for (const count of counts) {
        if (count.state !== 'IN_STOCK') continue;
        const quantity = parseInt(count.quantity, 10) || 0;

        // The catalog_object_id is a variation ID — we need to find the parent item
        // Look up the catalog item that owns this variation
        const catalogRes = await fetch(
          `https://${getSquareBaseUrl()}/v2/catalog/object/${count.catalog_object_id}?include_related_objects=true`,
          { headers: { Authorization: `Bearer ${connection.accessToken}` } },
        );

        if (!catalogRes.ok) continue;

        const catalogData = (await catalogRes.json()) as {
          object?: { type: string; id: string; item_variation_data?: { item_id: string } };
        };

        // If this is a variation, get the parent item ID
        let catalogItemId: string;
        if (catalogData.object?.type === 'ITEM_VARIATION') {
          catalogItemId = catalogData.object.item_variation_data?.item_id || '';
        } else {
          catalogItemId = catalogData.object?.id || '';
        }

        if (!catalogItemId) continue;

        // Find and update the local product
        const localProduct = await prisma.product.findFirst({
          where: {
            vendorId: connection.vendorId,
            externalPlatform: ExternalPlatform.SQUARE,
            externalId: catalogItemId,
          },
        });

        if (localProduct) {
          await prisma.product.update({
            where: { id: localProduct.id },
            data: { inventory: quantity },
          });
          console.log(
            `  Updated inventory for "${localProduct.name}": ${localProduct.inventory} → ${quantity}`,
          );
        }
      }
    } else if (type === 'catalog.version.updated') {
      // A catalog item was updated — could be name, price, etc.
      // Trigger a full product re-sync for this vendor
      console.log('  Catalog update detected — consider running a full sync');
    }

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Square webhook error:', error);
    res.status(200).json({ ok: true, error: 'processed with errors' });
  }
});

function getSquareBaseUrl(): string {
  const env = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  return env === 'production'
    ? 'connect.squareup.com'
    : 'connect.squareupsandbox.com';
}

export default router;

import crypto from 'crypto';
import { ExternalPlatform, type ExternalProduct } from '@ilovefdl/shared';
import type { PlatformAdapter } from './types';

const SHOPIFY_API_KEY = process.env.SHOPIFY_API_KEY || '';
const SHOPIFY_API_SECRET = process.env.SHOPIFY_API_SECRET || '';
const SHOPIFY_SCOPES = 'read_products,write_inventory';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

/**
 * Validate and sanitize a Shopify domain to prevent SSRF.
 * Only allows alphanumeric characters and hyphens (valid Shopify subdomains).
 */
function sanitizeShopDomain(shopDomain: string): string {
  const domain = shopDomain.replace(/\.myshopify\.com$/, '');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$/.test(domain) && !/^[a-zA-Z0-9]$/.test(domain)) {
    throw new Error('Invalid Shopify domain format');
  }
  return domain;
}

export class ShopifyAdapter implements PlatformAdapter {
  readonly name = 'Shopify';

  getAuthUrl(shopDomain?: string): string {
    if (!shopDomain) throw new Error('shopDomain is required for Shopify');
    const domain = sanitizeShopDomain(shopDomain);
    const redirectUri = `${APP_URL}/api/integrations/shopify/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    return (
      `https://${domain}.myshopify.com/admin/oauth/authorize` +
      `?client_id=${SHOPIFY_API_KEY}` +
      `&scope=${SHOPIFY_SCOPES}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&state=${state}`
    );
  }

  async exchangeCode(code: string, shopDomain?: string) {
    if (!shopDomain) throw new Error('shopDomain is required for Shopify');
    const domain = sanitizeShopDomain(shopDomain);
    const fullDomain = `${domain}.myshopify.com`;

    const res = await fetch(
      `https://${fullDomain}/admin/oauth/access_token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: SHOPIFY_API_KEY,
          client_secret: SHOPIFY_API_SECRET,
          code,
        }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Shopify token exchange failed: ${text}`);
    }

    const data = (await res.json()) as { access_token: string };
    return {
      accessToken: data.access_token,
      shopDomain: fullDomain,
    };
  }

  async fetchProducts(accessToken: string, shopDomain?: string): Promise<ExternalProduct[]> {
    if (!shopDomain) throw new Error('shopDomain is required for Shopify');

    const products: ExternalProduct[] = [];
    let url: string | null =
      `https://${shopDomain}/admin/api/2024-01/products.json?limit=250`;

    while (url) {
      const response: Response = await fetch(url, {
        headers: { 'X-Shopify-Access-Token': accessToken },
      });

      if (!response.ok) throw new Error(`Shopify products fetch failed: ${response.status}`);

      const data = (await response.json()) as {
        products: Array<{
          id: number;
          title: string;
          body_html: string | null;
          images: Array<{ src: string }>;
          variants: Array<{
            price: string;
            compare_at_price: string | null;
            inventory_quantity: number;
            sku: string | null;
          }>;
          tags: string;
          product_type: string;
        }>;
      };

      for (const p of data.products) {
        const variant = p.variants[0];
        const tags = [
          ...(p.tags ? p.tags.split(',').map((t) => t.trim()) : []),
          ...(p.product_type ? [p.product_type] : []),
        ].filter(Boolean);

        products.push({
          externalId: String(p.id),
          name: p.title,
          description: p.body_html,
          price: parseFloat(variant?.price || '0'),
          compareAtPrice: variant?.compare_at_price
            ? parseFloat(variant.compare_at_price)
            : null,
          images: p.images.map((img) => img.src),
          inventory: variant?.inventory_quantity ?? 0,
          sku: variant?.sku ?? null,
          categoryTags: tags,
          platform: ExternalPlatform.SHOPIFY,
        });
      }

      // Pagination via Link header
      const linkHeader: string | null = response.headers.get('link');
      const nextMatch: RegExpMatchArray | null | undefined = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
      url = nextMatch ? nextMatch[1] : null;
    }

    return products;
  }

  async fetchInventory(accessToken: string, shopDomain?: string): Promise<Map<string, number>> {
    const products = await this.fetchProducts(accessToken, shopDomain);
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.externalId, p.inventory);
    }
    return map;
  }

  async pushInventory(
    accessToken: string,
    externalId: string,
    quantity: number,
    shopDomain?: string,
  ): Promise<void> {
    if (!shopDomain) throw new Error('shopDomain is required for Shopify');

    // Get the inventory item ID from the product variant
    const prodRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/products/${externalId}.json`,
      { headers: { 'X-Shopify-Access-Token': accessToken } },
    );

    if (!prodRes.ok) throw new Error(`Shopify product fetch failed: ${prodRes.status}`);

    const prodData = (await prodRes.json()) as {
      product: { variants: Array<{ inventory_item_id: number }> };
    };
    const inventoryItemId = prodData.product.variants[0]?.inventory_item_id;
    if (!inventoryItemId) return;

    // Get locations
    const locRes = await fetch(
      `https://${shopDomain}/admin/api/2024-01/locations.json`,
      { headers: { 'X-Shopify-Access-Token': accessToken } },
    );
    const locData = (await locRes.json()) as { locations: Array<{ id: number }> };
    const locationId = locData.locations[0]?.id;
    if (!locationId) return;

    // Set inventory level
    await fetch(
      `https://${shopDomain}/admin/api/2024-01/inventory_levels/set.json`,
      {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          location_id: locationId,
          inventory_item_id: inventoryItemId,
          available: quantity,
        }),
      },
    );
  }
}

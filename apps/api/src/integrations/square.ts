import crypto from 'crypto';
import { ExternalPlatform, type ExternalProduct } from '@ilovefdl/shared';
import type { PlatformAdapter } from './types';

const SQUARE_APP_ID = process.env.SQUARE_APP_ID || '';
const SQUARE_APP_SECRET = process.env.SQUARE_APP_SECRET || '';
const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT || 'sandbox';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const BASE_URL =
  SQUARE_ENV === 'production'
    ? 'https://connect.squareup.com'
    : 'https://connect.squareupsandbox.com';

const OAUTH_BASE =
  SQUARE_ENV === 'production'
    ? 'https://squareup.com'
    : 'https://squareupsandbox.com';

export class SquareAdapter implements PlatformAdapter {
  readonly name = 'Square';

  getAuthUrl(): string {
    const redirectUri = `${APP_URL}/api/integrations/square/callback`;
    const state = crypto.randomBytes(16).toString('hex');
    return (
      `${OAUTH_BASE}/oauth2/authorize` +
      `?client_id=${SQUARE_APP_ID}` +
      `&scope=ITEMS_READ+ITEMS_WRITE+INVENTORY_READ+INVENTORY_WRITE` +
      `&session=false` +
      `&state=${state}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
  }

  async exchangeCode(code: string) {
    const res = await fetch(`${BASE_URL}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: SQUARE_APP_ID,
        client_secret: SQUARE_APP_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Square token exchange failed: ${text}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
      merchant_id: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      externalShopId: data.merchant_id,
    };
  }

  async fetchProducts(accessToken: string): Promise<ExternalProduct[]> {
    const products: ExternalProduct[] = [];
    let cursor: string | undefined;

    do {
      const url = new URL(`${BASE_URL}/v2/catalog/list`);
      url.searchParams.set('types', 'ITEM');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) throw new Error(`Square catalog fetch failed: ${res.status}`);

      const data = (await res.json()) as {
        objects?: Array<{
          id: string;
          item_data?: {
            name: string;
            description?: string;
            image_ids?: string[];
            category_id?: string;
            variations?: Array<{
              id: string;
              item_variation_data?: {
                price_money?: { amount: number; currency: string };
                sku?: string;
              };
            }>;
          };
        }>;
        cursor?: string;
      };

      for (const obj of data.objects || []) {
        const item = obj.item_data;
        if (!item) continue;

        const variation = item.variations?.[0];
        const priceCents = variation?.item_variation_data?.price_money?.amount ?? 0;

        products.push({
          externalId: obj.id,
          name: item.name,
          description: item.description || null,
          price: priceCents / 100,
          compareAtPrice: null,
          images: [], // Square images require separate batch retrieval
          inventory: 0, // Fetched separately via inventory API
          sku: variation?.item_variation_data?.sku ?? null,
          categoryTags: item.category_id ? [item.category_id] : [],
          platform: ExternalPlatform.SQUARE,
        });
      }

      cursor = data.cursor;
    } while (cursor);

    // Batch fetch inventory counts
    const inventoryMap = await this.fetchInventory(accessToken);
    for (const p of products) {
      const count = inventoryMap.get(p.externalId);
      if (count !== undefined) p.inventory = count;
    }

    return products;
  }

  async fetchInventory(accessToken: string): Promise<Map<string, number>> {
    const map = new Map<string, number>();

    // First get all catalog item variation IDs
    let cursor: string | undefined;
    const variationToCatalog = new Map<string, string>();

    do {
      const url = new URL(`${BASE_URL}/v2/catalog/list`);
      url.searchParams.set('types', 'ITEM');
      if (cursor) url.searchParams.set('cursor', cursor);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) break;

      const data = (await res.json()) as {
        objects?: Array<{
          id: string;
          item_data?: {
            variations?: Array<{ id: string }>;
          };
        }>;
        cursor?: string;
      };

      for (const obj of data.objects || []) {
        for (const v of obj.item_data?.variations || []) {
          variationToCatalog.set(v.id, obj.id);
        }
      }

      cursor = data.cursor;
    } while (cursor);

    // Batch retrieve inventory counts
    const variationIds = Array.from(variationToCatalog.keys());
    for (let i = 0; i < variationIds.length; i += 100) {
      const batch = variationIds.slice(i, i + 100);

      const res = await fetch(
        `${BASE_URL}/v2/inventory/counts/batch-retrieve`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ catalog_object_ids: batch }),
        },
      );

      if (!res.ok) continue;

      const data = (await res.json()) as {
        counts?: Array<{
          catalog_object_id: string;
          quantity: string;
        }>;
      };

      for (const count of data.counts || []) {
        const catalogId = variationToCatalog.get(count.catalog_object_id);
        if (catalogId) {
          map.set(catalogId, parseInt(count.quantity, 10) || 0);
        }
      }
    }

    return map;
  }

  async pushInventory(
    accessToken: string,
    externalId: string,
    quantity: number,
  ): Promise<void> {
    // Get the variation ID for this catalog item
    const res = await fetch(
      `${BASE_URL}/v2/catalog/object/${externalId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!res.ok) throw new Error(`Square fetch item failed: ${res.status}`);

    const data = (await res.json()) as {
      object?: {
        item_data?: { variations?: Array<{ id: string }> };
      };
    };

    const variationId = data.object?.item_data?.variations?.[0]?.id;
    if (!variationId) return;

    // Get locations
    const locRes = await fetch(`${BASE_URL}/v2/locations`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const locData = (await locRes.json()) as {
      locations?: Array<{ id: string }>;
    };
    const locationId = locData.locations?.[0]?.id;
    if (!locationId) return;

    // Set inventory via physical count
    await fetch(`${BASE_URL}/v2/inventory/changes/batch-create`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idempotency_key: `sync-${externalId}-${Date.now()}`,
        changes: [
          {
            type: 'PHYSICAL_COUNT',
            physical_count: {
              catalog_object_id: variationId,
              location_id: locationId,
              quantity: String(quantity),
              state: 'IN_STOCK',
              occurred_at: new Date().toISOString(),
            },
          },
        ],
      }),
    });
  }
}

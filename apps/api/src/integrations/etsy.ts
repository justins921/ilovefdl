import { ExternalPlatform, type ExternalProduct } from '@ilovefdl/shared';
import type { PlatformAdapter } from './types';

const ETSY_API_KEY = process.env.ETSY_API_KEY || '';
const ETSY_API_SECRET = process.env.ETSY_API_SECRET || '';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';

const BASE_URL = 'https://openapi.etsy.com/v3';

export class EtsyAdapter implements PlatformAdapter {
  readonly name = 'Etsy';

  getAuthUrl(): string {
    const redirectUri = `${APP_URL}/api/integrations/etsy/callback`;
    // Etsy uses OAuth 2.0 with PKCE — for server-side flow we store
    // the code_verifier in the session / state param. Simplified here.
    return (
      `https://www.etsy.com/oauth/connect` +
      `?response_type=code` +
      `&client_id=${ETSY_API_KEY}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=listings_r%20listings_w%20transactions_r` +
      `&code_challenge_method=S256` +
      `&code_challenge=placeholder` +
      `&state=etsy`
    );
  }

  async exchangeCode(code: string) {
    const redirectUri = `${APP_URL}/api/integrations/etsy/callback`;

    const res = await fetch(`${BASE_URL}/public/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ETSY_API_KEY,
        redirect_uri: redirectUri,
        code,
        code_verifier: 'placeholder', // Would come from session in production
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Etsy token exchange failed: ${text}`);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token: string;
    };

    // Get the shop ID from the token metadata
    const meRes = await fetch(`${BASE_URL}/application/users/me`, {
      headers: {
        'x-api-key': ETSY_API_KEY,
        Authorization: `Bearer ${data.access_token}`,
      },
    });

    let shopId: string | undefined;
    if (meRes.ok) {
      const meData = (await meRes.json()) as { user_id: number; shop_id?: number };
      shopId = meData.shop_id ? String(meData.shop_id) : undefined;
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      externalShopId: shopId,
    };
  }

  async fetchProducts(accessToken: string, shopDomain?: string): Promise<ExternalProduct[]> {
    // shopDomain stores the Etsy shop ID for this adapter
    const shopId = shopDomain;
    if (!shopId) throw new Error('Etsy shop ID is required');

    const products: ExternalProduct[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const url = `${BASE_URL}/application/shops/${shopId}/listings/active?limit=${limit}&offset=${offset}`;

      const res = await fetch(url, {
        headers: {
          'x-api-key': ETSY_API_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) throw new Error(`Etsy listings fetch failed: ${res.status}`);

      const data = (await res.json()) as {
        count: number;
        results: Array<{
          listing_id: number;
          title: string;
          description: string;
          price: { amount: number; divisor: number; currency_code: string };
          quantity: number;
          tags: string[];
          sku: string[];
          images?: Array<{ url_570xN: string }>;
        }>;
      };

      for (const listing of data.results) {
        // Fetch images for this listing
        let images: string[] = [];
        try {
          const imgRes = await fetch(
            `${BASE_URL}/application/listings/${listing.listing_id}/images`,
            {
              headers: {
                'x-api-key': ETSY_API_KEY,
                Authorization: `Bearer ${accessToken}`,
              },
            },
          );
          if (imgRes.ok) {
            const imgData = (await imgRes.json()) as {
              results: Array<{ url_570xN: string }>;
            };
            images = imgData.results.map((img) => img.url_570xN);
          }
        } catch {
          // Continue without images
        }

        products.push({
          externalId: String(listing.listing_id),
          name: listing.title,
          description: listing.description || null,
          price: listing.price.amount / listing.price.divisor,
          compareAtPrice: null,
          images,
          inventory: listing.quantity,
          sku: listing.sku?.[0] ?? null,
          categoryTags: listing.tags || [],
          platform: ExternalPlatform.ETSY,
        });
      }

      if (data.results.length < limit) break;
      offset += limit;
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
  ): Promise<void> {
    const res = await fetch(
      `${BASE_URL}/application/listings/${externalId}`,
      {
        method: 'PATCH',
        headers: {
          'x-api-key': ETSY_API_KEY,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      },
    );

    if (!res.ok) throw new Error(`Etsy inventory push failed: ${res.status}`);
  }
}

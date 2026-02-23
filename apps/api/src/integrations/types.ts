import type { ExternalProduct, SyncDirection } from '@ilovefdl/shared';

/**
 * Every external platform adapter must implement this interface.
 * The integration routes call these methods without caring which platform is being used.
 */
export interface PlatformAdapter {
  /** Human-readable name (e.g. "Shopify") */
  readonly name: string;

  /** Build the OAuth authorization URL the vendor should be redirected to */
  getAuthUrl(shopDomain?: string): string;

  /** Exchange an authorization code for access / refresh tokens */
  exchangeCode(
    code: string,
    shopDomain?: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    externalShopId?: string;
    shopDomain?: string;
  }>;

  /** Fetch the full product catalog from the external platform */
  fetchProducts(
    accessToken: string,
    shopDomain?: string,
  ): Promise<ExternalProduct[]>;

  /** Fetch inventory quantities keyed by external product ID */
  fetchInventory(
    accessToken: string,
    shopDomain?: string,
  ): Promise<Map<string, number>>;

  /** Push an inventory update for a single product back to the platform */
  pushInventory(
    accessToken: string,
    externalId: string,
    quantity: number,
    shopDomain?: string,
  ): Promise<void>;
}

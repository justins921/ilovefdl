import { ExternalPlatform } from '@ilovefdl/shared';
import type { PlatformAdapter } from './types';
import { ShopifyAdapter } from './shopify';
import { SquareAdapter } from './square';
import { EtsyAdapter } from './etsy';

const adapters: Record<string, PlatformAdapter> = {
  [ExternalPlatform.SHOPIFY]: new ShopifyAdapter(),
  [ExternalPlatform.SQUARE]: new SquareAdapter(),
  [ExternalPlatform.ETSY]: new EtsyAdapter(),
};

export function getAdapter(platform: ExternalPlatform): PlatformAdapter {
  const adapter = adapters[platform];
  if (!adapter) {
    throw new Error(`No adapter for platform: ${platform}`);
  }
  return adapter;
}

export type { PlatformAdapter } from './types';

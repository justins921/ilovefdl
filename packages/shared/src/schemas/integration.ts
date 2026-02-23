import { z } from 'zod';
import { ExternalPlatform } from '../types';

export const connectPlatformSchema = z.object({
  platform: z.enum([ExternalPlatform.SHOPIFY, ExternalPlatform.SQUARE, ExternalPlatform.ETSY]),
  /** Shopify store domain (e.g. my-store.myshopify.com) */
  shopDomain: z.string().optional(),
  /** OAuth authorization code returned from the platform */
  code: z.string().optional(),
});

export const importProductsSchema = z.object({
  platform: z.enum([ExternalPlatform.SHOPIFY, ExternalPlatform.SQUARE, ExternalPlatform.ETSY]),
  /** Specific external product IDs to import. If empty, imports all. */
  externalProductIds: z.array(z.string()).default([]),
});

export const syncInventorySchema = z.object({
  platform: z.enum([ExternalPlatform.SHOPIFY, ExternalPlatform.SQUARE, ExternalPlatform.ETSY]),
  direction: z.enum(['pull', 'push', 'both']).default('both'),
});

export const disconnectPlatformSchema = z.object({
  platform: z.enum([ExternalPlatform.SHOPIFY, ExternalPlatform.SQUARE, ExternalPlatform.ETSY]),
});

export type ConnectPlatformInput = z.infer<typeof connectPlatformSchema>;
export type ImportProductsInput = z.infer<typeof importProductsSchema>;
export type SyncInventoryInput = z.infer<typeof syncInventorySchema>;
export type DisconnectPlatformInput = z.infer<typeof disconnectPlatformSchema>;

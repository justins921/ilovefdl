import { z } from 'zod';
import { ShippingType } from '../types';

export const createShippingProfileSchema = z.object({
  name: z.string().min(1).max(100),
  shippingType: z.nativeEnum(ShippingType).default(ShippingType.FLAT_RATE),
  price: z.number().min(0).default(0),
  freeAbove: z.number().min(0).optional().nullable(),
  estimatedDays: z.string().max(50).optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateShippingProfileSchema = createShippingProfileSchema.partial();

export type CreateShippingProfileInput = z.infer<typeof createShippingProfileSchema>;
export type UpdateShippingProfileInput = z.infer<typeof updateShippingProfileSchema>;

import { z } from 'zod';
import { CouponType } from '../types';

export const createCouponSchema = z.object({
  code: z.string().min(3).max(50).transform(s => s.toUpperCase()),
  type: z.nativeEnum(CouponType),
  value: z.number().min(0),
  minOrderAmount: z.number().min(0).optional().nullable(),
  maxUses: z.number().int().min(1).optional().nullable(),
  startsAt: z.string().datetime().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateCouponSchema = createCouponSchema.partial();

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().min(0),
  vendorId: z.string().optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;

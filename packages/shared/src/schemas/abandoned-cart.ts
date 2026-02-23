import { z } from 'zod';

export const saveAbandonedCartSchema = z.object({
  email: z.string().email().optional(),
  items: z.array(
    z.object({
      productId: z.string().min(1),
      quantity: z.number().int().positive(),
      price: z.number().positive(),
      name: z.string().min(1),
      image: z.string().nullable().optional(),
    }),
  ).min(1),
  subtotal: z.number().positive(),
});

export type SaveAbandonedCartInput = z.infer<typeof saveAbandonedCartSchema>;

export const recoverCartSchema = z.object({
  recoveryToken: z.string().min(1),
});

export type RecoverCartInput = z.infer<typeof recoverCartSchema>;

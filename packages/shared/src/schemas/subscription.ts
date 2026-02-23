import { z } from 'zod';

export const createSubscriptionSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  intervalDays: z.number().int().refine((v) => [7, 14, 30, 60, 90].includes(v), {
    message: 'Interval must be 7, 14, 30, 60, or 90 days',
  }),
});

export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>;

export const updateSubscriptionSchema = z.object({
  quantity: z.number().int().positive().optional(),
  intervalDays: z.number().int().refine((v) => [7, 14, 30, 60, 90].includes(v), {
    message: 'Interval must be 7, 14, 30, 60, or 90 days',
  }).optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'CANCELLED']).optional(),
});

export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>;

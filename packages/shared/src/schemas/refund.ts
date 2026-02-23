import { z } from 'zod';
import { RefundStatus } from '../types';

export const createRefundSchema = z.object({
  orderId: z.string().min(1),
  amount: z.number().min(0.01),
  reason: z.string().max(1000).optional(),
});

export const updateRefundSchema = z.object({
  status: z.nativeEnum(RefundStatus),
});

export type CreateRefundInput = z.infer<typeof createRefundSchema>;
export type UpdateRefundInput = z.infer<typeof updateRefundSchema>;

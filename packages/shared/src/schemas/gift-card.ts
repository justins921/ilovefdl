import { z } from 'zod';

export const createGiftCardSchema = z.object({
  amount: z.number().min(5).max(500),
  recipientEmail: z.string().email().optional(),
  recipientName: z.string().max(100).optional(),
  message: z.string().max(500).optional(),
});

export type CreateGiftCardInput = z.infer<typeof createGiftCardSchema>;

export const redeemGiftCardSchema = z.object({
  code: z.string().min(1).max(50),
});

export type RedeemGiftCardInput = z.infer<typeof redeemGiftCardSchema>;

export const checkGiftCardBalanceSchema = z.object({
  code: z.string().min(1).max(50),
});

export type CheckGiftCardBalanceInput = z.infer<typeof checkGiftCardBalanceSchema>;

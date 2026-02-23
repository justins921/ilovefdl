import { z } from 'zod';

export const redeemPointsSchema = z.object({
  points: z.number().int().positive().min(100), // Minimum 100 points to redeem
});

export type RedeemPointsInput = z.infer<typeof redeemPointsSchema>;

export const addBonusPointsSchema = z.object({
  userId: z.string().min(1),
  points: z.number().int().positive(),
  description: z.string().min(1).max(200),
});

export type AddBonusPointsInput = z.infer<typeof addBonusPointsSchema>;

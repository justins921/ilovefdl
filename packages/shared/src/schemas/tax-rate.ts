import { z } from 'zod';

export const createTaxRateSchema = z.object({
  country: z.string().length(2).default('US'),
  state: z.string().min(1).max(10),
  rate: z.number().min(0).max(1), // 0.0 to 1.0
  name: z.string().min(1).max(100),
});

export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;

export const updateTaxRateSchema = z.object({
  rate: z.number().min(0).max(1).optional(),
  name: z.string().min(1).max(100).optional(),
  isActive: z.boolean().optional(),
});

export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;

export const calculateTaxSchema = z.object({
  subtotal: z.number().positive(),
  state: z.string().min(1).max(10),
  country: z.string().length(2).default('US'),
});

export type CalculateTaxInput = z.infer<typeof calculateTaxSchema>;

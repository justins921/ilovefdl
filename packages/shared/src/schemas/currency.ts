import { z } from 'zod';

export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'] as const;

export const convertCurrencySchema = z.object({
  amount: z.number().positive(),
  from: z.enum(SUPPORTED_CURRENCIES).default('USD'),
  to: z.enum(SUPPORTED_CURRENCIES),
});

export type ConvertCurrencyInput = z.infer<typeof convertCurrencySchema>;

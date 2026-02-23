import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().max(50).default('Home'),
  name: z.string().min(1).max(100),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional().nullable(),
  city: z.string().min(1).max(100),
  state: z.string().min(1).max(100),
  postalCode: z.string().min(1).max(20),
  country: z.string().max(2).default('US'),
  phone: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().default(false),
});

export const updateAddressSchema = createAddressSchema.partial();

export type CreateAddressInput = z.infer<typeof createAddressSchema>;
export type UpdateAddressInput = z.infer<typeof updateAddressSchema>;

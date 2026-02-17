import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalUrl = z.string().url('Must be a valid URL').optional().or(z.literal(''));

const phoneField = z
  .string()
  .min(7, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .optional()
  .or(z.literal(''));

export const createVendorSchema = z.object({
  businessName: z
    .string()
    .min(2, 'Business name must be at least 2 characters')
    .max(100, 'Business name must be at most 100 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(128, 'Slug must be at most 128 characters')
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
  logoUrl: optionalUrl,
  bannerUrl: optionalUrl,
  address: z.string().max(500).optional(),
  phone: phoneField,
  website: optionalUrl,
  socialLinks: z.record(z.string(), z.string()).optional(),
});

export const updateVendorSchema = createVendorSchema.partial();

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = z.infer<typeof updateVendorSchema>;

import { z } from 'zod';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalUrl = z.string().url('Must be a valid URL').optional().or(z.literal(''));

const phoneField = z
  .string()
  .min(7, 'Phone number is too short')
  .max(20, 'Phone number is too long')
  .optional()
  .or(z.literal(''));

const barHoursSchema = z.record(
  z.string(),
  z
    .object({
      open: z.string(),
      close: z.string(),
    })
    .nullable(),
);

export const createBarSchema = z.object({
  name: z
    .string()
    .min(1, 'Bar name is required')
    .max(100, 'Bar name must be at most 100 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(128, 'Slug must be at most 128 characters')
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  address: z.string().min(1, 'Address is required').max(500),
  description: z
    .string()
    .max(2000, 'Description must be at most 2000 characters')
    .optional(),
  phone: phoneField,
  website: optionalUrl,
  mapLink: optionalUrl,
  hours: barHoursSchema.optional(),
  photos: z
    .array(z.string().url('Each photo must be a valid URL'))
    .max(20, 'Maximum of 20 photos allowed')
    .default([]),
  socialLinks: z.record(z.string(), z.string()).optional(),
  ownerId: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export const updateBarSchema = createBarSchema.partial();

export type CreateBarInput = z.infer<typeof createBarSchema>;
export type UpdateBarInput = z.infer<typeof updateBarSchema>;

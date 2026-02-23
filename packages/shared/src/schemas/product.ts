import { z } from 'zod';
import { ExternalPlatform } from '../types';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createProductSchema = z.object({
  name: z
    .string()
    .min(1, 'Product name is required')
    .max(200, 'Product name must be at most 200 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(128, 'Slug must be at most 128 characters')
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  description: z
    .string()
    .max(5000, 'Description must be at most 5000 characters')
    .optional(),
  price: z
    .number()
    .min(0, 'Price must be non-negative')
    .max(999999.99, 'Price exceeds maximum'),
  compareAtPrice: z
    .number()
    .min(0, 'Compare-at price must be non-negative')
    .optional()
    .nullable(),
  images: z
    .array(z.string().url('Each image must be a valid URL'))
    .max(20, 'Maximum of 20 images allowed')
    .default([]),
  categoryTags: z
    .array(z.string().max(50, 'Tag must be at most 50 characters'))
    .max(30, 'Maximum of 30 tags allowed')
    .default([]),
  inventory: z
    .number()
    .int('Inventory must be a whole number')
    .min(0, 'Inventory must be non-negative')
    .default(0),
  isActive: z.boolean().default(true),
  externalPlatform: z.nativeEnum(ExternalPlatform).default(ExternalPlatform.NATIVE),
  externalId: z.string().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

export const updateProductSchema = createProductSchema.partial();

export const productQuerySchema = z.object({
  vendorId: z.string().optional(),
  category: z.string().optional(),
  search: z.string().optional(),
  minPrice: z.coerce.number().min(0).optional(),
  maxPrice: z.coerce.number().min(0).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular']).optional(),
  featured: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ProductQuery = z.infer<typeof productQuerySchema>;

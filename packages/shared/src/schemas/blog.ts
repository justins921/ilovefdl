import { z } from 'zod';
import { PostCategory, PostStatus } from '../types';

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const optionalUrl = z.string().url('Must be a valid URL').optional().or(z.literal(''));

export const postCategoryEnum = z.nativeEnum(PostCategory);
export const postStatusEnum = z.nativeEnum(PostStatus);

export const createPostSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(128, 'Slug must be at most 128 characters')
    .regex(slugRegex, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  content: z.string().min(1, 'Content is required'),
  excerpt: z
    .string()
    .max(500, 'Excerpt must be at most 500 characters')
    .optional(),
  category: z.nativeEnum(PostCategory).default(PostCategory.UNCATEGORIZED),
  tags: z
    .array(z.string().max(50, 'Tag must be at most 50 characters'))
    .max(20, 'Maximum of 20 tags allowed')
    .default([]),
  status: z.nativeEnum(PostStatus).default(PostStatus.DRAFT),
  featuredImage: optionalUrl,
  publishedAt: z.string().datetime().optional().nullable(),
  scheduledAt: z.string().datetime().optional().nullable(),
  seoTitle: z
    .string()
    .max(70, 'SEO title must be at most 70 characters')
    .optional(),
  seoDescription: z
    .string()
    .max(160, 'SEO description must be at most 160 characters')
    .optional(),
});

export const createBlogPostSchema = createPostSchema;

export const updatePostSchema = createPostSchema.partial();
export const updateBlogPostSchema = updatePostSchema;

export const postQuerySchema = z.object({
  category: z.nativeEnum(PostCategory).optional(),
  tag: z.string().optional(),
  search: z.string().optional(),
  status: z.nativeEnum(PostStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type CreateBlogPostInput = z.infer<typeof createBlogPostSchema>;
export type UpdateBlogPostInput = z.infer<typeof updateBlogPostSchema>;
export type PostQuery = z.infer<typeof postQuerySchema>;

import { z } from 'zod';
import { DayOfWeek } from '../types';

export const dayOfWeekEnum = z.nativeEnum(DayOfWeek);

export const createSpecialSchema = z.object({
  barId: z.string().min(1, 'Bar ID is required'),
  dayOfWeek: dayOfWeekEnum,
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be at most 200 characters'),
  description: z
    .string()
    .max(1000, 'Description must be at most 1000 characters')
    .optional(),
  price: z.string().max(50, 'Price must be at most 50 characters').optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Start time must be in HH:MM format')
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'End time must be in HH:MM format')
    .optional(),
  isFeatured: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const updateSpecialSchema = createSpecialSchema.partial().omit({ barId: true });

export const specialQuerySchema = z.object({
  day: dayOfWeekEnum.optional(),
  barId: z.string().optional(),
});

export type CreateSpecialInput = z.infer<typeof createSpecialSchema>;
export type UpdateSpecialInput = z.infer<typeof updateSpecialSchema>;
export type SpecialQuery = z.infer<typeof specialQuerySchema>;

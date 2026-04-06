import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
});

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const registerVendorSchema = z.object({
  // Account fields
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Name is required'),
  // Business fields
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
  phone: z
    .string()
    .min(7, 'Phone number is too short')
    .max(20, 'Phone number is too long')
    .optional()
    .or(z.literal('')),
  address: z.string().max(500).optional(),
  website: z.string().url('Must be a valid URL').optional().or(z.literal('')),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RegisterVendorInput = z.infer<typeof registerVendorSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

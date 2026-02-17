import { z } from 'zod';

export const magicLinkSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export const verifyMagicLinkSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

/** Alias for magicLinkSchema -- used by the consolidated validation layer */
export const loginSchema = magicLinkSchema;

export type MagicLinkInput = z.infer<typeof magicLinkSchema>;
export type VerifyMagicLinkInput = z.infer<typeof verifyMagicLinkSchema>;
export type LoginInput = z.infer<typeof loginSchema>;

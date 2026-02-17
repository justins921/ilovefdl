import { z } from 'zod';

export const registerPushTokenSchema = z.object({
  token: z.string().min(1, 'Push token is required'),
  platform: z.enum(['ios', 'android', 'web'], {
    errorMap: () => ({ message: 'Platform must be ios, android, or web' }),
  }),
});

export const updatePreferencesSchema = z.object({
  breakingNews: z.boolean().optional(),
  dailySpecials: z.boolean().optional(),
  orderUpdates: z.boolean().optional(),
  categoryAlerts: z.record(z.string(), z.boolean()).optional(),
});

export const updateNotificationPreferenceSchema = updatePreferencesSchema;

export type RegisterPushTokenInput = z.infer<typeof registerPushTokenSchema>;
export type UpdatePreferencesInput = z.infer<typeof updatePreferencesSchema>;
export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;

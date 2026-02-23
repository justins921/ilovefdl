import { z } from 'zod';

export const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().max(200).optional(),
  body: z.string().min(1),
  type: z.enum(['EMAIL', 'SMS']).default('EMAIL'),
  audience: z.enum(['all', 'customers', 'subscribers']).default('all'),
  scheduledAt: z.string().datetime().optional(),
});

export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;

export const updateCampaignSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  subject: z.string().max(200).optional(),
  body: z.string().min(1).optional(),
  type: z.enum(['EMAIL', 'SMS']).optional(),
  audience: z.enum(['all', 'customers', 'subscribers']).optional(),
  status: z.enum(['DRAFT', 'SCHEDULED', 'CANCELLED']).optional(),
  scheduledAt: z.string().datetime().optional(),
});

export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;

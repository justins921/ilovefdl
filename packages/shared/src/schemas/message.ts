import { z } from 'zod';

export const createConversationSchema = z.object({
  recipientId: z.string().min(1),
  subject: z.string().max(200).optional(),
  orderId: z.string().optional(),
  productId: z.string().optional(),
  body: z.string().min(1).max(5000),
});

export const sendMessageSchema = z.object({
  body: z.string().min(1).max(5000),
});

export type CreateConversationInput = z.infer<typeof createConversationSchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

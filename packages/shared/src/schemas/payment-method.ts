import { z } from 'zod';

export const addPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1), // Stripe PaymentMethod ID from frontend
});

export type AddPaymentMethodInput = z.infer<typeof addPaymentMethodSchema>;

export const setDefaultPaymentMethodSchema = z.object({
  paymentMethodId: z.string().min(1),
});

export type SetDefaultPaymentMethodInput = z.infer<typeof setDefaultPaymentMethodSchema>;

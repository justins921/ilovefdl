import { z } from 'zod';
import { OrderStatus } from '../types';

export const checkoutItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z
    .number()
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
});

const shippingAddressSchema = z.object({
  line1: z.string().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().min(1, 'Country is required').default('US'),
});

export const createCheckoutSchema = z.object({
  items: z
    .array(checkoutItemSchema)
    .min(1, 'At least one item is required'),
  vendorId: z.string().min(1, 'Vendor ID is required'),
  shippingAddress: shippingAddressSchema.optional(),
  notes: z.string().max(1000, 'Notes must be at most 1000 characters').optional(),
});

export const createOrderSchema = createCheckoutSchema;

export const updateOrderStatusSchema = z.object({
  status: z.nativeEnum(OrderStatus),
});

export type CheckoutItem = z.infer<typeof checkoutItemSchema>;
export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

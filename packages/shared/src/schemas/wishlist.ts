import { z } from 'zod';

export const addWishlistItemSchema = z.object({
  productId: z.string().min(1),
});

export type AddWishlistItemInput = z.infer<typeof addWishlistItemSchema>;

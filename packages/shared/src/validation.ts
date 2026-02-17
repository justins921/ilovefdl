/**
 * Consolidated validation schemas for the I Love FDL platform.
 *
 * This module re-exports all Zod schemas from the per-domain schema files,
 * providing a single import point for consumers who prefer a flat namespace:
 *
 *   import { loginSchema, createVendorSchema } from '@ilovefdl/shared/validation';
 *
 * All schemas are also available through the main package entry point.
 */

// Auth
export {
  magicLinkSchema,
  verifyMagicLinkSchema,
  loginSchema,
} from './schemas/auth';
export type { MagicLinkInput, VerifyMagicLinkInput, LoginInput } from './schemas/auth';

// Vendor
export { createVendorSchema, updateVendorSchema } from './schemas/vendor';
export type { CreateVendorInput, UpdateVendorInput } from './schemas/vendor';

// Product
export {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from './schemas/product';
export type {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
} from './schemas/product';

// Order
export {
  checkoutItemSchema,
  createCheckoutSchema,
  createOrderSchema,
  updateOrderStatusSchema,
} from './schemas/order';
export type {
  CheckoutItem,
  CreateCheckoutInput,
  CreateOrderInput,
  UpdateOrderStatusInput,
} from './schemas/order';

// Blog
export {
  postCategoryEnum,
  postStatusEnum,
  createPostSchema,
  createBlogPostSchema,
  updatePostSchema,
  updateBlogPostSchema,
  postQuerySchema,
} from './schemas/blog';
export type {
  CreatePostInput,
  UpdatePostInput,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  PostQuery,
} from './schemas/blog';

// Bar
export { createBarSchema, updateBarSchema } from './schemas/bar';
export type { CreateBarInput, UpdateBarInput } from './schemas/bar';

// Special
export {
  dayOfWeekEnum,
  createSpecialSchema,
  updateSpecialSchema,
  specialQuerySchema,
} from './schemas/special';
export type {
  CreateSpecialInput,
  UpdateSpecialInput,
  SpecialQuery,
} from './schemas/special';

// Notifications
export {
  registerPushTokenSchema,
  updatePreferencesSchema,
  updateNotificationPreferenceSchema,
} from './schemas/notification';
export type {
  RegisterPushTokenInput,
  UpdatePreferencesInput,
  UpdateNotificationPreferenceInput,
} from './schemas/notification';

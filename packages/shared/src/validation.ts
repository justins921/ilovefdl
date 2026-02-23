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
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './schemas/auth';
export type { LoginInput, RegisterInput, ForgotPasswordInput, ResetPasswordInput } from './schemas/auth';

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
  shippingAddressSchema,
  createCheckoutSchema,
  createOrderSchema,
  updateOrderStatusSchema,
  createMultiVendorCheckoutSchema,
} from './schemas/order';
export type {
  CheckoutItem,
  CreateCheckoutInput,
  CreateOrderInput,
  UpdateOrderStatusInput,
  CreateMultiVendorCheckoutInput,
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

// Integrations
export {
  connectPlatformSchema,
  importProductsSchema,
  syncInventorySchema,
  disconnectPlatformSchema,
} from './schemas/integration';
export type {
  ConnectPlatformInput,
  ImportProductsInput,
  SyncInventoryInput,
  DisconnectPlatformInput,
} from './schemas/integration';

// Reviews
export { createReviewSchema, updateReviewSchema, reviewQuerySchema } from './schemas/review';
export type { CreateReviewInput, UpdateReviewInput, ReviewQuery } from './schemas/review';

// Coupons
export { createCouponSchema, updateCouponSchema, validateCouponSchema } from './schemas/coupon';
export type { CreateCouponInput, UpdateCouponInput, ValidateCouponInput } from './schemas/coupon';

// Shipping
export { createShippingProfileSchema, updateShippingProfileSchema } from './schemas/shipping';
export type { CreateShippingProfileInput, UpdateShippingProfileInput } from './schemas/shipping';

// Wishlist
export { addWishlistItemSchema } from './schemas/wishlist';
export type { AddWishlistItemInput } from './schemas/wishlist';

// Address
export { createAddressSchema, updateAddressSchema } from './schemas/address';
export type { CreateAddressInput, UpdateAddressInput } from './schemas/address';

// Message
export { createConversationSchema, sendMessageSchema } from './schemas/message';
export type { CreateConversationInput, SendMessageInput } from './schemas/message';

// Refund
export { createRefundSchema, updateRefundSchema } from './schemas/refund';
export type { CreateRefundInput, UpdateRefundInput } from './schemas/refund';

// Abandoned Cart
export { saveAbandonedCartSchema, recoverCartSchema } from './schemas/abandoned-cart';
export type { SaveAbandonedCartInput, RecoverCartInput } from './schemas/abandoned-cart';

// Gift Cards
export { createGiftCardSchema, redeemGiftCardSchema, checkGiftCardBalanceSchema } from './schemas/gift-card';
export type { CreateGiftCardInput, RedeemGiftCardInput, CheckGiftCardBalanceInput } from './schemas/gift-card';

// Tax Rates
export { createTaxRateSchema, updateTaxRateSchema, calculateTaxSchema } from './schemas/tax-rate';
export type { CreateTaxRateInput, UpdateTaxRateInput, CalculateTaxInput } from './schemas/tax-rate';

// Payment Methods
export { addPaymentMethodSchema, setDefaultPaymentMethodSchema } from './schemas/payment-method';
export type { AddPaymentMethodInput, SetDefaultPaymentMethodInput } from './schemas/payment-method';

// Loyalty
export { redeemPointsSchema, addBonusPointsSchema } from './schemas/loyalty';
export type { RedeemPointsInput, AddBonusPointsInput } from './schemas/loyalty';

// Subscriptions
export { createSubscriptionSchema, updateSubscriptionSchema } from './schemas/subscription';
export type { CreateSubscriptionInput, UpdateSubscriptionInput } from './schemas/subscription';

// Campaigns
export { createCampaignSchema, updateCampaignSchema } from './schemas/campaign';
export type { CreateCampaignInput, UpdateCampaignInput } from './schemas/campaign';

// Currency
export { convertCurrencySchema, SUPPORTED_CURRENCIES } from './schemas/currency';
export type { ConvertCurrencyInput } from './schemas/currency';

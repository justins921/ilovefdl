// ─── Types and Enums ────────────────────────────────────
export {
  // Enums
  Role,
  VendorStatus,
  OrderStatus,
  PostStatus,
  PostCategory,
  DayOfWeek,
  ExternalPlatform,
  CouponType,
  ShippingType,
  RefundStatus,
  GiftCardStatus,
  SubscriptionStatus,
  CampaignStatus,
  CampaignType,
} from './types';

export type {
  // Core model interfaces
  User,
  Vendor,
  VendorConnection,
  Product,
  ProductVariant,
  ProductAttribute,
  Order,
  OrderItem,
  Review,
  WishlistItem,
  SavedAddress,
  Coupon,
  ShippingProfile,
  Refund,
  Conversation,
  ConversationParticipant,
  Message,
  BlogPost,
  BlogComment,
  Bar,
  Special,
  PushToken,
  NotificationPreference,

  // New feature models
  AbandonedCart,
  AbandonedCartItem,
  GiftCard,
  GiftCardTransaction,
  TaxRate,
  PaymentMethod,
  LoyaltyAccount,
  LoyaltyTransaction,
  Subscription,
  Campaign,

  // Supporting types
  ShippingAddress,
  BarHours,
  CommissionBreakdown,
  VendorAnalytics,

  // API response types
  ApiResponse,
  ApiErrorResponse,
  PaginatedResponse,
  PaginationParams,

  // Auth types
  AuthTokens,
  AuthUser,
  LoginResponse,

  // Checkout types
  CheckoutLineItem,
  CheckoutSession,

  // Integration / Sync types
  SyncDirection,
  ExternalProduct,
  ImportResult,
  SyncResult,
  ConnectionStatus,
} from './types';

// ─── Validation Schemas ─────────────────────────────────
export * from './schemas/auth';
export * from './schemas/vendor';
export * from './schemas/product';
export * from './schemas/order';
export * from './schemas/blog';
export * from './schemas/bar';
export * from './schemas/special';
export * from './schemas/notification';
export * from './schemas/integration';
export * from './schemas/review';
export * from './schemas/coupon';
export * from './schemas/shipping';
export * from './schemas/wishlist';
export * from './schemas/address';
export * from './schemas/message';
export * from './schemas/refund';
export * from './schemas/abandoned-cart';
export * from './schemas/gift-card';
export * from './schemas/tax-rate';
export * from './schemas/payment-method';
export * from './schemas/loyalty';
export * from './schemas/subscription';
export * from './schemas/campaign';
export * from './schemas/currency';

// ─── API Client ─────────────────────────────────────────
export { ApiClient, ApiError } from './api-client';

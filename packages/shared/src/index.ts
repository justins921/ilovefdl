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
} from './types';

export type {
  // Core model interfaces
  User,
  Vendor,
  VendorConnection,
  Product,
  Order,
  OrderItem,
  BlogPost,
  Bar,
  Special,
  PushToken,
  NotificationPreference,

  // Supporting types
  ShippingAddress,
  BarHours,
  CommissionBreakdown,

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

// ─── API Client ─────────────────────────────────────────
export { ApiClient, ApiError } from './api-client';

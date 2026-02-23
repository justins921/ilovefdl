// ─── ENUMS ───────────────────────────────────────────────

export enum Role {
  ADMIN = 'ADMIN',
  VENDOR = 'VENDOR',
  EDITOR = 'EDITOR',
  USER = 'USER',
}

export enum VendorStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  SUSPENDED = 'SUSPENDED',
}

export enum OrderStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  FULFILLED = 'FULFILLED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum PostStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
}

export enum PostCategory {
  THE_FONDY_FRONTLINE = 'THE_FONDY_FRONTLINE',
  FACES_OF_OUR_FUTURE = 'FACES_OF_OUR_FUTURE',
  FINDING_BALANCE = 'FINDING_BALANCE',
  PLAY_EXPLORE_REPEAT = 'PLAY_EXPLORE_REPEAT',
  HOMEGROWN_HEROS = 'HOMEGROWN_HEROS',
  THE_CREATIVE_CORNER = 'THE_CREATIVE_CORNER',
  WEEKLY_SAVINGS = 'WEEKLY_SAVINGS',
  UNCATEGORIZED = 'UNCATEGORIZED',
}

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

export enum ExternalPlatform {
  NATIVE = 'NATIVE',
  SHOPIFY = 'SHOPIFY',
  SQUARE = 'SQUARE',
  ETSY = 'ETSY',
}

export enum CouponType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
  FREE_SHIPPING = 'FREE_SHIPPING',
}

export enum ShippingType {
  FLAT_RATE = 'FLAT_RATE',
  FREE = 'FREE',
  WEIGHT_BASED = 'WEIGHT_BASED',
  PRICE_BASED = 'PRICE_BASED',
  LOCAL_PICKUP = 'LOCAL_PICKUP',
}

export enum RefundStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

export enum GiftCardStatus {
  ACTIVE = 'ACTIVE',
  REDEEMED = 'REDEEMED',
  EXPIRED = 'EXPIRED',
  DISABLED = 'DISABLED',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
}

export enum CampaignStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  SENDING = 'SENDING',
  SENT = 'SENT',
  CANCELLED = 'CANCELLED',
}

export enum CampaignType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

// ─── INTERFACES ──────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Vendor {
  id: string;
  userId: string;
  businessName: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  address: string | null;
  phone: string | null;
  website: string | null;
  socialLinks: Record<string, string> | null;
  status: VendorStatus;
  stripeAccountId: string | null;
  stripeOnboarded: boolean;
  commissionRate: number;
  vacationMode: boolean;
  vacationMessage: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  user?: User;
  products?: Product[];
  _count?: { products: number; reviews: number };
  averageRating?: number;
}

export interface VendorConnection {
  id: string;
  vendorId: string;
  platform: ExternalPlatform;
  accessToken: string | null;
  refreshToken: string | null;
  shopDomain: string | null;
  externalShopId: string | null;
  lastSyncAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  vendorId: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  sku: string | null;
  weight: number | null;
  weightUnit: string | null;
  images: string[];
  categoryTags: string[];
  inventory: number;
  lowStockThreshold: number;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  digitalFiles: Array<{ name: string; url: string; size: number }> | null;
  maxDownloads: number | null;
  externalPlatform: ExternalPlatform;
  externalId: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  vendor?: Vendor;
  variants?: ProductVariant[];
  attributes?: ProductAttribute[];
  reviews?: Review[];
  averageRating?: number;
  reviewCount?: number;
}

export interface ProductVariant {
  id: string;
  productId: string;
  name: string;
  sku: string | null;
  price: number;
  compareAtPrice: number | null;
  inventory: number;
  images: string[];
  options: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductAttribute {
  id: string;
  productId: string;
  name: string;
  values: string[];
  createdAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  vendorId: string;
  rating: number;
  title: string | null;
  body: string | null;
  images: string[];
  isVerifiedPurchase: boolean;
  isApproved: boolean;
  createdAt: string;
  updatedAt: string;

  user?: User;
  product?: Product;
}

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;

  product?: Product;
}

export interface SavedAddress {
  id: string;
  userId: string;
  label: string;
  name: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Coupon {
  id: string;
  vendorId: string | null;
  code: string;
  type: CouponType;
  value: number;
  minOrderAmount: number | null;
  maxUses: number | null;
  usedCount: number;
  startsAt: string | null;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ShippingProfile {
  id: string;
  vendorId: string;
  name: string;
  shippingType: ShippingType;
  price: number;
  freeAbove: number | null;
  estimatedDays: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  userId: string;
  vendorId: string;
  status: OrderStatus;

  subtotal: number;
  tax: number;
  shipping: number;
  discount: number;
  total: number;

  commissionBaseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorNetAmount: number;
  processorFeeAmount: number;

  stripeSessionId: string | null;
  stripePaymentIntent: string | null;
  couponCode: string | null;
  trackingNumber: string | null;
  trackingCarrier: string | null;
  shippedAt: string | null;
  fulfilledAt: string | null;

  currency: string;
  exchangeRate: number;
  giftCardCode: string | null;
  giftCardAmount: number;

  shippingAddress: ShippingAddress | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  user?: User;
  vendor?: Vendor;
  items?: OrderItem[];
  refunds?: Refund[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  variantName: string | null;
  quantity: number;
  unitPrice: number;
  total: number;

  // Relations (optional, included when populated)
  product?: Product;
}

export interface Refund {
  id: string;
  orderId: string;
  amount: number;
  reason: string | null;
  status: RefundStatus;
  stripeRefundId: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Conversation {
  id: string;
  subject: string | null;
  orderId: string | null;
  productId: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;

  participants?: ConversationParticipant[];
  messages?: Message[];
  unreadCount?: number;
}

export interface ConversationParticipant {
  id: string;
  conversationId: string;
  userId: string;
  lastReadAt: string | null;
  createdAt: string;
  user?: User;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  recipientId: string | null;
  body: string;
  isRead: boolean;
  createdAt: string;

  sender?: User;
}

export interface BlogPost {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  featuredImage: string | null;
  category: PostCategory;
  tags: string[];
  status: PostStatus;
  publishedAt: string | null;
  scheduledAt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  wpOriginalId: number | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  author?: User;
}

export interface Bar {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  address: string;
  mapLink: string | null;
  phone: string | null;
  website: string | null;
  hours: BarHours | null;
  photos: string[];
  socialLinks: Record<string, string> | null;
  ownerId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  specials?: Special[];
}

export interface Special {
  id: string;
  barId: string;
  dayOfWeek: DayOfWeek;
  title: string;
  description: string | null;
  price: string | null;
  startTime: string | null;
  endTime: string | null;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  bar?: Bar;
}

export interface PushToken {
  id: string;
  userId: string;
  token: string;
  platform: string;
  createdAt: string;
}

export interface NotificationPreference {
  id: string;
  userId: string;
  breakingNews: boolean;
  dailySpecials: boolean;
  orderUpdates: boolean;
  categoryAlerts: Record<string, boolean> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── ABANDONED CART ─────────────────────────────────────

export interface AbandonedCart {
  id: string;
  userId: string | null;
  email: string | null;
  items: AbandonedCartItem[];
  subtotal: number;
  recoveryToken: string;
  emailsSent: number;
  lastEmailAt: string | null;
  recoveredAt: string | null;
  isRecovered: boolean;
  createdAt: string;
  updatedAt: string;

  user?: User;
}

export interface AbandonedCartItem {
  productId: string;
  quantity: number;
  price: number;
  name: string;
  image: string | null;
}

// ─── GIFT CARDS ─────────────────────────────────────────

export interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  currentBalance: number;
  purchasedById: string | null;
  recipientEmail: string | null;
  recipientName: string | null;
  message: string | null;
  status: GiftCardStatus;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;

  purchasedBy?: User;
  transactions?: GiftCardTransaction[];
}

export interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  orderId: string | null;
  amount: number;
  type: string; // 'purchase' | 'redemption' | 'refund'
  createdAt: string;
}

// ─── TAX RATES ──────────────────────────────────────────

export interface TaxRate {
  id: string;
  country: string;
  state: string;
  rate: number;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── PAYMENT METHODS ────────────────────────────────────

export interface PaymentMethod {
  id: string;
  userId: string;
  stripePaymentMethodId: string;
  type: string;
  last4: string;
  brand: string | null;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── LOYALTY / REWARDS ──────────────────────────────────

export interface LoyaltyAccount {
  id: string;
  userId: string;
  points: number;
  lifetimePoints: number;
  tier: string; // BRONZE, SILVER, GOLD, PLATINUM
  createdAt: string;
  updatedAt: string;

  transactions?: LoyaltyTransaction[];
}

export interface LoyaltyTransaction {
  id: string;
  accountId: string;
  points: number;
  type: string; // 'earn' | 'redeem' | 'expire' | 'bonus'
  description: string;
  orderId: string | null;
  createdAt: string;
}

// ─── SUBSCRIPTIONS ──────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  productId: string;
  vendorId: string;
  quantity: number;
  intervalDays: number;
  price: number;
  status: SubscriptionStatus;
  nextDeliveryAt: string;
  lastDeliveryAt: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;

  product?: Product;
  user?: User;
}

// ─── MARKETING CAMPAIGNS ────────────────────────────────

export interface Campaign {
  id: string;
  vendorId: string | null;
  name: string;
  subject: string | null;
  body: string;
  type: CampaignType;
  status: CampaignStatus;
  audience: string;
  sentCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt: string | null;
  sentAt: string | null;
  createdAt: string;
  updatedAt: string;

  vendor?: Vendor;
}

// ─── SUPPORTING TYPES ───────────────────────────────────

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface BarHours {
  [key: string]: { open: string; close: string } | null;
}

// ─── COMMISSION CALCULATION ─────────────────────────────

export interface CommissionBreakdown {
  commissionBaseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorNetAmount: number;
  processorFeeAmount: number;
}

// ─── ANALYTICS TYPES ────────────────────────────────────

export interface VendorAnalytics {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  averageOrderValue: number;
  totalCommissionPaid: number;
  pendingPayouts: number;
  revenueByMonth: Array<{ month: string; revenue: number; orders: number }>;
  topProducts: Array<{ productId: string; name: string; revenue: number; quantity: number }>;
}

// ─── API RESPONSE TYPES ─────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, string[]>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
}

// ─── AUTH TYPES ──────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

export interface AuthUser {
  user: User;
  tokens: AuthTokens;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ─── CHECKOUT TYPES ─────────────────────────────────────

export interface CheckoutLineItem {
  productId: string;
  quantity: number;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}

// ─── INTEGRATION / SYNC TYPES ──────────────────────────

export type SyncDirection = 'pull' | 'push' | 'both';

export interface ExternalProduct {
  externalId: string;
  name: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  images: string[];
  inventory: number;
  sku: string | null;
  categoryTags: string[];
  platform: ExternalPlatform;
}

export interface ImportResult {
  imported: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export interface SyncResult {
  synced: number;
  errors: string[];
  direction: SyncDirection;
  timestamp: string;
}

export interface ConnectionStatus {
  platform: ExternalPlatform;
  isConnected: boolean;
  shopDomain: string | null;
  lastSyncAt: string | null;
  productCount: number;
}

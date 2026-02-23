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
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  user?: User;
  products?: Product[];
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
  images: string[];
  categoryTags: string[];
  inventory: number;
  isActive: boolean;
  externalPlatform: ExternalPlatform;
  externalId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  vendor?: Vendor;
}

export interface Order {
  id: string;
  userId: string;
  vendorId: string;
  status: OrderStatus;

  subtotal: number;
  tax: number;
  shipping: number;
  total: number;

  commissionBaseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  vendorNetAmount: number;
  processorFeeAmount: number;

  stripeSessionId: string | null;
  stripePaymentIntent: string | null;

  shippingAddress: ShippingAddress | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optional, included when populated)
  user?: User;
  vendor?: Vendor;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  total: number;

  // Relations (optional, included when populated)
  product?: Product;
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
  /** The base amount used for commission calculation (typically the subtotal) */
  commissionBaseAmount: number;
  /** The commission rate as a decimal (e.g. 0.05 for 5%) */
  commissionRate: number;
  /** The platform's commission: commissionBaseAmount * commissionRate */
  commissionAmount: number;
  /** What the vendor receives: total - commissionAmount - processorFeeAmount */
  vendorNetAmount: number;
  /** Stripe/processor fees charged on the transaction */
  processorFeeAmount: number;
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

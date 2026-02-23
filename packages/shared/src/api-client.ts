import type {
  ApiResponse,
  ApiErrorResponse,
  PaginatedResponse,
  PaginationParams,
  LoginResponse,
  CheckoutSession,
  CheckoutLineItem,
  ShippingAddress,
  User,
  Vendor,
  Product,
  Order,
  BlogPost,
  Bar,
  Special,
  PushToken,
  NotificationPreference,
  ConnectionStatus,
  ExternalProduct,
  ImportResult,
  SyncResult,
  SyncDirection,
} from './types';
import type {
  CreateVendorInput,
  UpdateVendorInput,
  CreateProductInput,
  UpdateProductInput,
  CreateOrderInput,
  CreateBlogPostInput,
  UpdateBlogPostInput,
  CreateBarInput,
  UpdateBarInput,
  CreateSpecialInput,
  UpdateSpecialInput,
  RegisterPushTokenInput,
  UpdateNotificationPreferenceInput,
  ConnectPlatformInput,
  ImportProductsInput,
  SyncInventoryInput,
  DisconnectPlatformInput,
} from './validation';

// ─── ERROR CLASS ────────────────────────────────────────

export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly details?: Record<string, string[]>;

  constructor(response: ApiErrorResponse) {
    super(response.message);
    this.name = 'ApiError';
    this.statusCode = response.statusCode;
    this.details = response.details;
  }
}

// ─── API CLIENT ─────────────────────────────────────────

export class ApiClient {
  private baseUrl: string;
  private token: string | null;

  constructor(baseUrl: string, token?: string) {
    // Remove trailing slash
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.token = token ?? null;
  }

  /** Update the auth token (e.g. after login) */
  setToken(token: string | null): void {
    this.token = token;
  }

  /** Get the current auth token */
  getToken(): string | null {
    return this.token;
  }

  // ─── Core request method ──────────────────────────────

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    const url = new URL(`${this.baseUrl}${path}`);

    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      let errorBody: ApiErrorResponse;
      try {
        errorBody = (await response.json()) as ApiErrorResponse;
      } catch {
        errorBody = {
          error: 'UnknownError',
          message: `Request failed with status ${response.status}`,
          statusCode: response.status,
        };
      }
      throw new ApiError(errorBody);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  private get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>('GET', path, undefined, params);
  }

  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  private patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  private put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  private delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  // ─── AUTH ─────────────────────────────────────────────

  /** Sign in with email and password */
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return this.post<ApiResponse<LoginResponse>>('/auth/login', { email, password });
  }

  /** Create a new account */
  async register(email: string, password: string, name: string): Promise<ApiResponse<LoginResponse>> {
    return this.post<ApiResponse<LoginResponse>>('/auth/register', { email, password, name });
  }

  /** Get the current authenticated user */
  async getMe(): Promise<ApiResponse<User>> {
    return this.get<ApiResponse<User>>('/auth/me');
  }

  /** Request a password reset email */
  async forgotPassword(email: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<ApiResponse<{ message: string }>>('/auth/forgot-password', { email });
  }

  /** Reset password with token */
  async resetPassword(token: string, password: string): Promise<ApiResponse<{ message: string }>> {
    return this.post<ApiResponse<{ message: string }>>('/auth/reset-password', { token, password });
  }

  // ─── VENDORS ──────────────────────────────────────────

  /** List vendors with optional pagination */
  async getVendors(
    params?: PaginationParams & { status?: string },
  ): Promise<PaginatedResponse<Vendor>> {
    return this.get<PaginatedResponse<Vendor>>('/vendors', params as Record<string, string | number | boolean | undefined>);
  }

  /** Get a single vendor by ID or slug */
  async getVendor(idOrSlug: string): Promise<ApiResponse<Vendor>> {
    return this.get<ApiResponse<Vendor>>(`/vendors/${idOrSlug}`);
  }

  /** Create a new vendor profile */
  async createVendor(data: CreateVendorInput): Promise<ApiResponse<Vendor>> {
    return this.post<ApiResponse<Vendor>>('/vendors', data);
  }

  /** Update an existing vendor */
  async updateVendor(id: string, data: UpdateVendorInput): Promise<ApiResponse<Vendor>> {
    return this.put<ApiResponse<Vendor>>(`/vendors/${id}`, data);
  }

  // ─── PRODUCTS ─────────────────────────────────────────

  /** List products with optional filtering and pagination */
  async getProducts(
    params?: PaginationParams & { vendorId?: string; category?: string; search?: string },
  ): Promise<PaginatedResponse<Product>> {
    return this.get<PaginatedResponse<Product>>('/products', params as Record<string, string | number | boolean | undefined>);
  }

  /** Get a single product by ID or slug */
  async getProduct(idOrSlug: string): Promise<ApiResponse<Product>> {
    return this.get<ApiResponse<Product>>(`/products/${idOrSlug}`);
  }

  /** Create a new product */
  async createProduct(data: CreateProductInput): Promise<ApiResponse<Product>> {
    return this.post<ApiResponse<Product>>('/products', data);
  }

  /** Update an existing product */
  async updateProduct(id: string, data: UpdateProductInput): Promise<ApiResponse<Product>> {
    return this.put<ApiResponse<Product>>(`/products/${id}`, data);
  }

  // ─── ORDERS / CHECKOUT ────────────────────────────────

  /** Create a Stripe checkout session for the given line items */
  async createCheckoutSession(
    vendorId: string,
    items: CheckoutLineItem[],
    shippingAddress?: CreateOrderInput['shippingAddress'],
  ): Promise<ApiResponse<CheckoutSession>> {
    return this.post<ApiResponse<CheckoutSession>>('/checkout', {
      vendorId,
      items,
      shippingAddress,
    });
  }

  /** List orders for the current user (or all orders for admins) */
  async getOrders(
    params?: PaginationParams & { vendorId?: string; status?: string },
  ): Promise<PaginatedResponse<Order>> {
    return this.get<PaginatedResponse<Order>>('/orders', params as Record<string, string | number | boolean | undefined>);
  }

  /** Get a single order by ID */
  async getOrder(id: string): Promise<ApiResponse<Order>> {
    return this.get<ApiResponse<Order>>(`/orders/${id}`);
  }

  /** Create a multi-vendor checkout session */
  async createMultiVendorCheckout(
    items: CheckoutLineItem[],
    shippingAddress?: ShippingAddress,
    notes?: string,
  ): Promise<ApiResponse<{ sessionId: string; sessionUrl: string; orderGroupId: string; orderIds: string[] }>> {
    return this.post('/checkout/multi', { items, shippingAddress, notes });
  }

  // ─── BLOG POSTS ───────────────────────────────────────

  /** List blog posts with optional filtering and pagination */
  async getPosts(
    params?: PaginationParams & { category?: string; status?: string; search?: string },
  ): Promise<PaginatedResponse<BlogPost>> {
    return this.get<PaginatedResponse<BlogPost>>('/posts', params as Record<string, string | number | boolean | undefined>);
  }

  /** Get a single blog post by ID or slug */
  async getPost(idOrSlug: string): Promise<ApiResponse<BlogPost>> {
    return this.get<ApiResponse<BlogPost>>(`/posts/${idOrSlug}`);
  }

  /** Create a new blog post */
  async createPost(data: CreateBlogPostInput): Promise<ApiResponse<BlogPost>> {
    return this.post<ApiResponse<BlogPost>>('/posts', data);
  }

  /** Update an existing blog post */
  async updatePost(id: string, data: UpdateBlogPostInput): Promise<ApiResponse<BlogPost>> {
    return this.put<ApiResponse<BlogPost>>(`/posts/${id}`, data);
  }

  /** Delete a blog post (admin only) */
  async deletePost(id: string): Promise<void> {
    return this.delete(`/posts/${id}`);
  }

  /** Delete a product (soft delete) */
  async deleteProduct(id: string): Promise<void> {
    return this.delete(`/products/${id}`);
  }

  // ─── BARS ─────────────────────────────────────────────

  /** List bars with optional pagination */
  async getBars(
    params?: PaginationParams & { search?: string },
  ): Promise<PaginatedResponse<Bar>> {
    return this.get<PaginatedResponse<Bar>>('/bars', params as Record<string, string | number | boolean | undefined>);
  }

  /** Get a single bar by ID or slug */
  async getBar(idOrSlug: string): Promise<ApiResponse<Bar>> {
    return this.get<ApiResponse<Bar>>(`/bars/${idOrSlug}`);
  }

  /** Create a new bar */
  async createBar(data: CreateBarInput): Promise<ApiResponse<Bar>> {
    return this.post<ApiResponse<Bar>>('/bars', data);
  }

  /** Update an existing bar */
  async updateBar(id: string, data: UpdateBarInput): Promise<ApiResponse<Bar>> {
    return this.put<ApiResponse<Bar>>(`/bars/${id}`, data);
  }

  // ─── SPECIALS ─────────────────────────────────────────

  /** List specials for a bar, optionally filtered by day */
  async getSpecials(
    params?: PaginationParams & { barId?: string; dayOfWeek?: string },
  ): Promise<PaginatedResponse<Special>> {
    return this.get<PaginatedResponse<Special>>('/specials', params as Record<string, string | number | boolean | undefined>);
  }

  /** Get today's specials across all bars */
  async getTodaySpecials(): Promise<ApiResponse<Special[]>> {
    return this.get<ApiResponse<Special[]>>('/specials/today');
  }

  /** Create a new special */
  async createSpecial(data: CreateSpecialInput): Promise<ApiResponse<Special>> {
    return this.post<ApiResponse<Special>>('/specials', data);
  }

  /** Update an existing special */
  async updateSpecial(id: string, data: UpdateSpecialInput): Promise<ApiResponse<Special>> {
    return this.put<ApiResponse<Special>>(`/specials/${id}`, data);
  }

  // ─── PUSH NOTIFICATIONS ──────────────────────────────

  /** Register a push notification token for the current user */
  async registerPushToken(data: RegisterPushTokenInput): Promise<ApiResponse<PushToken>> {
    return this.post<ApiResponse<PushToken>>('/push-tokens', data);
  }

  /** Update notification preferences for the current user */
  async updateNotificationPreferences(
    data: UpdateNotificationPreferenceInput,
  ): Promise<ApiResponse<NotificationPreference>> {
    return this.put<ApiResponse<NotificationPreference>>('/notification-preferences', data);
  }

  /** Get notification preferences for the current user */
  async getNotificationPreferences(): Promise<ApiResponse<NotificationPreference>> {
    return this.get<ApiResponse<NotificationPreference>>('/notification-preferences');
  }

  // ─── INTEGRATIONS ──────────────────────────────────────

  /** Get connection status for all external platforms */
  async getIntegrationConnections(): Promise<ApiResponse<ConnectionStatus[]>> {
    return this.get<ApiResponse<ConnectionStatus[]>>('/integrations/connections');
  }

  /** Initiate or complete a platform connection (OAuth) */
  async connectPlatform(
    data: ConnectPlatformInput,
  ): Promise<ApiResponse<{ authUrl?: string; connected?: boolean; platform: string }>> {
    return this.post('/integrations/connect', data);
  }

  /** Disconnect an external platform */
  async disconnectPlatform(
    data: DisconnectPlatformInput,
  ): Promise<ApiResponse<{ disconnected: boolean; platform: string }>> {
    return this.post('/integrations/disconnect', data);
  }

  /** Fetch products from an external platform for preview before import */
  async getExternalProducts(
    platform: string,
  ): Promise<ApiResponse<(ExternalProduct & { alreadyImported: boolean })[]>> {
    return this.get(`/integrations/products/${platform.toLowerCase()}`);
  }

  /** Import products from an external platform */
  async importProducts(data: ImportProductsInput): Promise<ApiResponse<ImportResult>> {
    return this.post('/integrations/import', data);
  }

  /** Sync inventory between local and external platform */
  async syncInventory(data: SyncInventoryInput): Promise<ApiResponse<SyncResult>> {
    return this.post('/integrations/sync', data);
  }
}

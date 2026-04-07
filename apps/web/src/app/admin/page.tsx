'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Newspaper,
  Beer,
  ShoppingBag,
  Store,
  Plus,
  Pencil,
  X,
  Menu,
  Loader2,
  AlertCircle,
  ShoppingCart,
  DollarSign,
  ChevronLeft,
  Eye,
  EyeOff,
  ListFilter,
  ImageIcon,
  Users,
  RotateCcw,
  Package,
  CheckCircle,
  XCircle,
  ClipboardList,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate, formatCategoryName, slugify } from '@/lib/utils';
import type {
  Vendor,
  Product,
  BlogPost,
  Bar,
  Special,
  Order,
  Refund,
  User as UserType,
} from '@ilovefdl/shared';
import {
  PostCategory,
  PostStatus,
  DayOfWeek,
  ExternalPlatform,
  RefundStatus,
} from '@ilovefdl/shared';

// ─── TYPES ──────────────────────────────────────────────

type ActiveTab = 'overview' | 'applications' | 'posts' | 'bars' | 'products' | 'vendors' | 'orders' | 'refunds' | 'users';

interface DashboardStats {
  vendorCount: number;
  productCount: number;
  orderCount: number;
  revenue: number;
}

// ─── SIDEBAR NAV ITEMS ──────────────────────────────────

const navItems: { id: ActiveTab; label: string; icon: typeof BarChart3 }[] = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'applications', label: 'Applications', icon: ClipboardList },
  { id: 'posts', label: 'Blog Posts', icon: Newspaper },
  { id: 'bars', label: 'Bars & Specials', icon: Beer },
  { id: 'products', label: 'Products', icon: ShoppingBag },
  { id: 'vendors', label: 'Vendors', icon: Store },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'refunds', label: 'Refunds', icon: RotateCcw },
  { id: 'users', label: 'Users', icon: Users },
];

// ─── MAIN COMPONENT ─────────────────────────────────────

export default function AdminPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-light flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-light transform transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-light">
          <h2 className="text-lg font-bold text-primary">Admin</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-primary/60 hover:text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-primary/70 hover:bg-light hover:text-primary'
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </button>
            );
          })}
        </nav>
        {user && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-light">
            <p className="text-xs text-primary/50 truncate">{user.email}</p>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Top bar with hamburger */}
        <div className="bg-white border-b border-light px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-primary/60 hover:text-primary"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-primary">
              {navItems.find((n) => n.id === activeTab)?.label ?? 'Dashboard'}
            </h1>
          </div>
        </div>

        <div className="p-4 sm:p-6 lg:p-8">
          {activeTab === 'overview' && <OverviewSection />}
          {activeTab === 'applications' && <ApplicationsSection />}
          {activeTab === 'posts' && <BlogPostsSection />}
          {activeTab === 'bars' && <BarsSection />}
          {activeTab === 'products' && <ProductsSection />}
          {activeTab === 'vendors' && <VendorsSection />}
          {activeTab === 'orders' && <OrdersAdminSection />}
          {activeTab === 'refunds' && <RefundsAdminSection />}
          {activeTab === 'users' && <UsersAdminSection />}
        </div>
      </main>
    </div>
  );
}

// ─── OVERVIEW SECTION ───────────────────────────────────

function OverviewSection() {
  const [stats, setStats] = useState<DashboardStats>({
    vendorCount: 0,
    productCount: 0,
    orderCount: 0,
    revenue: 0,
  });
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [vendorsRes, productsRes, ordersRes] = await Promise.all([
          api.getVendors({ limit: 1 }),
          api.getProducts({ limit: 1 }),
          api.getOrders({ limit: 10 }),
        ]);

        const revenue = ordersRes.data.reduce(
          (sum, order) => sum + order.total,
          0
        );

        setStats({
          vendorCount: vendorsRes.total,
          productCount: productsRes.total,
          orderCount: ordersRes.total,
          revenue,
        });
        setRecentOrders(ordersRes.data);
      } catch {
        // Dashboard data failed — show zeros
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Vendors', value: stats.vendorCount, icon: Store, color: 'text-teal', bg: 'bg-teal/10' },
    { label: 'Total Products', value: stats.productCount, icon: ShoppingBag, color: 'text-accent', bg: 'bg-accent/10' },
    { label: 'Total Orders', value: stats.orderCount, icon: ShoppingCart, color: 'text-primary', bg: 'bg-primary/10' },
    { label: 'Revenue', value: formatPrice(stats.revenue), icon: DollarSign, color: 'text-teal', bg: 'bg-teal/10' },
  ];

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-blue-100 text-blue-800',
    FULFILLED: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  return (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-light p-6">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-2xl font-bold text-primary">
              {loading ? (
                <span className="inline-block w-16 h-7 bg-light rounded animate-pulse" />
              ) : (
                stat.value
              )}
            </p>
            <p className="text-sm text-primary/60 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl border border-light overflow-hidden">
        <div className="px-6 py-4 border-b border-light">
          <h2 className="text-lg font-bold text-primary">Recent Orders</h2>
        </div>
        {loading ? (
          <div className="p-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="h-4 bg-light rounded w-1/6" />
                <div className="h-4 bg-light rounded w-1/4" />
                <div className="h-4 bg-light rounded w-1/6" />
                <div className="h-4 bg-light rounded w-1/6" />
              </div>
            ))}
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                  <th className="px-6 py-3">Order ID</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-light/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-primary/60">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">
                      {order.user?.name || order.user?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {order.vendor?.businessName || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          statusColors[order.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {formatDate(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <ShoppingCart className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/60 text-sm">No orders yet.</p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── BLOG POSTS SECTION ─────────────────────────────────

function BlogPostsSection() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'ALL'>('ALL');

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formCategory, setFormCategory] = useState<PostCategory>(PostCategory.UNCATEGORIZED);
  const [formFeaturedImage, setFormFeaturedImage] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState('');

  const fetchPosts = useCallback(async (filter: PostStatus | 'ALL') => {
    setLoading(true);
    setError(null);
    try {
      const params: { limit: number; status?: PostStatus } = { limit: 50 };
      if (filter !== 'ALL') {
        params.status = filter;
      }
      const res = await api.getPosts(params);
      setPosts(res.data);
    } catch {
      setError('Failed to load blog posts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(statusFilter);
  }, [fetchPosts, statusFilter]);

  function resetForm() {
    setFormTitle('');
    setFormSlug('');
    setFormContent('');
    setFormExcerpt('');
    setFormCategory(PostCategory.UNCATEGORIZED);
    setFormFeaturedImage('');
    setFormTags('');
    setFormScheduledAt('');
  }

  function openCreate() {
    setEditingPost(null);
    resetForm();
    setShowModal(true);
  }

  function openEdit(post: BlogPost) {
    setEditingPost(post);
    setFormTitle(post.title);
    setFormSlug(post.slug);
    setFormContent(post.content);
    setFormExcerpt(post.excerpt ?? '');
    setFormCategory(post.category);
    setFormFeaturedImage(post.featuredImage ?? '');
    setFormTags(post.tags.join(', '));
    setFormScheduledAt(
      post.scheduledAt
        ? new Date(post.scheduledAt).toISOString().slice(0, 16)
        : ''
    );
    setShowModal(true);
  }

  async function handleSave(targetStatus: PostStatus) {
    setSaving(true);
    setError(null);
    try {
      const data = {
        title: formTitle,
        slug: formSlug,
        content: formContent,
        excerpt: formExcerpt || undefined,
        category: formCategory,
        status: targetStatus,
        featuredImage: formFeaturedImage || undefined,
        tags: formTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        scheduledAt:
          targetStatus === PostStatus.SCHEDULED && formScheduledAt
            ? new Date(formScheduledAt).toISOString()
            : undefined,
      };

      if (editingPost) {
        await api.updatePost(editingPost.id, data);
      } else {
        await api.createPost(data);
      }

      setShowModal(false);
      resetForm();
      await fetchPosts(statusFilter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post.');
    } finally {
      setSaving(false);
    }
  }

  const postStatusColors: Record<string, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    PUBLISHED: 'bg-green-100 text-green-800',
    SCHEDULED: 'bg-blue-100 text-blue-800',
  };

  const postStatusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    PUBLISHED: 'Published',
    SCHEDULED: 'Scheduled',
  };

  const filterTabs: { key: PostStatus | 'ALL'; label: string }[] = [
    { key: 'ALL', label: 'All' },
    { key: PostStatus.DRAFT, label: 'Drafts' },
    { key: PostStatus.SCHEDULED, label: 'Scheduled' },
    { key: PostStatus.PUBLISHED, label: 'Published' },
  ];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-primary/60">{posts.length} posts</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Post
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1 mb-4 p-1 bg-light rounded-lg">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === tab.key
                ? 'bg-white text-primary shadow-sm'
                : 'text-primary/50 hover:text-primary/70'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-light overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : posts.length === 0 ? (
          <div className="p-12 text-center">
            <Newspaper className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/60 text-sm">
              {statusFilter === 'ALL'
                ? 'No blog posts yet.'
                : `No ${statusFilter.toLowerCase()} posts.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Author</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-light/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary max-w-xs truncate">
                      {post.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {formatCategoryName(post.category)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          postStatusColors[post.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {postStatusLabels[post.status] || post.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {post.author?.name || post.author?.email || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {formatDate(post.publishedAt ?? post.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => openEdit(post)}
                        className="text-primary/50 hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-primary">
                {editingPost ? 'Edit Post' : 'New Post'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-primary/40 hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => {
                    setFormTitle(e.target.value);
                    if (!editingPost) {
                      setFormSlug(slugify(e.target.value));
                    }
                  }}
                  className="input-field w-full"
                  placeholder="Post title"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Slug</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="input-field w-full"
                  placeholder="post-slug"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Content</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="input-field w-full h-40 resize-y"
                  placeholder="Write your post content..."
                />
              </div>

              {/* Excerpt */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Excerpt</label>
                <textarea
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  className="input-field w-full h-20 resize-y"
                  placeholder="Brief summary..."
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Category</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as PostCategory)}
                  className="input-field w-full"
                >
                  {Object.values(PostCategory).map((cat) => (
                    <option key={cat} value={cat}>
                      {formatCategoryName(cat)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Schedule date (shown for scheduling) */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Schedule For (optional)
                </label>
                <input
                  type="datetime-local"
                  value={formScheduledAt}
                  onChange={(e) => setFormScheduledAt(e.target.value)}
                  className="input-field w-full"
                />
                <p className="text-xs text-primary/40 mt-1">
                  Set a date to schedule this post for future publishing.
                </p>
              </div>

              {/* Featured Image */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Featured Image URL
                </label>
                <input
                  type="text"
                  value={formFeaturedImage}
                  onChange={(e) => setFormFeaturedImage(e.target.value)}
                  className="input-field w-full"
                  placeholder="https://..."
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="input-field w-full"
                  placeholder="news, local, events"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mt-6 pt-4 border-t border-light">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline"
                disabled={saving}
              >
                Cancel
              </button>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Save as Draft */}
                <button
                  onClick={() => handleSave(PostStatus.DRAFT)}
                  className="btn-outline flex items-center gap-2"
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Draft
                </button>
                {/* Schedule (only if a date is set) */}
                {formScheduledAt && (
                  <button
                    onClick={() => handleSave(PostStatus.SCHEDULED)}
                    className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={saving}
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    Schedule
                  </button>
                )}
                {/* Publish Now */}
                <button
                  onClick={() => handleSave(PostStatus.PUBLISHED)}
                  className="btn-primary flex items-center gap-2"
                  disabled={saving}
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Publish Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── BARS & SPECIALS SECTION ────────────────────────────

function BarsSection() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showBarModal, setShowBarModal] = useState(false);
  const [editingBar, setEditingBar] = useState<Bar | null>(null);
  const [saving, setSaving] = useState(false);

  // Bar form state
  const [barName, setBarName] = useState('');
  const [barSlug, setBarSlug] = useState('');
  const [barAddress, setBarAddress] = useState('');
  const [barDescription, setBarDescription] = useState('');
  const [barPhone, setBarPhone] = useState('');
  const [barWebsite, setBarWebsite] = useState('');

  // Specials sub-section
  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
  const [specials, setSpecials] = useState<Special[]>([]);
  const [loadingSpecials, setLoadingSpecials] = useState(false);
  const [showSpecialModal, setShowSpecialModal] = useState(false);
  const [editingSpecial, setEditingSpecial] = useState<Special | null>(null);
  const [savingSpecial, setSavingSpecial] = useState(false);

  // Special form state
  const [specialDay, setSpecialDay] = useState<DayOfWeek>(DayOfWeek.MONDAY);
  const [specialTitle, setSpecialTitle] = useState('');
  const [specialDescription, setSpecialDescription] = useState('');
  const [specialPrice, setSpecialPrice] = useState('');
  const [specialStartTime, setSpecialStartTime] = useState('');
  const [specialEndTime, setSpecialEndTime] = useState('');
  const [specialIsFeatured, setSpecialIsFeatured] = useState(false);

  const fetchBars = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getBars({ limit: 50 });
      setBars(res.data);
    } catch {
      setError('Failed to load bars.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBars();
  }, [fetchBars]);

  const fetchSpecials = useCallback(async (barId: string) => {
    setLoadingSpecials(true);
    try {
      const res = await api.getSpecials({ barId });
      setSpecials(res.data);
    } catch {
      setSpecials([]);
    } finally {
      setLoadingSpecials(false);
    }
  }, []);

  function resetBarForm() {
    setBarName('');
    setBarSlug('');
    setBarAddress('');
    setBarDescription('');
    setBarPhone('');
    setBarWebsite('');
  }

  function resetSpecialForm() {
    setSpecialDay(DayOfWeek.MONDAY);
    setSpecialTitle('');
    setSpecialDescription('');
    setSpecialPrice('');
    setSpecialStartTime('');
    setSpecialEndTime('');
    setSpecialIsFeatured(false);
  }

  function openCreateBar() {
    setEditingBar(null);
    resetBarForm();
    setShowBarModal(true);
  }

  function openEditBar(bar: Bar) {
    setEditingBar(bar);
    setBarName(bar.name);
    setBarSlug(bar.slug);
    setBarAddress(bar.address);
    setBarDescription(bar.description ?? '');
    setBarPhone(bar.phone ?? '');
    setBarWebsite(bar.website ?? '');
    setShowBarModal(true);
  }

  function openBarSpecials(bar: Bar) {
    setSelectedBar(bar);
    fetchSpecials(bar.id);
  }

  function openCreateSpecial() {
    setEditingSpecial(null);
    resetSpecialForm();
    setShowSpecialModal(true);
  }

  function openEditSpecial(special: Special) {
    setEditingSpecial(special);
    setSpecialDay(special.dayOfWeek);
    setSpecialTitle(special.title);
    setSpecialDescription(special.description ?? '');
    setSpecialPrice(special.price ?? '');
    setSpecialStartTime(special.startTime ?? '');
    setSpecialEndTime(special.endTime ?? '');
    setSpecialIsFeatured(special.isFeatured);
    setShowSpecialModal(true);
  }

  async function handleSaveBar() {
    setSaving(true);
    setError(null);
    try {
      const data = {
        name: barName,
        slug: barSlug,
        address: barAddress,
        description: barDescription || undefined,
        phone: barPhone || undefined,
        website: barWebsite || undefined,
        isActive: true,
        photos: [],
      };

      if (editingBar) {
        await api.updateBar(editingBar.id, data);
      } else {
        await api.createBar(data);
      }

      setShowBarModal(false);
      resetBarForm();
      await fetchBars();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save bar.');
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSpecial() {
    if (!selectedBar) return;
    setSavingSpecial(true);
    setError(null);
    try {
      const data = {
        barId: selectedBar.id,
        dayOfWeek: specialDay,
        title: specialTitle,
        description: specialDescription || undefined,
        price: specialPrice || undefined,
        startTime: specialStartTime || undefined,
        endTime: specialEndTime || undefined,
        isFeatured: specialIsFeatured,
        isActive: true,
      };

      if (editingSpecial) {
        // updateSpecial doesn't include barId in the schema
        const { barId: _, ...updateData } = data;
        await api.updateSpecial(editingSpecial.id, updateData);
      } else {
        await api.createSpecial(data);
      }

      setShowSpecialModal(false);
      resetSpecialForm();
      await fetchSpecials(selectedBar.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save special.');
    } finally {
      setSavingSpecial(false);
    }
  }

  async function handleToggleBarActive(bar: Bar) {
    try {
      await api.updateBar(bar.id, { isActive: !bar.isActive });
      await fetchBars();
    } catch {
      setError('Failed to update bar status.');
    }
  }

  // ─── If viewing specials for a specific bar ──────────

  if (selectedBar) {
    return (
      <>
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setSelectedBar(null)}
            className="text-primary/50 hover:text-primary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h3 className="text-lg font-bold text-primary">{selectedBar.name}</h3>
            <p className="text-sm text-primary/60">Manage specials for this bar</p>
          </div>
          <div className="ml-auto">
            <button onClick={openCreateSpecial} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Add Special
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-white rounded-xl border border-light overflow-hidden">
          {loadingSpecials ? (
            <div className="p-8 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
            </div>
          ) : specials.length === 0 ? (
            <div className="p-12 text-center">
              <Beer className="w-10 h-10 text-primary/20 mx-auto mb-3" />
              <p className="text-primary/60 text-sm">No specials yet for this bar.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                    <th className="px-6 py-3">Day</th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Price</th>
                    <th className="px-6 py-3">Time</th>
                    <th className="px-6 py-3">Featured</th>
                    <th className="px-6 py-3">Active</th>
                    <th className="px-6 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-light">
                  {specials.map((special) => (
                    <tr key={special.id} className="hover:bg-light/50 transition-colors">
                      <td className="px-6 py-4 text-sm text-primary font-medium">
                        {special.dayOfWeek.charAt(0) + special.dayOfWeek.slice(1).toLowerCase()}
                      </td>
                      <td className="px-6 py-4 text-sm text-primary">{special.title}</td>
                      <td className="px-6 py-4 text-sm text-primary/60">{special.price || '-'}</td>
                      <td className="px-6 py-4 text-sm text-primary/60">
                        {special.startTime && special.endTime
                          ? `${special.startTime} - ${special.endTime}`
                          : special.startTime || special.endTime || '-'}
                      </td>
                      <td className="px-6 py-4">
                        {special.isFeatured ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            Featured
                          </span>
                        ) : (
                          <span className="text-primary/30 text-xs">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {special.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => openEditSpecial(special)}
                          className="text-primary/50 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Special Modal */}
        {showSpecialModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-primary">
                  {editingSpecial ? 'Edit Special' : 'Add Special'}
                </h3>
                <button
                  onClick={() => setShowSpecialModal(false)}
                  className="text-primary/40 hover:text-primary"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Day of Week */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Day of Week
                  </label>
                  <select
                    value={specialDay}
                    onChange={(e) => setSpecialDay(e.target.value as DayOfWeek)}
                    className="input-field w-full"
                  >
                    {Object.values(DayOfWeek).map((day) => (
                      <option key={day} value={day}>
                        {day.charAt(0) + day.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Title</label>
                  <input
                    type="text"
                    value={specialTitle}
                    onChange={(e) => setSpecialTitle(e.target.value)}
                    className="input-field w-full"
                    placeholder="Special title"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Description
                  </label>
                  <textarea
                    value={specialDescription}
                    onChange={(e) => setSpecialDescription(e.target.value)}
                    className="input-field w-full h-20 resize-y"
                    placeholder="Describe the special..."
                  />
                </div>

                {/* Price */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Price</label>
                  <input
                    type="text"
                    value={specialPrice}
                    onChange={(e) => setSpecialPrice(e.target.value)}
                    className="input-field w-full"
                    placeholder="$5.00"
                  />
                </div>

                {/* Time row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Start Time (HH:MM)
                    </label>
                    <input
                      type="text"
                      value={specialStartTime}
                      onChange={(e) => setSpecialStartTime(e.target.value)}
                      className="input-field w-full"
                      placeholder="11:00"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      End Time (HH:MM)
                    </label>
                    <input
                      type="text"
                      value={specialEndTime}
                      onChange={(e) => setSpecialEndTime(e.target.value)}
                      className="input-field w-full"
                      placeholder="14:00"
                    />
                  </div>
                </div>

                {/* Is Featured */}
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="specialFeatured"
                    checked={specialIsFeatured}
                    onChange={(e) => setSpecialIsFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-light text-primary focus:ring-primary"
                  />
                  <label htmlFor="specialFeatured" className="text-sm font-medium text-primary">
                    Is Featured
                  </label>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6 pt-4 border-t border-light">
                <button
                  onClick={() => setShowSpecialModal(false)}
                  className="btn-outline"
                  disabled={savingSpecial}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSpecial}
                  className="btn-primary flex items-center gap-2"
                  disabled={savingSpecial}
                >
                  {savingSpecial && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingSpecial ? 'Update Special' : 'Create Special'}
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ─── Bars listing ─────────────────────────────────────

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-primary/60">{bars.length} bars total</p>
        <button onClick={openCreateBar} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Bar
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-light overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : bars.length === 0 ? (
          <div className="p-12 text-center">
            <Beer className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/60 text-sm">No bars yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Address</th>
                  <th className="px-6 py-3">Phone</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {bars.map((bar) => (
                  <tr key={bar.id} className="hover:bg-light/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary">{bar.name}</td>
                    <td className="px-6 py-4 text-sm text-primary/60 max-w-xs truncate">
                      {bar.address}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">{bar.phone || '-'}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          bar.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {bar.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEditBar(bar)}
                          className="text-primary/50 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleBarActive(bar)}
                          className="text-primary/50 hover:text-primary transition-colors"
                          title={bar.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {bar.isActive ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => openBarSpecials(bar)}
                          className="text-teal hover:text-teal/80 transition-colors text-xs font-medium"
                          title="Manage Specials"
                        >
                          <ListFilter className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Bar Modal */}
      {showBarModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-primary">
                {editingBar ? 'Edit Bar' : 'New Bar'}
              </h3>
              <button
                onClick={() => setShowBarModal(false)}
                className="text-primary/40 hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Name</label>
                <input
                  type="text"
                  value={barName}
                  onChange={(e) => {
                    setBarName(e.target.value);
                    if (!editingBar) {
                      setBarSlug(slugify(e.target.value));
                    }
                  }}
                  className="input-field w-full"
                  placeholder="Bar name"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Slug</label>
                <input
                  type="text"
                  value={barSlug}
                  onChange={(e) => setBarSlug(e.target.value)}
                  className="input-field w-full"
                  placeholder="bar-slug"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Address</label>
                <input
                  type="text"
                  value={barAddress}
                  onChange={(e) => setBarAddress(e.target.value)}
                  className="input-field w-full"
                  placeholder="123 Main St, Fond du Lac, WI"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Description</label>
                <textarea
                  value={barDescription}
                  onChange={(e) => setBarDescription(e.target.value)}
                  className="input-field w-full h-20 resize-y"
                  placeholder="About this bar..."
                />
              </div>

              {/* Phone & Website row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Phone</label>
                  <input
                    type="text"
                    value={barPhone}
                    onChange={(e) => setBarPhone(e.target.value)}
                    className="input-field w-full"
                    placeholder="(920) 555-1234"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Website</label>
                  <input
                    type="text"
                    value={barWebsite}
                    onChange={(e) => setBarWebsite(e.target.value)}
                    className="input-field w-full"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6 pt-4 border-t border-light">
              <button
                onClick={() => setShowBarModal(false)}
                className="btn-outline"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBar}
                className="btn-primary flex items-center gap-2"
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingBar ? 'Update Bar' : 'Create Bar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── PRODUCTS SECTION ───────────────────────────────────

function ProductsSection() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formCompareAtPrice, setFormCompareAtPrice] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategoryTags, setFormCategoryTags] = useState('');
  const [formInventory, setFormInventory] = useState('0');
  const [formImages, setFormImages] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getProducts({ limit: 100 });
      setProducts(res.data);
    } catch {
      setError('Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function resetForm() {
    setFormName('');
    setFormSlug('');
    setFormPrice('');
    setFormCompareAtPrice('');
    setFormDescription('');
    setFormCategoryTags('');
    setFormInventory('0');
    setFormImages('');
  }

  function openCreate() {
    setEditingProduct(null);
    resetForm();
    setShowModal(true);
  }

  function openEdit(product: Product) {
    setEditingProduct(product);
    setFormName(product.name);
    setFormSlug(product.slug);
    setFormPrice(String(product.price));
    setFormCompareAtPrice(product.compareAtPrice ? String(product.compareAtPrice) : '');
    setFormDescription(product.description ?? '');
    setFormCategoryTags(product.categoryTags.join(', '));
    setFormInventory(String(product.inventory));
    setFormImages(product.images.join('\n'));
    setShowModal(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const data = {
        name: formName,
        slug: formSlug,
        price: parseFloat(formPrice) || 0,
        compareAtPrice: formCompareAtPrice ? parseFloat(formCompareAtPrice) : undefined,
        description: formDescription || undefined,
        categoryTags: formCategoryTags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        inventory: parseInt(formInventory, 10) || 0,
        images: formImages
          .split('\n')
          .map((url) => url.trim())
          .filter(Boolean),
        isActive: true,
        externalPlatform: ExternalPlatform.NATIVE,
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, data);
      } else {
        await api.createProduct(data);
      }

      setShowModal(false);
      resetForm();
      await fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive(product: Product) {
    try {
      await api.updateProduct(product.id, { isActive: !product.isActive });
      await fetchProducts();
    } catch {
      setError('Failed to update product status.');
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-primary/60">{products.length} products total</p>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Product
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-light overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : products.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/60 text-sm">No products yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                  <th className="px-6 py-3">Image</th>
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Price</th>
                  <th className="px-6 py-3">Inventory</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {products.map((product) => (
                  <tr key={product.id} className="hover:bg-light/50 transition-colors">
                    <td className="px-6 py-4">
                      {product.images.length > 0 ? (
                        <img
                          src={product.images[0]}
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-light flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-primary/30" />
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-primary max-w-xs truncate">
                      {product.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {product.vendor?.businessName || product.vendorId.slice(0, 8) + '...'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary">
                      {formatPrice(product.price)}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">{product.inventory}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          product.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {product.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEdit(product)}
                          className="text-primary/50 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(product)}
                          className="text-primary/50 hover:text-primary transition-colors"
                          title={product.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {product.isActive ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-primary">
                {editingProduct ? 'Edit Product' : 'New Product'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-primary/40 hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!editingProduct) {
                      setFormSlug(slugify(e.target.value));
                    }
                  }}
                  className="input-field w-full"
                  placeholder="Product name"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Slug</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="input-field w-full"
                  placeholder="product-slug"
                />
              </div>

              {/* Price row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    className="input-field w-full"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">
                    Compare At Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formCompareAtPrice}
                    onChange={(e) => setFormCompareAtPrice(e.target.value)}
                    className="input-field w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input-field w-full h-28 resize-y"
                  placeholder="Product description..."
                />
              </div>

              {/* Category Tags */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Category Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={formCategoryTags}
                  onChange={(e) => setFormCategoryTags(e.target.value)}
                  className="input-field w-full"
                  placeholder="clothing, accessories"
                />
              </div>

              {/* Inventory */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Inventory</label>
                <input
                  type="number"
                  min="0"
                  value={formInventory}
                  onChange={(e) => setFormInventory(e.target.value)}
                  className="input-field w-full"
                  placeholder="0"
                />
              </div>

              {/* Images */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Image URLs (one per line)
                </label>
                <textarea
                  value={formImages}
                  onChange={(e) => setFormImages(e.target.value)}
                  className="input-field w-full h-24 resize-y"
                  placeholder={"https://example.com/image1.jpg\nhttps://example.com/image2.jpg"}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6 pt-4 border-t border-light">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingProduct ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── APPLICATIONS SECTION ──────────────────────────────

interface BarWithOwner extends Bar {
  owner?: { id: string; name: string | null; email: string } | null;
  specialCount?: number;
}

function ApplicationsSection() {
  const [pendingVendors, setPendingVendors] = useState<Vendor[]>([]);
  const [pendingBars, setPendingBars] = useState<BarWithOwner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const [vendorsRes, barsRes] = await Promise.all([
        api.adminGetVendors({ status: 'PENDING' }),
        api.adminGetBars({ status: 'pending' }),
      ]);

      setPendingVendors(vendorsRes.data);
      setPendingBars(barsRes.data);
    } catch {
      setError('Failed to load applications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleVendorAction(vendorId: string, status: 'APPROVED' | 'SUSPENDED') {
    setActionLoading(vendorId);
    try {
      await api.adminUpdateVendorStatus(vendorId, status);
      await fetchApplications();
    } catch {
      setError(`Failed to ${status === 'APPROVED' ? 'approve' : 'deny'} vendor.`);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBarAction(barId: string, approved: boolean) {
    setActionLoading(barId);
    try {
      await api.adminApproveBar(barId, approved);
      await fetchApplications();
    } catch {
      setError(`Failed to ${approved ? 'approve' : 'deny'} bar/restaurant.`);
    } finally {
      setActionLoading(null);
    }
  }

  const totalPending = pendingVendors.length + pendingBars.length;

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="p-12 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
        </div>
      ) : totalPending === 0 ? (
        <div className="bg-white rounded-xl border border-light p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-primary mb-1">All caught up!</h2>
          <p className="text-primary/60 text-sm">No pending applications to review.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Pending Vendor Applications */}
          {pendingVendors.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Store className="w-5 h-5" />
                Vendor Applications
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {pendingVendors.length}
                </span>
              </h2>
              <div className="space-y-3">
                {pendingVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="bg-white rounded-xl border border-light p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-primary">{vendor.businessName}</h3>
                      <p className="text-xs text-primary/50 mt-0.5">
                        {vendor.user?.name || vendor.user?.email || 'Unknown applicant'}
                        {vendor.user?.email && ` — ${vendor.user.email}`}
                      </p>
                      {vendor.description && (
                        <p className="text-xs text-primary/60 mt-1 line-clamp-2">{vendor.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-primary/40">
                        {vendor.phone && <span>{vendor.phone}</span>}
                        {vendor.address && <span>{vendor.address}</span>}
                        {vendor.website && <span>{vendor.website}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleVendorAction(vendor.id, 'APPROVED')}
                        disabled={actionLoading === vendor.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === vendor.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleVendorAction(vendor.id, 'SUSPENDED')}
                        disabled={actionLoading === vendor.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Bar/Restaurant Applications */}
          {pendingBars.length > 0 && (
            <div>
              <h2 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
                <Beer className="w-5 h-5" />
                Bar / Restaurant Applications
                <span className="bg-yellow-100 text-yellow-800 text-xs font-medium px-2 py-0.5 rounded-full">
                  {pendingBars.length}
                </span>
              </h2>
              <div className="space-y-3">
                {pendingBars.map((bar) => (
                  <div
                    key={bar.id}
                    className="bg-white rounded-xl border border-light p-5 flex flex-col sm:flex-row sm:items-center gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-primary">{bar.name}</h3>
                      <p className="text-xs text-primary/50 mt-0.5">
                        {bar.owner?.name || bar.owner?.email || 'Unknown applicant'}
                        {bar.owner?.email && ` — ${bar.owner.email}`}
                      </p>
                      {bar.description && (
                        <p className="text-xs text-primary/60 mt-1 line-clamp-2">{bar.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-primary/40">
                        <span>{bar.address}</span>
                        {bar.phone && <span>{bar.phone}</span>}
                        {bar.website && <span>{bar.website}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleBarAction(bar.id, true)}
                        disabled={actionLoading === bar.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === bar.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleBarAction(bar.id, false)}
                        disabled={actionLoading === bar.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Deny
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

// ─── VENDORS SECTION ────────────────────────────────────

function VendorsSection() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formBusinessName, setFormBusinessName] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formWebsite, setFormWebsite] = useState('');
  const [formStatus, setFormStatus] = useState<string>('PENDING');

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getVendors({ limit: 100 });
      setVendors(res.data);
    } catch {
      setError('Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  function openEdit(vendor: Vendor) {
    setEditingVendor(vendor);
    setFormBusinessName(vendor.businessName);
    setFormSlug(vendor.slug);
    setFormDescription(vendor.description ?? '');
    setFormAddress(vendor.address ?? '');
    setFormPhone(vendor.phone ?? '');
    setFormWebsite(vendor.website ?? '');
    setFormStatus(vendor.status);
    setShowModal(true);
  }

  async function handleSave() {
    if (!editingVendor) return;
    setSaving(true);
    setError(null);
    try {
      const data: Record<string, unknown> = {
        businessName: formBusinessName,
        slug: formSlug,
        description: formDescription || undefined,
        address: formAddress || undefined,
        phone: formPhone || undefined,
        website: formWebsite || undefined,
      };

      // Status is managed separately -- pass it as part of the update
      // The updateVendorSchema is partial of createVendorSchema which doesn't include status.
      // But the API endpoint may accept status for admin updates.
      // We send it and let the server decide.
      (data as Record<string, unknown>).status = formStatus;

      await api.updateVendor(editingVendor.id, data as Record<string, string>);

      setShowModal(false);
      await fetchVendors();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update vendor.');
    } finally {
      setSaving(false);
    }
  }

  const vendorStatusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-red-100 text-red-800',
  };

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-primary/60">{vendors.length} vendors total</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-light overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center">
            <Store className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/60 text-sm">No vendors yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                  <th className="px-6 py-3">Business Name</th>
                  <th className="px-6 py-3">Owner</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Products</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {vendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-light/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary">
                      {vendor.businessName}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {vendor.user?.name || vendor.user?.email || vendor.userId.slice(0, 8) + '...'}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          vendorStatusColors[vendor.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {vendor.products?.length ?? '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {vendor.status === 'PENDING' && (
                          <>
                            <button
                              onClick={async () => {
                                await api.adminUpdateVendorStatus(vendor.id, 'APPROVED');
                                fetchVendors();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors"
                              title="Approve"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={async () => {
                                await api.adminUpdateVendorStatus(vendor.id, 'SUSPENDED');
                                fetchVendors();
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-600 text-xs font-medium rounded-lg hover:bg-red-100 transition-colors"
                              title="Deny"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Deny
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => openEdit(vendor)}
                          className="text-primary/50 hover:text-primary transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Vendor Edit Modal */}
      {showModal && editingVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-primary">Edit Vendor</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-primary/40 hover:text-primary"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Business Name */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Business Name
                </label>
                <input
                  type="text"
                  value={formBusinessName}
                  onChange={(e) => setFormBusinessName(e.target.value)}
                  className="input-field w-full"
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Slug</label>
                <input
                  type="text"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="input-field w-full"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="input-field w-full"
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="input-field w-full h-20 resize-y"
                />
              </div>

              {/* Address */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">Address</label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  className="input-field w-full"
                />
              </div>

              {/* Phone & Website row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Phone</label>
                  <input
                    type="text"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-primary mb-1">Website</label>
                  <input
                    type="text"
                    value={formWebsite}
                    onChange={(e) => setFormWebsite(e.target.value)}
                    className="input-field w-full"
                  />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 mt-6 pt-4 border-t border-light">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn-primary flex items-center gap-2"
                disabled={saving}
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Update Vendor
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── ORDERS ADMIN SECTION ──────────────────────────────

function OrdersAdminSection() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { limit: 50 };
        if (statusFilter !== 'ALL') params.status = statusFilter;
        const res = await api.adminGetOrders(params as Parameters<typeof api.adminGetOrders>[0]);
        setOrders(res.data);
      } catch { /* */ } finally {
        setLoading(false);
      }
    }
    fetchOrders();
  }, [statusFilter]);

  async function handleStatusChange(orderId: string, status: string) {
    try {
      await api.adminUpdateOrderStatus(orderId, status);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: status as Order['status'] } : o))
      );
    } catch { /* */ }
  }

  const statusColors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    PAID: 'bg-blue-100 text-blue-800',
    PROCESSING: 'bg-indigo-100 text-indigo-800',
    SHIPPED: 'bg-purple-100 text-purple-800',
    FULFILLED: 'bg-green-100 text-green-800',
    REFUNDED: 'bg-gray-100 text-gray-800',
    CANCELLED: 'bg-red-100 text-red-800',
  };

  const statuses = ['ALL', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'FULFILLED', 'REFUNDED', 'CANCELLED'];

  return (
    <>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              statusFilter === s
                ? 'bg-primary text-white'
                : 'bg-white text-primary/60 border border-light hover:text-primary'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-light overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/60 text-sm">No orders found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                  <th className="px-6 py-3">Order</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Vendor</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-light/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-primary/60">
                      #{order.id.slice(0, 8)}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary">
                      {order.user?.name || order.user?.email || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {order.vendor?.businessName || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-primary">
                      {formatPrice(order.total)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {formatDate(order.createdAt)}
                    </td>
                    <td className="px-6 py-4">
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order.id, e.target.value)}
                        className="text-xs border border-light rounded px-2 py-1"
                      >
                        {statuses.filter(s => s !== 'ALL').map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

// ─── REFUNDS ADMIN SECTION ─────────────────────────────

function RefundsAdminSection() {
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRefunds() {
      try {
        const res = await api.getRefunds({ limit: 50 });
        setRefunds(res.data);
      } catch { /* */ } finally {
        setLoading(false);
      }
    }
    fetchRefunds();
  }, []);

  async function handleRefundAction(refundId: string, status: string) {
    try {
      await api.updateRefund(refundId, { status: status as RefundStatus });
      setRefunds((prev) =>
        prev.map((r) => (r.id === refundId ? { ...r, status: status as Refund['status'] } : r))
      );
    } catch { /* */ }
  }

  const refundStatusColors: Record<string, string> = {
    REQUESTED: 'bg-yellow-100 text-yellow-800',
    APPROVED: 'bg-blue-100 text-blue-800',
    REJECTED: 'bg-red-100 text-red-800',
    PROCESSED: 'bg-green-100 text-green-800',
  };

  return (
    <div className="bg-white rounded-xl border border-light overflow-hidden">
      {loading ? (
        <div className="p-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
        </div>
      ) : refunds.length === 0 ? (
        <div className="p-12 text-center">
          <RotateCcw className="w-10 h-10 text-primary/20 mx-auto mb-3" />
          <p className="text-primary/60 text-sm">No refund requests.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                <th className="px-6 py-3">Refund ID</th>
                <th className="px-6 py-3">Order</th>
                <th className="px-6 py-3">Amount</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-light">
              {refunds.map((refund) => (
                <tr key={refund.id} className="hover:bg-light/50 transition-colors">
                  <td className="px-6 py-4 text-sm font-mono text-primary/60">
                    {refund.id.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-sm text-primary">
                    #{refund.orderId.slice(0, 8)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-primary">
                    {formatPrice(refund.amount)}
                  </td>
                  <td className="px-6 py-4 text-sm text-primary/60 max-w-xs truncate">
                    {refund.reason || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${refundStatusColors[refund.status] || 'bg-gray-100 text-gray-800'}`}>
                      {refund.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-primary/60">
                    {formatDate(refund.createdAt)}
                  </td>
                  <td className="px-6 py-4">
                    {refund.status === 'REQUESTED' && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleRefundAction(refund.id, 'APPROVED')}
                          className="text-green-600 hover:text-green-800 transition-colors"
                          title="Approve"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleRefundAction(refund.id, 'REJECTED')}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    {refund.status === 'APPROVED' && (
                      <button
                        onClick={() => handleRefundAction(refund.id, 'PROCESSED')}
                        className="text-xs text-teal font-medium hover:text-teal/80"
                      >
                        Process Refund
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── USERS ADMIN SECTION ───────────────────────────────

function UsersAdminSection() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 100 };
      if (roleFilter !== 'ALL') params.role = roleFilter;
      const res = await api.adminGetUsers(params as Parameters<typeof api.adminGetUsers>[0]);
      setUsers(res.data);
    } catch { /* */ } finally {
      setLoading(false);
    }
  }, [roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleRoleChange(userId: string, newRole: string) {
    if (userId === currentUser?.id) {
      setError('You cannot change your own role.');
      return;
    }
    setUpdatingId(userId);
    setError(null);
    try {
      await api.adminUpdateUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole as UserType['role'] } : u))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role.');
    } finally {
      setUpdatingId(null);
    }
  }

  const filterRoles = ['ALL', 'USER', 'VENDOR', 'BAR_OWNER', 'CONTRACTOR', 'EDITOR', 'ADMIN'];
  const allRoles = ['USER', 'VENDOR', 'BAR_OWNER', 'CONTRACTOR', 'EDITOR', 'ADMIN'];

  const roleColors: Record<string, string> = {
    USER: 'bg-gray-100 text-gray-800',
    VENDOR: 'bg-teal/10 text-teal',
    BAR_OWNER: 'bg-amber-100 text-amber-800',
    CONTRACTOR: 'bg-orange-100 text-orange-800',
    EDITOR: 'bg-blue-100 text-blue-800',
    ADMIN: 'bg-purple-100 text-purple-800',
  };

  const roleLabels: Record<string, string> = {
    USER: 'Member',
    VENDOR: 'Vendor',
    BAR_OWNER: 'Bar / Restaurant Owner',
    CONTRACTOR: 'Contractor',
    EDITOR: 'Editor',
    ADMIN: 'Admin',
  };

  return (
    <>
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {filterRoles.map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              roleFilter === r
                ? 'bg-primary text-white'
                : 'bg-white text-primary/60 border border-light hover:text-primary'
            }`}
          >
            {r === 'ALL' ? 'All' : roleLabels[r] || r}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-light overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary/40" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/60 text-sm">No users found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-semibold text-primary/50 uppercase tracking-wider border-b border-light">
                  <th className="px-6 py-3">Name</th>
                  <th className="px-6 py-3">Email</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-light">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-light/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-primary">
                      {u.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">{u.email}</td>
                    <td className="px-6 py-4">
                      {u.id === currentUser?.id ? (
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[u.role] || 'bg-gray-100 text-gray-800'}`}>
                          {roleLabels[u.role] || u.role} (you)
                        </span>
                      ) : (
                        <div className="relative">
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u.id, e.target.value)}
                            disabled={updatingId === u.id}
                            className={`appearance-none pl-2.5 pr-7 py-0.5 rounded-full text-xs font-medium border-0 cursor-pointer focus:ring-2 focus:ring-primary/20 ${
                              roleColors[u.role] || 'bg-gray-100 text-gray-800'
                            } ${updatingId === u.id ? 'opacity-50' : ''}`}
                          >
                            {allRoles.map((role) => (
                              <option key={role} value={role}>
                                {roleLabels[role] || role}
                              </option>
                            ))}
                          </select>
                          {updatingId === u.id && (
                            <Loader2 className="absolute right-1 top-1 w-3 h-3 animate-spin" />
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-primary/60">
                      {formatDate(u.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

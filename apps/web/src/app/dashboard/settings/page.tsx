'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Store,
  Settings,
  CreditCard,
  Share2,
  Search,
  Save,
  Loader2,
  ArrowRight,
  X,
  Facebook,
  Instagram,
  Twitter,
  Globe,
  Phone,
  MapPin,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import type { Vendor } from '@ilovefdl/shared';

// ─── Tab definitions ─────────────────────────────────────

type TabKey = 'store' | 'payment' | 'social' | 'seo';

const TABS: { key: TabKey; label: string; icon: typeof Store }[] = [
  { key: 'store', label: 'Store Details', icon: Store },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'social', label: 'Social Profiles', icon: Share2 },
  { key: 'seo', label: 'Store SEO', icon: Search },
];

// ─── Form state interfaces ──────────────────────────────

interface StoreForm {
  businessName: string;
  description: string;
  address: string;
  phone: string;
  website: string;
  logoUrl: string;
  bannerUrl: string;
}

interface SocialForm {
  facebook: string;
  instagram: string;
  twitter: string;
  tiktok: string;
}

interface SeoForm {
  seoTitle: string;
  seoDescription: string;
  slug: string;
}

// ─── Component ──────────────────────────────────────────

export default function SettingsPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('store');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [storeForm, setStoreForm] = useState<StoreForm>({
    businessName: '',
    description: '',
    address: '',
    phone: '',
    website: '',
    logoUrl: '',
    bannerUrl: '',
  });

  const [socialForm, setSocialForm] = useState<SocialForm>({
    facebook: '',
    instagram: '',
    twitter: '',
    tiktok: '',
  });

  const [seoForm, setSeoForm] = useState<SeoForm>({
    seoTitle: '',
    seoDescription: '',
    slug: '',
  });

  // Validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ─── Populate forms from vendor ──────────────────────

  const populateForms = useCallback((v: Vendor) => {
    setStoreForm({
      businessName: v.businessName || '',
      description: v.description || '',
      address: v.address || '',
      phone: v.phone || '',
      website: v.website || '',
      logoUrl: v.logoUrl || '',
      bannerUrl: v.bannerUrl || '',
    });

    const links = v.socialLinks || {};
    setSocialForm({
      facebook: links.facebook || '',
      instagram: links.instagram || '',
      twitter: links.twitter || '',
      tiktok: links.tiktok || '',
    });

    setSeoForm({
      seoTitle: v.seoTitle || '',
      seoDescription: v.seoDescription || '',
      slug: v.slug || '',
    });
  }, []);

  // ─── Fetch vendor data ───────────────────────────────

  const fetchVendor = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const res = await api.getMyVendor();
      setVendor(res.data);
      populateForms(res.data);
    } catch {
      setError('Failed to load vendor profile.');
    } finally {
      setLoading(false);
    }
  }, [user, populateForms]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  // ─── Validation ──────────────────────────────────────

  function validateStoreForm(): boolean {
    const errors: Record<string, string> = {};

    if (!storeForm.businessName.trim()) {
      errors.businessName = 'Business name is required.';
    } else if (storeForm.businessName.trim().length < 2) {
      errors.businessName = 'Business name must be at least 2 characters.';
    }

    if (storeForm.phone && (storeForm.phone.length < 7 || storeForm.phone.length > 20)) {
      errors.phone = 'Phone number must be between 7 and 20 characters.';
    }

    if (storeForm.website && storeForm.website.trim()) {
      try {
        new URL(storeForm.website.trim());
      } catch {
        errors.website = 'Please enter a valid URL (e.g. https://example.com).';
      }
    }

    if (storeForm.logoUrl && storeForm.logoUrl.trim()) {
      try {
        new URL(storeForm.logoUrl.trim());
      } catch {
        errors.logoUrl = 'Please enter a valid URL for the logo image.';
      }
    }

    if (storeForm.bannerUrl && storeForm.bannerUrl.trim()) {
      try {
        new URL(storeForm.bannerUrl.trim());
      } catch {
        errors.bannerUrl = 'Please enter a valid URL for the banner image.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateSocialForm(): boolean {
    const errors: Record<string, string> = {};
    const urlFields: (keyof SocialForm)[] = ['facebook', 'instagram', 'twitter', 'tiktok'];

    for (const field of urlFields) {
      const value = socialForm[field].trim();
      if (value) {
        try {
          new URL(value);
        } catch {
          errors[field] = `Please enter a valid URL for ${field}.`;
        }
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateSeoForm(): boolean {
    const errors: Record<string, string> = {};

    if (!seoForm.slug.trim()) {
      errors.slug = 'Store slug is required.';
    } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(seoForm.slug.trim())) {
      errors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens.';
    }

    if (seoForm.seoTitle && seoForm.seoTitle.length > 70) {
      errors.seoTitle = 'SEO title must be at most 70 characters.';
    }

    if (seoForm.seoDescription && seoForm.seoDescription.length > 160) {
      errors.seoDescription = 'SEO description must be at most 160 characters.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  // ─── Save handler ────────────────────────────────────

  async function handleSave() {
    if (!vendor) return;

    setError(null);
    setSuccess(null);

    // Payment tab has no save action
    if (activeTab === 'payment') return;

    // Validate current tab
    let valid = false;
    if (activeTab === 'store') valid = validateStoreForm();
    else if (activeTab === 'social') valid = validateSocialForm();
    else if (activeTab === 'seo') valid = validateSeoForm();

    if (!valid) return;

    setSaving(true);

    try {
      let payload: Record<string, unknown> = {};

      if (activeTab === 'store') {
        payload = {
          businessName: storeForm.businessName.trim(),
          description: storeForm.description.trim() || undefined,
          address: storeForm.address.trim() || undefined,
          phone: storeForm.phone.trim() || undefined,
          website: storeForm.website.trim() || undefined,
          logoUrl: storeForm.logoUrl.trim() || undefined,
          bannerUrl: storeForm.bannerUrl.trim() || undefined,
        };
      } else if (activeTab === 'social') {
        const socialLinks: Record<string, string> = {};
        if (socialForm.facebook.trim()) socialLinks.facebook = socialForm.facebook.trim();
        if (socialForm.instagram.trim()) socialLinks.instagram = socialForm.instagram.trim();
        if (socialForm.twitter.trim()) socialLinks.twitter = socialForm.twitter.trim();
        if (socialForm.tiktok.trim()) socialLinks.tiktok = socialForm.tiktok.trim();

        payload = {
          socialLinks: Object.keys(socialLinks).length > 0 ? socialLinks : undefined,
        };
      } else if (activeTab === 'seo') {
        payload = {
          slug: seoForm.slug.trim(),
          seoTitle: seoForm.seoTitle.trim() || undefined,
          seoDescription: seoForm.seoDescription.trim() || undefined,
        };
      }

      const res = await api.updateVendor(vendor.id, payload as Parameters<typeof api.updateVendor>[1]);
      setVendor(res.data);
      populateForms(res.data);
      setSuccess('Settings saved successfully.');

      // Auto-dismiss success message after 4 seconds
      setTimeout(() => setSuccess(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save settings.';
      setError(message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Loading skeleton ────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-4 bg-white rounded w-1/4" />
            <div className="flex gap-4 mt-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-10 bg-white rounded-lg w-32" />
              ))}
            </div>
            <div className="bg-white rounded-xl border border-light p-8 space-y-6">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="h-4 bg-light rounded w-24" />
                  <div className="h-10 bg-light rounded w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── No vendor state ─────────────────────────────────

  if (!vendor) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <Store className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            No Vendor Profile
          </h1>
          <p className="text-primary/60 mb-6">
            You need a vendor profile before you can manage store settings.
            Apply to become a vendor on the I Love FDL marketplace.
          </p>
          <a href="/auth" className="btn-primary">
            Apply to Sell
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    );
  }

  // ─── Render helpers ──────────────────────────────────

  function renderStoreTab() {
    return (
      <div className="space-y-6">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Business Name <span className="text-accent">*</span>
          </label>
          <div className="relative">
            <Store className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
            <input
              type="text"
              value={storeForm.businessName}
              onChange={(e) => setStoreForm((prev) => ({ ...prev, businessName: e.target.value }))}
              placeholder="Your business name"
              className="input-field pl-10"
            />
          </div>
          {fieldErrors.businessName && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.businessName}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Description
          </label>
          <textarea
            value={storeForm.description}
            onChange={(e) => setStoreForm((prev) => ({ ...prev, description: e.target.value }))}
            placeholder="Tell customers about your store..."
            rows={4}
            maxLength={2000}
            className="input-field resize-none"
          />
          <p className="text-xs text-primary/40 mt-1 text-right">
            {storeForm.description.length}/2000
          </p>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
            <input
              type="text"
              value={storeForm.address}
              onChange={(e) => setStoreForm((prev) => ({ ...prev, address: e.target.value }))}
              placeholder="123 Main St, City, State"
              className="input-field pl-10"
            />
          </div>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
            <input
              type="tel"
              value={storeForm.phone}
              onChange={(e) => setStoreForm((prev) => ({ ...prev, phone: e.target.value }))}
              placeholder="(555) 123-4567"
              className="input-field pl-10"
            />
          </div>
          {fieldErrors.phone && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>
          )}
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Website
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
            <input
              type="url"
              value={storeForm.website}
              onChange={(e) => setStoreForm((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="https://yourwebsite.com"
              className="input-field pl-10"
            />
          </div>
          {fieldErrors.website && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.website}</p>
          )}
        </div>

        {/* Logo URL */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Logo URL
          </label>
          <input
            type="url"
            value={storeForm.logoUrl}
            onChange={(e) => setStoreForm((prev) => ({ ...prev, logoUrl: e.target.value }))}
            placeholder="https://example.com/logo.png"
            className="input-field"
          />
          {fieldErrors.logoUrl && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.logoUrl}</p>
          )}
          {storeForm.logoUrl && !fieldErrors.logoUrl && (
            <div className="mt-2">
              <img
                src={storeForm.logoUrl}
                alt="Logo preview"
                className="w-16 h-16 rounded-lg object-cover border border-light"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>

        {/* Banner URL */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Banner URL
          </label>
          <input
            type="url"
            value={storeForm.bannerUrl}
            onChange={(e) => setStoreForm((prev) => ({ ...prev, bannerUrl: e.target.value }))}
            placeholder="https://example.com/banner.jpg"
            className="input-field"
          />
          {fieldErrors.bannerUrl && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.bannerUrl}</p>
          )}
          {storeForm.bannerUrl && !fieldErrors.bannerUrl && (
            <div className="mt-2">
              <img
                src={storeForm.bannerUrl}
                alt="Banner preview"
                className="w-full h-32 rounded-lg object-cover border border-light"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  function renderPaymentTab() {
    if (!vendor) return null;
    return (
      <div className="space-y-6">
        <p className="text-sm text-primary/60">
          Manage your payment settings to receive payouts from your sales.
        </p>

        {/* Stripe Connection Status */}
        <div className="bg-light rounded-xl p-6 border border-light">
          <div className="flex items-start gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                vendor.stripeOnboarded
                  ? 'bg-green-100 text-green-600'
                  : 'bg-yellow-50 text-yellow-600'
              }`}
            >
              <CreditCard className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold text-primary mb-1">
                Stripe Account
              </h3>
              {vendor.stripeOnboarded ? (
                <>
                  <p className="text-sm text-green-600 font-medium mb-2">
                    Connected
                  </p>
                  <p className="text-sm text-primary/60">
                    Your Stripe account is connected and ready to receive payouts.
                    You can manage your Stripe account settings directly through the
                    Stripe dashboard.
                  </p>
                </>
              ) : (
                <>
                  <p className="text-sm text-yellow-600 font-medium mb-2">
                    Not Connected
                  </p>
                  <p className="text-sm text-primary/60 mb-4">
                    Connect your Stripe account to start receiving payouts from your
                    sales. You&apos;ll need to complete Stripe&apos;s onboarding process to
                    verify your identity and set up your bank account.
                  </p>
                  <button className="btn-primary">
                    Connect Stripe
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Payout Info */}
        <div className="bg-white rounded-xl p-6 border border-light">
          <h3 className="text-base font-bold text-primary mb-3">
            Payout Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
                Commission Rate
              </p>
              <p className="font-medium text-primary">
                {(vendor.commissionRate * 100).toFixed(0)}%
              </p>
            </div>
            <div>
              <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
                Stripe Status
              </p>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  vendor.stripeOnboarded
                    ? 'bg-green-50 text-green-700'
                    : 'bg-yellow-50 text-yellow-700'
                }`}
              >
                {vendor.stripeOnboarded ? 'Onboarded' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  function renderSocialTab() {
    const platforms: {
      key: keyof SocialForm;
      label: string;
      placeholder: string;
      icon: typeof Facebook;
    }[] = [
      {
        key: 'facebook',
        label: 'Facebook',
        placeholder: 'https://facebook.com/yourpage',
        icon: Facebook,
      },
      {
        key: 'instagram',
        label: 'Instagram',
        placeholder: 'https://instagram.com/yourprofile',
        icon: Instagram,
      },
      {
        key: 'twitter',
        label: 'X (Twitter)',
        placeholder: 'https://x.com/yourhandle',
        icon: Twitter,
      },
      {
        key: 'tiktok',
        label: 'TikTok',
        placeholder: 'https://tiktok.com/@yourprofile',
        icon: Globe,
      },
    ];

    return (
      <div className="space-y-6">
        <p className="text-sm text-primary/60">
          Add your social media profiles so customers can find and follow your store.
        </p>

        {platforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <div key={platform.key}>
              <label className="block text-sm font-medium text-primary mb-1.5">
                {platform.label}
              </label>
              <div className="relative">
                <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
                <input
                  type="url"
                  value={socialForm[platform.key]}
                  onChange={(e) =>
                    setSocialForm((prev) => ({ ...prev, [platform.key]: e.target.value }))
                  }
                  placeholder={platform.placeholder}
                  className="input-field pl-10"
                />
              </div>
              {fieldErrors[platform.key] && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors[platform.key]}</p>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function renderSeoTab() {
    if (!vendor) return null;
    return (
      <div className="space-y-6">
        <p className="text-sm text-primary/60">
          Optimize how your store appears in search engine results. These fields help improve
          your store&apos;s visibility on Google and other search engines.
        </p>

        {/* Slug */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Store Slug <span className="text-accent">*</span>
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
            <input
              type="text"
              value={seoForm.slug}
              onChange={(e) =>
                setSeoForm((prev) => ({
                  ...prev,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                }))
              }
              placeholder="my-store"
              className="input-field pl-10"
            />
          </div>
          <p className="text-xs text-primary/40 mt-1">
            Your store URL: /vendors/{seoForm.slug || 'my-store'}
          </p>
          {fieldErrors.slug && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.slug}</p>
          )}
        </div>

        {/* SEO Title */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            SEO Title
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/30" />
            <input
              type="text"
              value={seoForm.seoTitle}
              onChange={(e) => setSeoForm((prev) => ({ ...prev, seoTitle: e.target.value }))}
              placeholder="Store name - tagline or keywords"
              maxLength={70}
              className="input-field pl-10"
            />
          </div>
          <p className="text-xs text-primary/40 mt-1 text-right">
            {seoForm.seoTitle.length}/70
          </p>
          {fieldErrors.seoTitle && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.seoTitle}</p>
          )}
        </div>

        {/* SEO Description */}
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">
            Meta Description
          </label>
          <textarea
            value={seoForm.seoDescription}
            onChange={(e) => setSeoForm((prev) => ({ ...prev, seoDescription: e.target.value }))}
            placeholder="A brief description of your store for search results..."
            rows={3}
            maxLength={160}
            className="input-field resize-none"
          />
          <p className="text-xs text-primary/40 mt-1 text-right">
            {seoForm.seoDescription.length}/160
          </p>
          {fieldErrors.seoDescription && (
            <p className="text-xs text-red-500 mt-1">{fieldErrors.seoDescription}</p>
          )}
        </div>

        {/* Search Preview */}
        <div>
          <label className="block text-sm font-medium text-primary mb-3">
            Search Preview
          </label>
          <div className="bg-light rounded-lg p-4 border border-light">
            <p className="text-lg text-blue-700 truncate">
              {seoForm.seoTitle || vendor.businessName || 'Your Store Name'}
            </p>
            <p className="text-sm text-green-700 truncate mt-0.5">
              ilovefdl.com/vendors/{seoForm.slug || vendor.slug}
            </p>
            <p className="text-sm text-primary/60 mt-1 line-clamp-2">
              {seoForm.seoDescription ||
                vendor.description ||
                'Add an SEO description to control how your store appears in search results.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main render ─────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                <Settings className="w-7 h-7 inline-block mr-2 -mt-1" />
                Store Settings
              </h1>
              <p className="text-sm sm:text-base text-primary/60">
                Manage your store details, payments, social profiles, and SEO for{' '}
                {vendor.businessName}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Success Banner */}
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm">{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="text-green-400 hover:text-green-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-white rounded-lg border border-light p-1 w-fit overflow-x-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  setFieldErrors({});
                  setError(null);
                  setSuccess(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-primary/60 hover:text-primary hover:bg-light'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl border border-light overflow-hidden">
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-light">
            <h2 className="text-lg font-bold text-primary">
              {TABS.find((t) => t.key === activeTab)?.label}
            </h2>
          </div>

          {/* Card Body */}
          <div className="px-6 py-6">
            {activeTab === 'store' && renderStoreTab()}
            {activeTab === 'payment' && renderPaymentTab()}
            {activeTab === 'social' && renderSocialTab()}
            {activeTab === 'seo' && renderSeoTab()}
          </div>

          {/* Card Footer - hidden for payment tab since it has no form to save */}
          {activeTab !== 'payment' && (
            <div className="px-6 py-4 bg-light/30 border-t border-light flex items-center justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

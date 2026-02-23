'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Truck,
  Loader2,
  Package,
  MapPin,
  DollarSign,
  Clock,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice } from '@/lib/utils';
import type { ShippingProfile } from '@ilovefdl/shared';
import { ShippingType } from '@ilovefdl/shared';

interface ShippingFormData {
  name: string;
  shippingType: ShippingType;
  price: string;
  freeAbove: string;
  estimatedDays: string;
}

const emptyForm: ShippingFormData = {
  name: '',
  shippingType: ShippingType.FLAT_RATE,
  price: '',
  freeAbove: '',
  estimatedDays: '',
};

const SHIPPING_TYPE_LABELS: Record<ShippingType, string> = {
  [ShippingType.FLAT_RATE]: 'Flat Rate',
  [ShippingType.FREE]: 'Free Shipping',
  [ShippingType.WEIGHT_BASED]: 'Weight Based',
  [ShippingType.PRICE_BASED]: 'Price Based',
  [ShippingType.LOCAL_PICKUP]: 'Local Pickup',
};

const SHIPPING_TYPE_ICONS: Record<ShippingType, typeof Truck> = {
  [ShippingType.FLAT_RATE]: DollarSign,
  [ShippingType.FREE]: Package,
  [ShippingType.WEIGHT_BASED]: Package,
  [ShippingType.PRICE_BASED]: DollarSign,
  [ShippingType.LOCAL_PICKUP]: MapPin,
};

const SHIPPING_TYPE_COLORS: Record<ShippingType, string> = {
  [ShippingType.FLAT_RATE]: 'bg-blue-50 text-blue-600',
  [ShippingType.FREE]: 'bg-green-50 text-green-600',
  [ShippingType.WEIGHT_BASED]: 'bg-purple-50 text-purple-600',
  [ShippingType.PRICE_BASED]: 'bg-orange-50 text-orange-600',
  [ShippingType.LOCAL_PICKUP]: 'bg-teal/10 text-teal',
};

export default function ShippingPage() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<ShippingProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<ShippingProfile | null>(null);
  const [form, setForm] = useState<ShippingFormData>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) api.setToken(tokenStr);

      const res = await api.getMyShippingProfiles();
      setProfiles(res.data);
    } catch {
      setError('Failed to load shipping profiles.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── Modal Helpers ───────────────────────────────────────

  function openAddModal() {
    setEditingProfile(null);
    setForm(emptyForm);
    setFormError(null);
    setModalOpen(true);
  }

  function openEditModal(profile: ShippingProfile) {
    setEditingProfile(profile);
    setForm({
      name: profile.name,
      shippingType: profile.shippingType,
      price: String(profile.price),
      freeAbove: profile.freeAbove != null ? String(profile.freeAbove) : '',
      estimatedDays: profile.estimatedDays || '',
    });
    setFormError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingProfile(null);
    setForm(emptyForm);
    setFormError(null);
  }

  function updateField(field: keyof ShippingFormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // ─── Submit Handler ──────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    if (!name) {
      setFormError('Profile name is required.');
      return;
    }

    const price = parseFloat(form.price);
    if (isNaN(price) || price < 0) {
      setFormError('Please enter a valid price.');
      return;
    }

    const freeAbove = form.freeAbove ? parseFloat(form.freeAbove) : null;
    if (freeAbove !== null && (isNaN(freeAbove) || freeAbove < 0)) {
      setFormError('Please enter a valid "free above" amount.');
      return;
    }

    const payload = {
      name,
      shippingType: form.shippingType,
      price,
      isActive: true,
      freeAbove: freeAbove ?? undefined,
      estimatedDays: form.estimatedDays.trim() || undefined,
    };

    setSaving(true);

    try {
      if (editingProfile) {
        const res = await api.updateShippingProfile(editingProfile.id, payload);
        setProfiles((prev) =>
          prev.map((p) => (p.id === editingProfile.id ? res.data : p))
        );
      } else {
        const res = await api.createShippingProfile(payload);
        setProfiles((prev) => [res.data, ...prev]);
      }
      closeModal();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Something went wrong.';
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  // ─── Delete Handler ──────────────────────────────────────

  async function handleDelete(profileId: string) {
    try {
      await api.deleteShippingProfile(profileId);
      setProfiles((prev) => prev.filter((p) => p.id !== profileId));
    } catch {
      setError('Failed to delete shipping profile.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Loading State ───────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-12 bg-white rounded w-1/4" />
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-48 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Render ─────────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                Shipping Profiles
              </h1>
              <p className="text-sm sm:text-base text-primary/60">
                Configure shipping methods and rates for your products
              </p>
            </div>
            <button onClick={openAddModal} className="btn-primary w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Profile
            </button>
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

        {/* Shipping Profile Cards */}
        {profiles.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profiles.map((profile) => {
              const Icon = SHIPPING_TYPE_ICONS[profile.shippingType];
              const colorClass = SHIPPING_TYPE_COLORS[profile.shippingType];
              return (
                <div
                  key={profile.id}
                  className="bg-white rounded-xl border border-light overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card Header */}
                  <div className="px-6 py-4 border-b border-light flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorClass}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-primary">
                          {profile.name}
                        </h3>
                        <p className="text-xs text-primary/50">
                          {SHIPPING_TYPE_LABELS[profile.shippingType]}
                        </p>
                      </div>
                    </div>
                    {profile.isActive ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal/10 text-teal">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Inactive
                      </span>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="px-6 py-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-primary/60">Price</span>
                      <span className="text-sm font-semibold text-primary">
                        {profile.shippingType === ShippingType.FREE
                          ? 'Free'
                          : formatPrice(profile.price)}
                      </span>
                    </div>

                    {profile.freeAbove != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-primary/60">Free above</span>
                        <span className="text-sm font-medium text-teal">
                          {formatPrice(profile.freeAbove)}
                        </span>
                      </div>
                    )}

                    {profile.estimatedDays && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-primary/60">Est. delivery</span>
                        <span className="text-sm text-primary flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-primary/40" />
                          {profile.estimatedDays}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Actions */}
                  <div className="px-6 py-3 bg-light/30 border-t border-light flex items-center justify-end gap-2">
                    <button
                      onClick={() => openEditModal(profile)}
                      className="p-2.5 rounded-lg text-primary/50 hover:text-accent hover:bg-accent/10 transition-colors"
                      title="Edit profile"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    {deletingId === profile.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(profile.id)}
                          className="px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 transition-colors"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 text-xs font-medium text-primary/50 bg-light rounded hover:bg-gray-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(profile.id)}
                        className="p-2.5 rounded-lg text-primary/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete profile"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <Truck className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              No shipping profiles yet
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Set up shipping profiles to define how your products are delivered.
              Offer flat rate, free shipping, weight-based pricing, and more.
            </p>
            <button onClick={openAddModal} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Profile
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal ───────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal Content */}
          <div className="relative bg-white rounded-xl border border-light shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-light px-6 py-4 flex items-center justify-between rounded-t-xl z-10">
              <h2 className="text-lg font-bold text-primary">
                {editingProfile ? 'Edit Shipping Profile' : 'Add Shipping Profile'}
              </h2>
              <button
                onClick={closeModal}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {formError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Profile Name <span className="text-accent">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  placeholder="e.g. Standard Shipping"
                  className="input-field"
                  required
                />
              </div>

              {/* Shipping Type */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Shipping Type <span className="text-accent">*</span>
                </label>
                <select
                  value={form.shippingType}
                  onChange={(e) => updateField('shippingType', e.target.value)}
                  className="input-field"
                >
                  {Object.values(ShippingType).map((type) => (
                    <option key={type} value={type}>
                      {SHIPPING_TYPE_LABELS[type]}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Price ($) <span className="text-accent">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.price}
                  onChange={(e) => updateField('price', e.target.value)}
                  placeholder="0.00"
                  className="input-field"
                  required
                  disabled={form.shippingType === ShippingType.FREE}
                />
                {form.shippingType === ShippingType.FREE && (
                  <p className="text-xs text-primary/40 mt-1">
                    Price is automatically set to $0.00 for free shipping.
                  </p>
                )}
              </div>

              {/* Free Above */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Free Shipping Above ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.freeAbove}
                  onChange={(e) => updateField('freeAbove', e.target.value)}
                  placeholder="No threshold"
                  className="input-field"
                />
                <p className="text-xs text-primary/40 mt-1">
                  Orders above this amount qualify for free shipping.
                </p>
              </div>

              {/* Estimated Days */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">
                  Estimated Delivery
                </label>
                <input
                  type="text"
                  value={form.estimatedDays}
                  onChange={(e) => updateField('estimatedDays', e.target.value)}
                  placeholder="e.g. 3-5 business days"
                  className="input-field"
                />
              </div>

              {/* Form Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-light">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-medium text-primary/60 hover:text-primary rounded-lg hover:bg-light transition-colors text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed justify-center"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : editingProfile ? (
                    'Update Profile'
                  ) : (
                    'Create Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

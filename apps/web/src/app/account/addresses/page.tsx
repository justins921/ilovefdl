'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  MapPin,
  Plus,
  Pencil,
  Trash2,
  X,
  Star,
  Phone,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import type { SavedAddress } from '@ilovefdl/shared';

// ─── Types ──────────────────────────────────────────────

interface AddressFormData {
  label: string;
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: AddressFormData = {
  label: 'Home',
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  postalCode: '',
  country: 'US',
  phone: '',
  isDefault: false,
};

// ─── Component ──────────────────────────────────────────

export default function AddressesPage() {
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AddressFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ─── Fetch addresses ──────────────────────────────────

  const fetchAddresses = useCallback(async () => {
    try {
      const res = await api.getAddresses();
      setAddresses(res.data);
    } catch {
      // Silently handle - user may just have no addresses yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchAddresses();
  }, [user, authLoading, fetchAddresses]);

  // ─── Modal helpers ────────────────────────────────────

  function openAddModal() {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  }

  function openEditModal(address: SavedAddress) {
    setEditingId(address.id);
    setForm({
      label: address.label,
      name: address.name,
      line1: address.line1,
      line2: address.line2 || '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phone: address.phone || '',
      isDefault: address.isDefault,
    });
    setError(null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
  }

  // ─── Form change handler ──────────────────────────────

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value, type } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  }

  // ─── Submit (create / update) ─────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      label: form.label,
      name: form.name,
      line1: form.line1,
      line2: form.line2 || undefined,
      city: form.city,
      state: form.state,
      postalCode: form.postalCode,
      country: form.country || 'US',
      phone: form.phone || undefined,
      isDefault: form.isDefault,
    };

    try {
      if (editingId) {
        await api.updateAddress(editingId, payload);
      } else {
        await api.createAddress(payload);
      }
      closeModal();
      await fetchAddresses();
    } catch (err: unknown) {
      let message = 'Something went wrong. Please try again.';
      if (err instanceof Error && err.message) {
        message = err.message;
      }
      // Check for common issues
      if (message.includes('401') || message.includes('Unauthorized') || message.includes('Authentication')) {
        message = 'Your session has expired. Please log out and log back in.';
      } else if (message.includes('Failed to create') || message.includes('Failed to update')) {
        message = 'Unable to save your address right now. Please try again in a few minutes.';
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Delete ───────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this address?')) return;
    setDeletingId(id);
    try {
      await api.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    } catch {
      // Failed to delete
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Auth loading state ───────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  // ─── Not authenticated ────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <User className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            Sign In Required
          </h1>
          <p className="text-primary/60 mb-6">
            Please sign in to manage your saved addresses.
          </p>
          <Link href="/auth" className="btn-primary">
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href="/account"
                  className="flex items-center gap-1.5 text-xs text-primary/40 hover:text-primary/60 transition-colors uppercase tracking-wider"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Account
                </Link>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                Saved Addresses
              </h1>
              <p className="text-primary/60">
                Manage your shipping and billing addresses.
              </p>
            </div>
            <button onClick={openAddModal} className="btn-primary text-sm w-full sm:w-auto">
              <Plus className="w-4 h-4 mr-2" />
              Add Address
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error banner */}
        {error && !modalOpen && (
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

        {/* Loading skeleton */}
        {loading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-light p-6 animate-pulse"
              >
                <div className="h-4 bg-light rounded w-1/4 mb-3" />
                <div className="h-4 bg-light rounded w-3/4 mb-2" />
                <div className="h-4 bg-light rounded w-1/2 mb-2" />
                <div className="h-4 bg-light rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : addresses.length > 0 ? (
          /* Address cards */
          <div className="grid sm:grid-cols-2 gap-4">
            {addresses.map((address) => (
              <div
                key={address.id}
                className="bg-white rounded-xl border border-light p-6 relative group hover:shadow-md transition-shadow"
              >
                {/* Top row: label + default badge */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-teal/10 text-teal">
                    {address.label}
                  </span>
                  {address.isDefault && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                      <Star className="w-3 h-3" />
                      Default
                    </span>
                  )}
                </div>

                {/* Address details */}
                <p className="text-sm font-semibold text-primary mb-1">
                  {address.name}
                </p>
                <p className="text-sm text-primary/60">{address.line1}</p>
                {address.line2 && (
                  <p className="text-sm text-primary/60">{address.line2}</p>
                )}
                <p className="text-sm text-primary/60">
                  {address.city}, {address.state} {address.postalCode}
                </p>
                {address.phone && (
                  <p className="text-sm text-primary/60 mt-2 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {address.phone}
                  </p>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-light">
                  <button
                    onClick={() => openEditModal(address)}
                    className="btn-outline text-xs px-3 py-2"
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    disabled={deletingId === address.id}
                    className="btn-outline text-xs px-3 py-2 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                  >
                    {deletingId === address.id ? (
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                    )}
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-light p-12 text-center">
            <MapPin className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <p className="text-primary/60 text-sm mb-4">
              You haven&apos;t saved any addresses yet.
            </p>
            <button onClick={openAddModal} className="btn-primary text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Address
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal ───────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40"
            onClick={closeModal}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-light">
              <h2 className="text-lg font-bold text-primary">
                {editingId ? 'Edit Address' : 'Add Address'}
              </h2>
              <button
                onClick={closeModal}
                className="text-primary/40 hover:text-primary/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Label
                </label>
                <select
                  name="label"
                  value={form.label}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="Home">Home</option>
                  <option value="Work">Work</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Full name */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="input-field"
                  required
                />
              </div>

              {/* Address line 1 */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Address Line 1 *
                </label>
                <input
                  type="text"
                  name="line1"
                  value={form.line1}
                  onChange={handleChange}
                  placeholder="123 Main St"
                  className="input-field"
                  required
                />
              </div>

              {/* Address line 2 */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Address Line 2
                </label>
                <input
                  type="text"
                  name="line2"
                  value={form.line2}
                  onChange={handleChange}
                  placeholder="Apt, suite, unit, etc."
                  className="input-field"
                />
              </div>

              {/* City + State row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                    City *
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={form.city}
                    onChange={handleChange}
                    placeholder="Fond du Lac"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                    State *
                  </label>
                  <input
                    type="text"
                    name="state"
                    value={form.state}
                    onChange={handleChange}
                    placeholder="WI"
                    className="input-field"
                    required
                  />
                </div>
              </div>

              {/* Postal code + Country row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                    Postal Code *
                  </label>
                  <input
                    type="text"
                    name="postalCode"
                    value={form.postalCode}
                    onChange={handleChange}
                    placeholder="54935"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                    Country
                  </label>
                  <input
                    type="text"
                    name="country"
                    value={form.country}
                    onChange={handleChange}
                    placeholder="US"
                    className="input-field"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(920) 555-0123"
                  className="input-field"
                />
              </div>

              {/* Default checkbox */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  name="isDefault"
                  checked={form.isDefault}
                  onChange={handleChange}
                  className="w-4 h-4 rounded border-light text-teal focus:ring-teal"
                />
                <label
                  htmlFor="isDefault"
                  className="text-sm font-medium text-primary"
                >
                  Set as default address
                </label>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-light">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn-outline text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {submitting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingId ? 'Save Changes' : 'Add Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

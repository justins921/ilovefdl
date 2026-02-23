'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Plus,
  Trash2,
  X,
  Star,
  ArrowRight,
  ArrowLeft,
  Loader2,
  User,
  Shield,
  CheckCircle,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import type { PaymentMethod } from '@ilovefdl/shared';

// ─── Card Brand Helpers ──────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  visa: 'bg-blue-50 text-blue-700',
  mastercard: 'bg-orange-50 text-orange-700',
  amex: 'bg-indigo-50 text-indigo-700',
  discover: 'bg-amber-50 text-amber-700',
  default: 'bg-gray-50 text-gray-600',
};

function getBrandDisplay(brand: string | null): { label: string; className: string } {
  const b = (brand || '').toLowerCase();
  return {
    label: brand ? brand.charAt(0).toUpperCase() + brand.slice(1) : 'Card',
    className: BRAND_COLORS[b] || BRAND_COLORS.default,
  };
}

// ─── Card Form Data ──────────────────────────────────────

interface CardFormData {
  cardNumber: string;
  expiry: string;
  cvc: string;
  nameOnCard: string;
}

const emptyCardForm: CardFormData = {
  cardNumber: '',
  expiry: '',
  cvc: '',
  nameOnCard: '',
};

// ─── Component ───────────────────────────────────────────

export default function PaymentMethodsPage() {
  const { user, loading: authLoading } = useAuth();
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState<CardFormData>(emptyCardForm);
  const [submitting, setSubmitting] = useState(false);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // ─── Fetch payment methods ─────────────────────────────

  const fetchPaymentMethods = useCallback(async () => {
    try {
      const res = await api.getPaymentMethods();
      setMethods(res.data);
    } catch {
      // Failed to fetch payment methods
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchPaymentMethods();
  }, [user, authLoading, fetchPaymentMethods]);

  // ─── Form helpers ──────────────────────────────────────

  function openAddForm() {
    setForm(emptyCardForm);
    setError(null);
    setSuccess(null);
    setShowAddForm(true);
  }

  function closeAddForm() {
    setShowAddForm(false);
    setForm(emptyCardForm);
    setError(null);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;

    if (name === 'cardNumber') {
      // Format card number with spaces every 4 digits
      const cleaned = value.replace(/\D/g, '').slice(0, 16);
      const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
      setForm((prev) => ({ ...prev, cardNumber: formatted }));
      return;
    }

    if (name === 'expiry') {
      // Format MM/YY
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      let formatted = cleaned;
      if (cleaned.length >= 3) {
        formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
      }
      setForm((prev) => ({ ...prev, expiry: formatted }));
      return;
    }

    if (name === 'cvc') {
      const cleaned = value.replace(/\D/g, '').slice(0, 4);
      setForm((prev) => ({ ...prev, cvc: cleaned }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  }

  // ─── Add payment method ────────────────────────────────

  async function handleAddCard(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const cardDigits = form.cardNumber.replace(/\s/g, '');
    if (cardDigits.length < 13) {
      setError('Please enter a valid card number.');
      return;
    }

    const expiryParts = form.expiry.split('/');
    if (expiryParts.length !== 2 || expiryParts[0].length !== 2 || expiryParts[1].length !== 2) {
      setError('Please enter a valid expiry date (MM/YY).');
      return;
    }

    const month = parseInt(expiryParts[0], 10);
    if (month < 1 || month > 12) {
      setError('Invalid expiry month.');
      return;
    }

    if (form.cvc.length < 3) {
      setError('Please enter a valid CVC.');
      return;
    }

    setSubmitting(true);

    try {
      // In a real implementation, this would first create a Stripe SetupIntent
      // and confirm the card with Stripe.js, then pass the paymentMethodId.
      // For now, we simulate by calling the API with a mock ID.
      const mockPaymentMethodId = `pm_mock_${Date.now()}`;
      await api.addPaymentMethod({ paymentMethodId: mockPaymentMethodId });
      setSuccess('Payment method added successfully.');
      closeAddForm();
      await fetchPaymentMethods();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to add payment method.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Set default ───────────────────────────────────────

  async function handleSetDefault(id: string) {
    setSettingDefaultId(id);
    setError(null);
    setSuccess(null);

    try {
      await api.setDefaultPaymentMethod(id);
      setMethods((prev) =>
        prev.map((m) => ({
          ...m,
          isDefault: m.id === id,
        }))
      );
      setSuccess('Default payment method updated.');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to set default.';
      setError(message);
    } finally {
      setSettingDefaultId(null);
    }
  }

  // ─── Delete ────────────────────────────────────────────

  async function handleDelete(id: string) {
    const method = methods.find((m) => m.id === id);
    if (method?.isDefault) {
      if (!confirm('This is your default payment method. Are you sure you want to delete it?')) return;
    } else {
      if (!confirm('Are you sure you want to remove this payment method?')) return;
    }

    setDeletingId(id);
    setError(null);
    setSuccess(null);

    try {
      await api.deletePaymentMethod(id);
      setMethods((prev) => prev.filter((m) => m.id !== id));
      setSuccess('Payment method removed.');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete payment method.';
      setError(message);
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Auth loading state ────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  // ─── Not authenticated ─────────────────────────────────

  if (!user) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <User className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            Sign In Required
          </h1>
          <p className="text-primary/60 mb-6">
            Please sign in to manage your payment methods.
          </p>
          <Link href="/auth" className="btn-primary">
            Sign In
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────

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
                  className="text-primary/40 hover:text-primary/60 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <span className="text-xs text-primary/40 uppercase tracking-wider">
                  Account
                </span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-teal" />
                <h1 className="text-2xl sm:text-3xl font-bold text-primary">
                  Payment Methods
                </h1>
              </div>
              <p className="text-primary/60 mt-1">
                Manage your saved cards for faster checkout.
              </p>
            </div>
            <button
              onClick={openAddForm}
              className="btn-primary text-sm w-full sm:w-auto"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Payment Method
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Success banner */}
        {success && (
          <div className="mb-6 bg-teal/10 border border-teal/20 text-teal px-4 py-3 rounded-lg flex items-center justify-between">
            <span className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </span>
            <button
              onClick={() => setSuccess(null)}
              className="text-teal/60 hover:text-teal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Error banner */}
        {error && !showAddForm && (
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
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-xl border border-light p-6 animate-pulse"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-8 bg-light rounded" />
                  <div className="flex-1">
                    <div className="h-4 bg-light rounded w-1/3 mb-2" />
                    <div className="h-3 bg-light rounded w-1/4" />
                  </div>
                  <div className="h-8 bg-light rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        ) : methods.length > 0 ? (
          /* Payment method cards */
          <div className="space-y-4">
            {methods.map((method) => {
              const brand = getBrandDisplay(method.brand);
              return (
                <div
                  key={method.id}
                  className="bg-white rounded-xl border border-light p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    {/* Card info */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      {/* Brand icon */}
                      <div
                        className={`w-14 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${brand.className}`}
                      >
                        <CreditCard className="w-5 h-5" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-primary">
                            {brand.label}
                          </span>
                          <span className="text-sm text-primary/60 font-mono">
                            &bull;&bull;&bull;&bull; {method.last4}
                          </span>
                          {method.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              <Star className="w-3 h-3" />
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-primary/40 mt-0.5">
                          {method.expMonth != null && method.expYear != null
                            ? `Expires ${String(method.expMonth).padStart(2, '0')}/${method.expYear}`
                            : 'Expiry unknown'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!method.isDefault && (
                        <button
                          onClick={() => handleSetDefault(method.id)}
                          disabled={settingDefaultId === method.id}
                          className="btn-outline text-xs px-3 py-2 disabled:opacity-50"
                        >
                          {settingDefaultId === method.id ? (
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Star className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          Set Default
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(method.id)}
                        disabled={deletingId === method.id}
                        className="btn-outline text-xs px-3 py-2 text-red-600 border-red-200 hover:bg-red-50 disabled:opacity-50"
                      >
                        {deletingId === method.id ? (
                          <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Empty state */
          <div className="bg-white rounded-xl border border-light p-12 text-center">
            <CreditCard className="w-10 h-10 text-primary/20 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-primary mb-2">
              No saved payment methods
            </h2>
            <p className="text-primary/60 text-sm mb-6 max-w-sm mx-auto">
              No saved payment methods. Add a card to speed up checkout.
            </p>
            <button onClick={openAddForm} className="btn-primary text-sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Card
            </button>
          </div>
        )}

        {/* Security note */}
        {methods.length > 0 && (
          <div className="mt-6 flex items-start gap-3 p-4 bg-white rounded-xl border border-light">
            <Shield className="w-5 h-5 text-teal flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-primary">
                Your payment information is secure
              </p>
              <p className="text-xs text-primary/40 mt-0.5">
                Card details are stored securely with Stripe. We never have access to your full card number.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ─── Add Card Modal ───────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
            onClick={closeAddForm}
          />

          {/* Modal content */}
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-light">
              <h2 className="text-lg font-bold text-primary">
                Add Payment Method
              </h2>
              <button
                onClick={closeAddForm}
                className="p-2 rounded-lg text-primary/50 hover:text-primary hover:bg-light transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddCard} className="p-6 space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                  {error}
                </div>
              )}

              {/* Info note about Stripe */}
              <div className="bg-blue-50 border border-blue-200 text-blue-700 text-xs rounded-lg px-4 py-3">
                <p className="font-medium mb-1">Demo Card Form</p>
                <p>
                  In production, this form is replaced by Stripe Elements for PCI-compliant card collection.
                  For testing, you can enter any valid-looking card number.
                </p>
              </div>

              {/* Name on card */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Name on Card
                </label>
                <input
                  type="text"
                  name="nameOnCard"
                  value={form.nameOnCard}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="input-field"
                />
              </div>

              {/* Card number */}
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Card Number *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="cardNumber"
                    value={form.cardNumber}
                    onChange={handleChange}
                    placeholder="4242 4242 4242 4242"
                    className="input-field pr-12 font-mono tracking-wider"
                    inputMode="numeric"
                    autoComplete="cc-number"
                    required
                  />
                  <CreditCard className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/30" />
                </div>
              </div>

              {/* Expiry + CVC row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                    Expiry Date *
                  </label>
                  <input
                    type="text"
                    name="expiry"
                    value={form.expiry}
                    onChange={handleChange}
                    placeholder="MM/YY"
                    className="input-field font-mono tracking-wider"
                    inputMode="numeric"
                    autoComplete="cc-exp"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                    CVC *
                  </label>
                  <input
                    type="text"
                    name="cvc"
                    value={form.cvc}
                    onChange={handleChange}
                    placeholder="123"
                    className="input-field font-mono tracking-wider"
                    inputMode="numeric"
                    autoComplete="cc-csc"
                    required
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-4 border-t border-light">
                <button
                  type="button"
                  onClick={closeAddForm}
                  className="btn-outline text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary text-sm disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Card
                    </>
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

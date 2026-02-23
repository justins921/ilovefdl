'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Gift,
  Search,
  Send,
  CreditCard,
  CheckCircle,
  AlertCircle,
  Loader2,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  Clock,
  DollarSign,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatPrice, formatDate } from '@/lib/utils';
import type { GiftCard, GiftCardStatus } from '@ilovefdl/shared';

// ─── Constants ───────────────────────────────────────────

const PRESET_AMOUNTS = [10, 25, 50, 100];

interface PurchaseFormData {
  amount: number;
  customAmount: string;
  useCustom: boolean;
  recipientEmail: string;
  recipientName: string;
  message: string;
}

const emptyForm: PurchaseFormData = {
  amount: 25,
  customAmount: '',
  useCustom: false,
  recipientEmail: '',
  recipientName: '',
  message: '',
};

// ─── Status badge helper ─────────────────────────────────

function statusBadge(status: GiftCardStatus | string) {
  switch (status) {
    case 'ACTIVE':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Active
        </span>
      );
    case 'REDEEMED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          <CreditCard className="w-3 h-3" />
          Redeemed
        </span>
      );
    case 'EXPIRED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <Clock className="w-3 h-3" />
          Expired
        </span>
      );
    case 'DISABLED':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Disabled
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {status}
        </span>
      );
  }
}

// ─── Mask gift card code ─────────────────────────────────

function maskCode(code: string): string {
  if (code.length <= 4) return code;
  return '****-****-' + code.slice(-4);
}

// ─── Component ───────────────────────────────────────────

export default function GiftCardsPage() {
  const { user, loading: authLoading } = useAuth();

  // Purchase form state
  const [form, setForm] = useState<PurchaseFormData>(emptyForm);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  // Gift cards list state
  const [giftCards, setGiftCards] = useState<GiftCard[]>([]);
  const [loadingCards, setLoadingCards] = useState(true);
  const [revealedCodes, setRevealedCodes] = useState<Set<string>>(new Set());

  // Check balance state
  const [balanceCode, setBalanceCode] = useState('');
  const [checkingBalance, setCheckingBalance] = useState(false);
  const [balanceResult, setBalanceResult] = useState<{
    balance: number;
    status: string;
  } | null>(null);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // ─── Fetch gift cards ──────────────────────────────────

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoadingCards(false);
      return;
    }

    async function fetchGiftCards() {
      try {
        const res = await api.getGiftCards();
        setGiftCards(res.data);
      } catch {
        // Failed to fetch gift cards
      } finally {
        setLoadingCards(false);
      }
    }
    fetchGiftCards();
  }, [user, authLoading]);

  // ─── Form handlers ─────────────────────────────────────

  function selectPresetAmount(amount: number) {
    setForm((prev) => ({
      ...prev,
      amount,
      useCustom: false,
      customAmount: '',
    }));
  }

  function handleCustomAmountChange(value: string) {
    const cleaned = value.replace(/[^0-9.]/g, '');
    setForm((prev) => ({
      ...prev,
      customAmount: cleaned,
      useCustom: true,
    }));
  }

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  function getEffectiveAmount(): number {
    if (form.useCustom) {
      const parsed = parseFloat(form.customAmount);
      return isNaN(parsed) ? 0 : parsed;
    }
    return form.amount;
  }

  // ─── Purchase handler ──────────────────────────────────

  async function handlePurchase(e: React.FormEvent) {
    e.preventDefault();
    setPurchaseError(null);
    setPurchaseSuccess(null);

    const effectiveAmount = getEffectiveAmount();

    if (effectiveAmount < 5) {
      setPurchaseError('Minimum gift card amount is $5.00');
      return;
    }
    if (effectiveAmount > 500) {
      setPurchaseError('Maximum gift card amount is $500.00');
      return;
    }

    setPurchasing(true);

    try {
      const payload: {
        amount: number;
        recipientEmail?: string;
        recipientName?: string;
        message?: string;
      } = {
        amount: effectiveAmount,
      };

      if (form.recipientEmail.trim()) {
        payload.recipientEmail = form.recipientEmail.trim();
      }
      if (form.recipientName.trim()) {
        payload.recipientName = form.recipientName.trim();
      }
      if (form.message.trim()) {
        payload.message = form.message.trim();
      }

      const res = await api.createGiftCard(payload);
      setPurchaseSuccess(
        `Gift card purchased successfully! Code: ${res.data.code}`,
      );
      setForm(emptyForm);

      // Refresh gift cards list
      try {
        const cardsRes = await api.getGiftCards();
        setGiftCards(cardsRes.data);
      } catch {
        // Silently fail refresh
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to purchase gift card';
      setPurchaseError(message);
    } finally {
      setPurchasing(false);
    }
  }

  // ─── Check balance handler ─────────────────────────────

  async function handleCheckBalance(e: React.FormEvent) {
    e.preventDefault();
    setBalanceError(null);
    setBalanceResult(null);

    if (!balanceCode.trim()) {
      setBalanceError('Please enter a gift card code');
      return;
    }

    setCheckingBalance(true);

    try {
      const res = await api.checkGiftCardBalance(balanceCode.trim());
      setBalanceResult(res.data);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Failed to check balance';
      setBalanceError(message);
    } finally {
      setCheckingBalance(false);
    }
  }

  // ─── Toggle code reveal ────────────────────────────────

  function toggleRevealCode(id: string) {
    setRevealedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // ─── Auth loading state ────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="animate-pulse text-primary/40">Loading...</div>
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Page Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <div className="flex items-center gap-3 mb-2">
            <Gift className="w-7 h-7 text-accent" />
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-primary">
              Gift Cards
            </h1>
          </div>
          <p className="text-primary/60 text-sm sm:text-lg">
            Purchase gift cards for friends and family, or check your balance.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* ─── Purchase a Gift Card ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-light p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="w-5 h-5 text-teal" />
            <h2 className="text-lg sm:text-xl font-bold text-primary">
              Purchase a Gift Card
            </h2>
          </div>

          {!user && (
            <div className="bg-teal/5 border border-teal/20 rounded-lg px-4 py-3 mb-6">
              <p className="text-sm text-primary/70">
                <Link href="/auth" className="font-semibold text-teal hover:underline">
                  Sign in
                </Link>{' '}
                to purchase and manage gift cards.
              </p>
            </div>
          )}

          <form onSubmit={handlePurchase} className="space-y-6">
            {/* Amount selector */}
            <div>
              <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-3">
                Select Amount
              </label>
              <div className="flex flex-wrap gap-3">
                {PRESET_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => selectPresetAmount(amt)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors border ${
                      !form.useCustom && form.amount === amt
                        ? 'bg-teal text-white border-teal'
                        : 'bg-white text-primary border-light hover:border-teal/40 hover:text-teal'
                    }`}
                  >
                    {formatPrice(amt)}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div className="mt-3">
                <div className="relative max-w-xs">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40" />
                  <input
                    type="text"
                    inputMode="decimal"
                    placeholder="Custom amount ($5 - $500)"
                    value={form.customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    onFocus={() =>
                      setForm((prev) => ({ ...prev, useCustom: true }))
                    }
                    className={`input-field pl-9 ${
                      form.useCustom ? 'ring-2 ring-teal/30 border-teal' : ''
                    }`}
                  />
                </div>
              </div>

              <p className="text-xs text-primary/40 mt-2">
                Selected: {formatPrice(getEffectiveAmount())}
              </p>
            </div>

            {/* Recipient info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Recipient Email
                </label>
                <input
                  type="email"
                  name="recipientEmail"
                  value={form.recipientEmail}
                  onChange={handleInputChange}
                  placeholder="friend@example.com"
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                  Recipient Name
                </label>
                <input
                  type="text"
                  name="recipientName"
                  value={form.recipientName}
                  onChange={handleInputChange}
                  placeholder="Jane Doe"
                  className="input-field"
                />
              </div>
            </div>

            {/* Message */}
            <div>
              <label className="block text-xs font-medium text-primary/60 uppercase tracking-wider mb-1.5">
                Personal Message
              </label>
              <textarea
                name="message"
                value={form.message}
                onChange={handleInputChange}
                placeholder="Happy Birthday! Enjoy shopping at I Love FDL."
                rows={3}
                maxLength={500}
                className="input-field resize-none"
              />
              <p className="text-xs text-primary/40 mt-1">
                {form.message.length}/500 characters
              </p>
            </div>

            {/* Error / Success messages */}
            {purchaseError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {purchaseError}
              </div>
            )}

            {purchaseSuccess && (
              <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
                <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {purchaseSuccess}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={purchasing || !user}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {purchasing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              {purchasing
                ? 'Processing...'
                : `Purchase Gift Card - ${formatPrice(getEffectiveAmount())}`}
            </button>
          </form>
        </div>

        {/* ─── Check Balance ────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-light p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-6">
            <Search className="w-5 h-5 text-teal" />
            <h2 className="text-lg sm:text-xl font-bold text-primary">
              Check Gift Card Balance
            </h2>
          </div>

          <form
            onSubmit={handleCheckBalance}
            className="flex flex-col sm:flex-row gap-3"
          >
            <input
              type="text"
              value={balanceCode}
              onChange={(e) => setBalanceCode(e.target.value)}
              placeholder="Enter gift card code"
              className="input-field flex-1"
            />
            <button
              type="submit"
              disabled={checkingBalance}
              className="btn-primary text-sm whitespace-nowrap disabled:opacity-50"
            >
              {checkingBalance ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Search className="w-4 h-4 mr-2" />
              )}
              {checkingBalance ? 'Checking...' : 'Check Balance'}
            </button>
          </form>

          {/* Balance result */}
          {balanceResult && (
            <div className="mt-4 bg-teal/5 border border-teal/20 rounded-lg px-4 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary/60 uppercase tracking-wider mb-1">
                    Balance
                  </p>
                  <p className="text-2xl font-bold text-teal">
                    {formatPrice(balanceResult.balance)}
                  </p>
                </div>
                <div>{statusBadge(balanceResult.status)}</div>
              </div>
            </div>
          )}

          {balanceError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {balanceError}
            </div>
          )}
        </div>

        {/* ─── Your Gift Cards ──────────────────────────────── */}
        {user && (
          <div className="bg-white rounded-xl border border-light p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-6">
              <Gift className="w-5 h-5 text-teal" />
              <h2 className="text-lg sm:text-xl font-bold text-primary">
                Your Gift Cards
              </h2>
            </div>

            {loadingCards ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="bg-light rounded-xl p-5 animate-pulse"
                  >
                    <div className="h-4 bg-white rounded w-1/3 mb-3" />
                    <div className="h-6 bg-white rounded w-1/2 mb-2" />
                    <div className="h-3 bg-white rounded w-2/3 mb-2" />
                    <div className="h-3 bg-white rounded w-1/4" />
                  </div>
                ))}
              </div>
            ) : giftCards.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {giftCards.map((card) => {
                  const isRevealed = revealedCodes.has(card.id);

                  return (
                    <div
                      key={card.id}
                      className="bg-gradient-to-br from-teal/5 to-accent/5 rounded-xl border border-light p-5 hover:shadow-md transition-shadow"
                    >
                      {/* Top: status + amount */}
                      <div className="flex items-start justify-between mb-3">
                        {statusBadge(card.status)}
                        <div className="text-right">
                          <p className="text-xs text-primary/40">Balance</p>
                          <p className="text-lg font-bold text-teal">
                            {formatPrice(card.currentBalance)}
                          </p>
                        </div>
                      </div>

                      {/* Code with reveal toggle */}
                      <div className="flex items-center gap-2 mb-3">
                        <code className="bg-white px-3 py-1.5 rounded-lg text-sm font-mono text-primary border border-light flex-1">
                          {isRevealed ? card.code : maskCode(card.code)}
                        </code>
                        <button
                          type="button"
                          onClick={() => toggleRevealCode(card.id)}
                          className="p-1.5 rounded-lg text-primary/40 hover:text-primary/60 hover:bg-white transition-colors"
                          aria-label={isRevealed ? 'Hide code' : 'Show code'}
                        >
                          {isRevealed ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Initial balance */}
                      <p className="text-xs text-primary/50 mb-1">
                        Original value:{' '}
                        <span className="font-medium">
                          {formatPrice(card.initialBalance)}
                        </span>
                      </p>

                      {/* Recipient info */}
                      {(card.recipientName || card.recipientEmail) && (
                        <div className="flex items-center gap-1.5 text-xs text-primary/50 mb-1">
                          <Send className="w-3 h-3" />
                          <span>
                            To:{' '}
                            {card.recipientName ||
                              card.recipientEmail ||
                              'N/A'}
                          </span>
                        </div>
                      )}

                      {/* Message preview */}
                      {card.message && (
                        <p className="text-xs text-primary/40 italic mt-2 line-clamp-2">
                          &quot;{card.message}&quot;
                        </p>
                      )}

                      {/* Dates */}
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-light/60">
                        <p className="text-xs text-primary/40">
                          Purchased {formatDate(card.createdAt)}
                        </p>
                        {card.expiresAt && (
                          <p className="text-xs text-primary/40">
                            Expires {formatDate(card.expiresAt)}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gift className="w-12 h-12 text-primary/15 mx-auto mb-3" />
                <p className="text-primary/60 text-sm mb-1">
                  No gift cards yet
                </p>
                <p className="text-primary/40 text-xs">
                  Purchase your first gift card above to get started!
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

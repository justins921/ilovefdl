'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  StarHalf,
  MessageSquare,
  CheckCircle,
  Trash2,
  X,
  Store,
  ArrowRight,
  Loader2,
  ShieldCheck,
  ThumbsUp,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils';
import type { Review, Vendor } from '@ilovefdl/shared';

// ─── Helpers ──────────────────────────────────────────────

function renderStars(rating: number, size: string = 'w-4 h-4') {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating - fullStars >= 0.25 && rating - fullStars < 0.75;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);

  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Star key={`full-${i}`} className={`${size} text-amber-400 fill-amber-400`} />,
    );
  }
  if (hasHalf) {
    stars.push(
      <StarHalf key="half" className={`${size} text-amber-400 fill-amber-400`} />,
    );
  }
  for (let i = 0; i < emptyStars; i++) {
    stars.push(
      <Star key={`empty-${i}`} className={`${size} text-primary/20`} />,
    );
  }

  return stars;
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ─── Component ────────────────────────────────────────────

export default function ReviewsPage() {
  const { user, loading: authLoading } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Action states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchReviews = useCallback(
    async (vendorId: string, pageNum: number) => {
      try {
        const res = await api.getReviews({ vendorId, page: pageNum, limit });
        setReviews(res.data);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      } catch {
        setError('Failed to load reviews.');
      }
    },
    [],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;

    async function init() {
      try {
        const tokenStr = localStorage.getItem('ilovefdl_token');
        if (tokenStr) api.setToken(tokenStr);

        const vendorRes = await api.getMyVendor();
        const myVendor = vendorRes.data;
        setVendor(myVendor);
        await fetchReviews(myVendor.id, 1);
      } catch {
        // Vendor profile not found
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [user, authLoading, fetchReviews]);

  // Page change
  useEffect(() => {
    if (vendor && page > 1) {
      fetchReviews(vendor.id, page);
    }
  }, [page, vendor, fetchReviews]);

  // ─── Actions ──────────────────────────────────────────

  async function handleApprove(reviewId: string) {
    setApprovingId(reviewId);
    try {
      const res = await api.updateReview(reviewId, {});
      setReviews((prev) =>
        prev.map((r) => (r.id === reviewId ? { ...r, ...res.data, isApproved: true } : r)),
      );
    } catch {
      setError('Failed to approve review.');
    } finally {
      setApprovingId(null);
    }
  }

  async function handleDelete(reviewId: string) {
    try {
      await api.deleteReview(reviewId);
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      setTotal((prev) => prev - 1);
    } catch {
      setError('Failed to delete review.');
    } finally {
      setDeletingId(null);
    }
  }

  // ─── Rating Summary ──────────────────────────────────

  function computeSummary() {
    if (reviews.length === 0) {
      return { average: 0, total: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } };
    }
    const distribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let sum = 0;
    for (const r of reviews) {
      distribution[r.rating] = (distribution[r.rating] || 0) + 1;
      sum += r.rating;
    }
    return {
      average: sum / reviews.length,
      total: total || reviews.length,
      distribution,
    };
  }

  // ─── Loading Skeleton ────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-6 bg-white rounded w-1/4" />
            {/* Summary skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="h-36 bg-white rounded-xl" />
              <div className="h-36 bg-white rounded-xl" />
            </div>
            {/* Review card skeletons */}
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── No Vendor State ─────────────────────────────────

  if (!vendor) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center max-w-md">
          <Store className="w-16 h-16 text-primary/20 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-primary mb-3">
            No Vendor Profile
          </h1>
          <p className="text-primary/60 mb-6">
            You need a vendor profile to view reviews. Apply to become a vendor
            on the I Love FDL marketplace.
          </p>
          <a href="/auth" className="btn-primary">
            Apply to Sell
            <ArrowRight className="w-4 h-4 ml-2" />
          </a>
        </div>
      </div>
    );
  }

  const summary = computeSummary();

  // ─── Main Render ─────────────────────────────────────

  return (
    <div className="min-h-screen bg-light">
      {/* Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-primary mb-1">
                Reviews
              </h1>
              <p className="text-primary/60 text-sm sm:text-base">
                Manage customer reviews for {vendor.businessName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary/60">
              <MessageSquare className="w-4 h-4" />
              <span>{total} total review{total !== 1 ? 's' : ''}</span>
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

        {/* Rating Summary */}
        {reviews.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            {/* Average Rating Card */}
            <div className="bg-white rounded-xl border border-light p-6">
              <h3 className="text-xs font-semibold text-primary/50 uppercase tracking-wider mb-3">
                Average Rating
              </h3>
              <div className="flex items-center gap-4">
                <span className="text-4xl font-bold text-primary">
                  {summary.average.toFixed(1)}
                </span>
                <div>
                  <div className="flex items-center gap-0.5 mb-1">
                    {renderStars(summary.average, 'w-5 h-5')}
                  </div>
                  <p className="text-sm text-primary/50">
                    Based on {summary.total} review{summary.total !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Rating Distribution Card */}
            <div className="bg-white rounded-xl border border-light p-6">
              <h3 className="text-xs font-semibold text-primary/50 uppercase tracking-wider mb-3">
                Rating Distribution
              </h3>
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => {
                  const count = summary.distribution[rating] || 0;
                  const pct =
                    reviews.length > 0
                      ? (count / reviews.length) * 100
                      : 0;
                  return (
                    <div key={rating} className="flex items-center gap-2">
                      <span className="text-xs font-medium text-primary/60 w-3 text-right">
                        {rating}
                      </span>
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 flex-shrink-0" />
                      <div className="flex-1 h-2 bg-light rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-400 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs text-primary/50 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Reviews List */}
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl border border-light p-6 hover:shadow-sm transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Review content */}
                  <div className="flex-1 min-w-0">
                    {/* Top row: product, customer, date */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                      {review.product && (
                        <span className="text-sm font-semibold text-primary">
                          {review.product.name}
                        </span>
                      )}
                      <span className="text-xs text-primary/40">|</span>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-[10px] font-bold text-accent">
                            {getInitials(review.user?.name)}
                          </span>
                        </div>
                        <span className="text-sm text-primary/70">
                          {review.user?.name || 'Anonymous'}
                        </span>
                      </div>
                      <span className="text-xs text-primary/40">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>

                    {/* Stars */}
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {renderStars(review.rating)}
                      </div>
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal/10 text-teal">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Purchase
                        </span>
                      )}
                      {!review.isApproved && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                          Pending Approval
                        </span>
                      )}
                    </div>

                    {/* Title & Body */}
                    {review.title && (
                      <h4 className="text-sm font-semibold text-primary mb-1">
                        {review.title}
                      </h4>
                    )}
                    {review.body && (
                      <p className="text-sm text-primary/70 leading-relaxed">
                        {review.body}
                      </p>
                    )}

                    {/* Images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex items-center gap-2 mt-3">
                        {review.images.map((img, idx) => (
                          <img
                            key={idx}
                            src={img}
                            alt={`Review image ${idx + 1}`}
                            className="w-16 h-16 rounded-lg object-cover border border-light"
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {!review.isApproved && (
                      <button
                        onClick={() => handleApprove(review.id)}
                        disabled={approvingId === review.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-teal bg-teal/10 rounded-lg hover:bg-teal/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Approve review"
                      >
                        {approvingId === review.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ThumbsUp className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </button>
                    )}
                    {review.isApproved && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-teal/60">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Approved
                      </span>
                    )}

                    {deletingId === review.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(review.id)}
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
                        onClick={() => setDeletingId(review.id)}
                        className="p-2 rounded-lg text-primary/50 hover:text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 text-sm font-medium text-primary/60 bg-white border border-light rounded-lg hover:bg-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="text-sm text-primary/60">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 text-sm font-medium text-primary/60 bg-white border border-light rounded-lg hover:bg-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <MessageSquare className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              No reviews yet
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              Once customers start leaving reviews on your products, they will
              appear here. Reviews help build trust and boost sales.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

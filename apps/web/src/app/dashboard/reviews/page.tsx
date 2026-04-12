'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Star,
  Store,
  ArrowRight,
  X,
  Trash2,
  ShieldCheck,
  MessageSquare,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils';
import type { Review, Vendor } from '@ilovefdl/shared';

const RATING_FILTERS = ['ALL', 5, 4, 3, 2, 1] as const;
type RatingFilter = (typeof RATING_FILTERS)[number];

const RATING_LABELS: Record<number, string> = {
  5: '5 Star',
  4: '4 Star',
  3: '3 Star',
  2: '2 Star',
  1: '1 Star',
};

function renderStars(rating: number) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating
              ? 'text-amber-400 fill-amber-400'
              : 'text-primary/20'
          }`}
        />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter state
  const [ratingFilter, setRatingFilter] = useState<RatingFilter>('ALL');

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const tokenStr = localStorage.getItem('ilovefdl_token');
      if (tokenStr) {
        api.setToken(tokenStr);
      }

      const vendorRes = await api.getMyVendor();
      const myVendor = vendorRes.data;

      if (myVendor) {
        setVendor(myVendor);
        const reviewsRes = await api.getReviews({
          vendorId: myVendor.id,
          limit: 50,
        });
        setReviews(reviewsRes.data);
      }
    } catch {
      setError('Failed to load reviews.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    setDeletingId(id);
    try {
      await api.deleteReview(id);
      setReviews((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setError('Failed to delete review.');
    } finally {
      setDeletingId(null);
    }
  };

  // ─── Computed Stats ─────────────────────────────────────

  const totalReviews = reviews.length;
  const averageRating =
    totalReviews > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews
      : 0;
  const ratingDistribution: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach((r) => {
    if (ratingDistribution[r.rating] !== undefined) {
      ratingDistribution[r.rating]++;
    }
  });

  // ─── Filtered Reviews ──────────────────────────────────

  const filteredReviews =
    ratingFilter === 'ALL'
      ? reviews
      : reviews.filter((r) => r.rating === ratingFilter);

  // ─── Loading State ─────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-white rounded w-1/3" />
            <div className="h-10 bg-white rounded w-2/3" />
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-white rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── No Vendor State ───────────────────────────────────

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

  // ─── Main Render ───────────────────────────────────────

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
                Manage reviews for {vendor.businessName}
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-primary/60">
              <MessageSquare className="w-4 h-4" />
              <span>
                {totalReviews} total review{totalReviews !== 1 ? 's' : ''}
              </span>
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

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {/* Total Reviews */}
          <div className="bg-white rounded-xl border border-light p-6">
            <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
              Total Reviews
            </p>
            <p className="text-3xl font-bold text-primary">{totalReviews}</p>
          </div>

          {/* Average Rating */}
          <div className="bg-white rounded-xl border border-light p-6">
            <p className="text-primary/50 text-xs uppercase tracking-wider mb-1">
              Average Rating
            </p>
            <div className="flex items-center gap-3">
              <p className="text-3xl font-bold text-primary">
                {averageRating > 0 ? averageRating.toFixed(1) : '--'}
              </p>
              {averageRating > 0 && renderStars(Math.round(averageRating))}
            </div>
          </div>

          {/* Rating Distribution */}
          <div className="bg-white rounded-xl border border-light p-6">
            <p className="text-primary/50 text-xs uppercase tracking-wider mb-3">
              Distribution
            </p>
            <div className="space-y-1.5">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star];
                const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-2 text-xs">
                    <span className="text-primary/60 w-3 text-right">{star}</span>
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                    <div className="flex-1 h-2 bg-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-primary/40 w-6 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rating Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {RATING_FILTERS.map((filter) => {
            const isActive = ratingFilter === filter;
            const count =
              filter === 'ALL'
                ? reviews.length
                : reviews.filter((r) => r.rating === filter).length;
            return (
              <button
                key={filter}
                onClick={() => setRatingFilter(filter)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-white'
                    : 'bg-white border border-light text-primary/60 hover:text-primary hover:border-primary/20'
                }`}
              >
                {filter === 'ALL' ? 'All' : RATING_LABELS[filter]}{' '}
                <span
                  className={`ml-1 ${isActive ? 'text-white/70' : 'text-primary/40'}`}
                >
                  ({count})
                </span>
              </button>
            );
          })}
        </div>

        {/* Reviews List */}
        {filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {filteredReviews.map((review) => (
              <div
                key={review.id}
                className="bg-white rounded-xl border border-light p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Left: Review Content */}
                  <div className="min-w-0 flex-1">
                    {/* Rating & Badges */}
                    <div className="flex items-center gap-3 mb-2">
                      {renderStars(review.rating)}
                      {review.isVerifiedPurchase && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal/10 text-teal">
                          <ShieldCheck className="w-3 h-3" />
                          Verified Purchase
                        </span>
                      )}
                      {review.isApproved ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                          Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700">
                          Pending Approval
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    {review.title && (
                      <h3 className="text-sm font-semibold text-primary mb-1">
                        {review.title}
                      </h3>
                    )}

                    {/* Body */}
                    {review.body && (
                      <p className="text-sm text-primary/70 mb-3 line-clamp-3">
                        {review.body}
                      </p>
                    )}

                    {/* Meta: Reviewer, Product, Date */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-primary/50">
                      {/* Reviewer */}
                      <div className="flex items-center gap-2">
                        {review.user?.avatarUrl ? (
                          <img
                            src={review.user.avatarUrl}
                            alt={review.user.name || 'Reviewer'}
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-accent">
                              {(review.user?.name || 'U').charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span>{review.user?.name || 'Anonymous'}</span>
                      </div>

                      {/* Product */}
                      <span>
                        {review.product?.name ||
                          `Product ${review.productId.slice(0, 8)}...`}
                      </span>

                      {/* Date */}
                      <span>{formatDate(review.createdAt)}</span>
                    </div>
                  </div>

                  {/* Right: Delete Button */}
                  <button
                    onClick={() => handleDelete(review.id)}
                    disabled={deletingId === review.id}
                    className="flex-shrink-0 p-2 rounded-lg text-primary/30 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    title="Delete review"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-xl border border-light p-16 text-center">
            <MessageSquare className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-primary mb-2">
              {ratingFilter === 'ALL'
                ? 'No reviews yet'
                : `No ${RATING_LABELS[ratingFilter as number].toLowerCase()} reviews`}
            </h2>
            <p className="text-primary/60 mb-6 max-w-md mx-auto">
              {ratingFilter === 'ALL'
                ? 'When customers leave reviews on your products, they will appear here.'
                : 'Try selecting a different rating filter to see other reviews.'}
            </p>
            {ratingFilter !== 'ALL' && (
              <button
                onClick={() => setRatingFilter('ALL')}
                className="btn-primary"
              >
                View All Reviews
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

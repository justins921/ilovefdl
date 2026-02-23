'use client';

import { useState, useEffect, useCallback } from 'react';
import { Star, StarHalf, MessageSquare, Loader2, AlertCircle } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate } from '@/lib/utils';
import type { Review, ApiResponse, PaginatedResponse } from '@ilovefdl/shared';
import { ApiError } from '@ilovefdl/shared';

interface ProductReviewsProps {
  productId: string;
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: Record<number, number>;
}

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

function getInitials(name: string | null): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function ProductReviews({ productId }: ProductReviewsProps) {
  const { user } = useAuth();

  // Summary state
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Reviews list state
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);

  // Write review state
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // Fetch review summary
  const fetchSummary = useCallback(async () => {
    try {
      const res: ApiResponse<ReviewSummary> = await api.getReviewSummary(productId);
      setSummary(res.data);
    } catch {
      // Silently fail — summary is non-critical
    } finally {
      setSummaryLoading(false);
    }
  }, [productId]);

  // Fetch reviews (page 1 or append)
  const fetchReviews = useCallback(
    async (pageNum: number, append: boolean = false) => {
      try {
        const res: PaginatedResponse<Review> = await api.getReviews({
          productId,
          page: pageNum,
          limit: 10,
        });
        setReviews((prev) => (append ? [...prev, ...res.data] : res.data));
        setTotalPages(res.totalPages);
        setPage(pageNum);
      } catch {
        // Silently fail
      } finally {
        setReviewsLoading(false);
        setLoadingMore(false);
      }
    },
    [productId],
  );

  useEffect(() => {
    setSummaryLoading(true);
    setReviewsLoading(true);
    fetchSummary();
    fetchReviews(1);
  }, [fetchSummary, fetchReviews]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchReviews(page + 1, true);
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newRating === 0) {
      setSubmitError('Please select a rating.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      await api.createReview({
        productId,
        rating: newRating,
        title: newTitle.trim() || undefined,
        body: newBody.trim() || undefined,
        images: [],
      });
      setSubmitSuccess(true);
      setNewRating(0);
      setNewTitle('');
      setNewBody('');

      // Refresh data
      fetchSummary();
      fetchReviews(1);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        setSubmitError('You have already reviewed this product.');
      } else {
        setSubmitError('Failed to submit review. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-12">
      <div className="flex items-center gap-3 mb-8">
        <MessageSquare className="w-6 h-6 text-teal" />
        <h2 className="text-2xl font-bold text-primary">Customer Reviews</h2>
      </div>

      {/* Rating Summary */}
      {summaryLoading ? (
        <div className="bg-white rounded-xl border border-light p-8 mb-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-teal animate-spin" />
        </div>
      ) : summary ? (
        <div className="bg-white rounded-xl border border-light p-6 mb-8">
          <div className="flex flex-col sm:flex-row gap-8">
            {/* Average rating */}
            <div className="flex flex-col items-center justify-center sm:min-w-[160px]">
              <span className="text-5xl font-bold text-primary">
                {summary.averageRating.toFixed(1)}
              </span>
              <div className="flex items-center gap-1 mt-2">
                {renderStars(summary.averageRating, 'w-5 h-5')}
              </div>
              <span className="text-sm text-primary/60 mt-1">
                {summary.totalReviews} {summary.totalReviews === 1 ? 'review' : 'reviews'}
              </span>
            </div>

            {/* Distribution bars */}
            <div className="flex-1 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = summary.distribution[star] || 0;
                const percentage =
                  summary.totalReviews > 0
                    ? (count / summary.totalReviews) * 100
                    : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm text-primary/60 w-8 text-right">
                      {star}
                    </span>
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 flex-shrink-0" />
                    <div className="flex-1 h-2.5 bg-light rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-400 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-primary/60 w-8">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : null}

      {/* Reviews List */}
      {reviewsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 text-teal animate-spin" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="bg-white rounded-xl border border-light p-8 text-center mb-8">
          <MessageSquare className="w-10 h-10 text-primary/20 mx-auto mb-3" />
          <p className="text-primary/60">
            No reviews yet. Be the first to share your experience!
          </p>
        </div>
      ) : (
        <div className="space-y-4 mb-8">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-white rounded-xl border border-light p-6"
            >
              <div className="flex items-start gap-3 sm:gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {review.user?.avatarUrl ? (
                    <img
                      src={review.user.avatarUrl}
                      alt={review.user.name || 'User'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-teal/10 flex items-center justify-center text-sm font-semibold text-teal">
                      {getInitials(review.user?.name ?? null)}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-semibold text-primary">
                      {review.user?.name || 'Anonymous'}
                    </span>
                    {review.isVerifiedPurchase && (
                      <span className="inline-flex items-center text-xs font-medium text-teal bg-teal/10 px-2 py-0.5 rounded-full">
                        Verified Purchase
                      </span>
                    )}
                    <span className="text-sm text-primary/60">
                      {formatDate(review.createdAt)}
                    </span>
                  </div>

                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-2">
                    {renderStars(review.rating)}
                  </div>

                  {/* Title */}
                  {review.title && (
                    <h4 className="font-bold text-primary mb-1">
                      {review.title}
                    </h4>
                  )}

                  {/* Body */}
                  {review.body && (
                    <p className="text-primary/70 text-sm whitespace-pre-wrap">
                      {review.body}
                    </p>
                  )}

                  {/* Review images */}
                  {review.images && review.images.length > 0 && (
                    <div className="flex gap-2 mt-3">
                      {review.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Review image ${i + 1}`}
                          className="w-16 h-16 rounded-lg object-cover border border-light"
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Load More */}
          {page < totalPages && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="btn-outline inline-flex items-center gap-2"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Load More Reviews'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Write a Review */}
      {user ? (
        <div className="bg-white rounded-xl border border-light p-6">
          <h3 className="text-lg font-bold text-primary mb-4">
            Write a Review
          </h3>

          {submitSuccess && (
            <div className="mb-4 p-3 rounded-lg bg-teal/10 text-teal text-sm">
              Thank you! Your review has been submitted.
            </div>
          )}

          {submitError && (
            <div className="mb-4 p-3 rounded-lg bg-accent/10 text-accent text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {submitError}
            </div>
          )}

          <form onSubmit={handleSubmitReview}>
            {/* Star picker */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-primary mb-2">
                Rating
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1.5 transition-transform hover:scale-110"
                    aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || newRating)
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-primary/20'
                      }`}
                    />
                  </button>
                ))}
                {newRating > 0 && (
                  <span className="ml-2 text-sm text-primary/60">
                    {newRating} of 5
                  </span>
                )}
              </div>
            </div>

            {/* Title */}
            <div className="mb-4">
              <label
                htmlFor="review-title"
                className="block text-sm font-medium text-primary mb-2"
              >
                Title (optional)
              </label>
              <input
                id="review-title"
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Summarize your experience"
                maxLength={200}
                className="input-field w-full"
              />
            </div>

            {/* Body */}
            <div className="mb-4">
              <label
                htmlFor="review-body"
                className="block text-sm font-medium text-primary mb-2"
              >
                Review (optional)
              </label>
              <textarea
                id="review-body"
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="Share the details of your experience..."
                rows={4}
                maxLength={5000}
                className="input-field w-full resize-none"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={submitting || newRating === 0}
              className="btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Review'
              )}
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-light p-6 text-center">
          <p className="text-primary/60">
            <a href="/login" className="text-teal font-medium hover:underline">
              Sign in
            </a>{' '}
            to leave a review.
          </p>
        </div>
      )}
    </div>
  );
}

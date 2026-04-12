'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Clock,
  Share2,
  Facebook,
  Twitter,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { formatDate, formatCategoryName, resolveImageUrl } from '@/lib/utils';
import BlogPostCard from '@/components/BlogPostCard';
import type { BlogPost, BlogComment } from '@ilovefdl/shared';

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [prevPost, setPrevPost] = useState<{ slug: string; title: string; featuredImage: string | null } | null>(null);
  const [nextPost, setNextPost] = useState<{ slug: string; title: string; featuredImage: string | null } | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [loading, setLoading] = useState(true);

  // Comment form
  const [commentName, setCommentName] = useState('');
  const [commentEmail, setCommentEmail] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentSuccess, setCommentSuccess] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.getPost(params.slug);
        setPost(res.data);
        setPrevPost(res.data.prevPost ?? null);
        setNextPost(res.data.nextPost ?? null);

        // Fetch comments
        try {
          const commentsRes = await api.getPostComments(params.slug);
          setComments(commentsRes.data);
        } catch {
          // Silently fail
        }

        // Fetch related posts from same category
        if (res.data.category) {
          try {
            const relatedRes = await api.getPosts({
              category: res.data.category,
              limit: 3,
              status: 'PUBLISHED',
            });
            setRelatedPosts(
              relatedRes.data.filter((p) => p.id !== res.data.id).slice(0, 3)
            );
          } catch {
            // Silently fail for related posts
          }
        }
      } catch {
        setPost(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.slug]);

  async function handleSubmitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setSubmittingComment(true);
    try {
      const res = await api.createPostComment(params.slug, {
        name: commentName || user?.name || 'Anonymous',
        email: commentEmail || undefined,
        body: commentBody,
      });
      setComments((prev) => [res.data, ...prev]);
      setCommentBody('');
      setCommentSuccess(true);
      setTimeout(() => setCommentSuccess(false), 3000);
    } catch {
      // Failed to post comment
    } finally {
      setSubmittingComment(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-light">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="animate-pulse space-y-6">
            <div className="h-4 bg-white rounded w-1/4" />
            <div className="h-10 bg-white rounded w-3/4" />
            <div className="h-4 bg-white rounded w-1/2" />
            <div className="aspect-[16/9] bg-white rounded-xl" />
            <div className="space-y-3">
              <div className="h-4 bg-white rounded w-full" />
              <div className="h-4 bg-white rounded w-full" />
              <div className="h-4 bg-white rounded w-2/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-light flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">
            Article Not Found
          </h1>
          <p className="text-primary/60 mb-6">
            This article may have been removed or doesn&apos;t exist.
          </p>
          <Link href="/news" className="btn-primary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to News
          </Link>
        </div>
      </div>
    );
  }

  const estimatedReadTime = Math.max(
    1,
    Math.ceil((post.content?.split(/\s+/).length || 0) / 200)
  );

  return (
    <div className="min-h-screen bg-light">
      <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-primary/60 mb-8 overflow-hidden">
          <Link href="/news" className="hover:text-teal transition-colors shrink-0">
            News
          </Link>
          <span className="shrink-0">/</span>
          <Link
            href={`/news?category=${post.category}`}
            className="hover:text-teal transition-colors shrink-0"
          >
            {formatCategoryName(post.category)}
          </Link>
          <span className="shrink-0">/</span>
          <span className="text-primary truncate">{post.title}</span>
        </nav>

        {/* Category Badge */}
        <Link
          href={`/news?category=${post.category}`}
          className="badge-teal mb-4 inline-block hover:bg-teal/20 transition-colors"
        >
          {formatCategoryName(post.category)}
        </Link>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary leading-tight mb-6">
          {post.title}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-primary/60 mb-8 pb-8 border-b border-light">
          {post.author && (
            <div className="flex items-center gap-2">
              {post.author.avatarUrl ? (
                <img
                  src={post.author.avatarUrl}
                  alt={post.author.name || 'Author'}
                  className="w-8 h-8 rounded-full object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-teal/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-teal" />
                </div>
              )}
              <span className="font-medium text-primary">
                {post.author.name || 'Staff Writer'}
              </span>
            </div>
          )}
          {post.publishedAt && (
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(post.publishedAt)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{estimatedReadTime} min read</span>
          </div>
        </div>

        {/* Featured Image */}
        {post.featuredImage && (
          <div className="aspect-[16/9] rounded-xl overflow-hidden mb-10">
            <img
              src={resolveImageUrl(post.featuredImage)}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-sm sm:prose-lg max-w-none text-primary/80 leading-relaxed mb-12"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Tags */}
        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-10 pb-10 border-b border-light">
            <Tag className="w-4 h-4 text-primary/40" />
            {post.tags.map((tag) => (
              <span key={tag} className="badge-teal">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Share */}
        <div className="flex items-center gap-4 mb-16">
          <span className="text-sm font-medium text-primary/60">Share:</span>
          <button
            onClick={() => {
              if (typeof navigator !== 'undefined' && navigator.share) {
                navigator.share({
                  title: post.title,
                  url: window.location.href,
                });
              }
            }}
            className="p-2 rounded-lg bg-light hover:bg-teal/10 text-primary/60 hover:text-teal transition-colors"
            aria-label="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        {/* Previous / Next Post Navigation */}
        {(prevPost || nextPost) && (
          <div className="grid sm:grid-cols-2 gap-4 mb-16">
            {prevPost ? (
              <Link
                href={`/news/${prevPost.slug}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-white border border-light hover:border-teal/30 transition-colors group"
              >
                <ChevronLeft className="w-5 h-5 text-primary/30 group-hover:text-teal flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs text-primary/50 mb-1">Previous Post</p>
                  <p className="text-sm font-medium text-primary truncate group-hover:text-teal transition-colors">
                    {prevPost.title}
                  </p>
                </div>
              </Link>
            ) : (
              <div />
            )}
            {nextPost ? (
              <Link
                href={`/news/${nextPost.slug}`}
                className="flex items-center justify-end gap-4 p-4 rounded-xl bg-white border border-light hover:border-teal/30 transition-colors group text-right"
              >
                <div className="min-w-0">
                  <p className="text-xs text-primary/50 mb-1">Next Post</p>
                  <p className="text-sm font-medium text-primary truncate group-hover:text-teal transition-colors">
                    {nextPost.title}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-primary/30 group-hover:text-teal flex-shrink-0" />
              </Link>
            ) : (
              <div />
            )}
          </div>
        )}

        {/* Comments Section */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-primary mb-6 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Comments {comments.length > 0 && `(${comments.length})`}
          </h2>

          {/* Leave a Reply */}
          <div className="bg-white rounded-xl border border-light p-6 mb-8">
            <h3 className="font-semibold text-primary mb-4">Leave a Reply</h3>
            {commentSuccess && (
              <div className="p-3 mb-4 bg-teal/10 border border-teal/20 rounded-lg text-teal text-sm">
                Your comment has been posted!
              </div>
            )}
            <form onSubmit={handleSubmitComment} className="space-y-4">
              {!user && (
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Name <span className="text-accent">*</span>
                    </label>
                    <input
                      type="text"
                      value={commentName}
                      onChange={(e) => setCommentName(e.target.value)}
                      className="input-field w-full"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">
                      Email <span className="text-primary/40">(optional)</span>
                    </label>
                    <input
                      type="email"
                      value={commentEmail}
                      onChange={(e) => setCommentEmail(e.target.value)}
                      className="input-field w-full"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-primary mb-1">
                  Comment <span className="text-accent">*</span>
                </label>
                <textarea
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  className="input-field w-full h-28 resize-y"
                  placeholder="Share your thoughts..."
                  required
                  maxLength={5000}
                />
              </div>
              <button
                type="submit"
                disabled={submittingComment || !commentBody.trim()}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {submittingComment ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Post Comment
              </button>
            </form>
          </div>

          {/* Comments List */}
          {comments.length > 0 ? (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-white rounded-xl border border-light p-6">
                  <div className="flex items-center gap-3 mb-3">
                    {comment.user?.avatarUrl ? (
                      <img
                        src={comment.user.avatarUrl}
                        alt={comment.name}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-teal/10 flex items-center justify-center">
                        <User className="w-4 h-4 text-teal" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-primary">
                        {comment.user?.name || comment.name}
                      </p>
                      <p className="text-xs text-primary/50">
                        {formatDate(comment.createdAt)}
                      </p>
                    </div>
                  </div>
                  <p className="text-primary/70 text-sm leading-relaxed whitespace-pre-wrap">
                    {comment.body}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 bg-white rounded-xl border border-light">
              <MessageSquare className="w-8 h-8 text-primary/20 mx-auto mb-2" />
              <p className="text-primary/50 text-sm">
                No comments yet. Be the first to share your thoughts!
              </p>
            </div>
          )}
        </div>
      </article>

      {/* Related Posts */}
      {relatedPosts.length > 0 && (
        <section className="bg-white py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 className="text-2xl font-bold text-primary mb-8">
              More from {formatCategoryName(post.category)}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {relatedPosts.map((relatedPost) => (
                <BlogPostCard key={relatedPost.id} post={relatedPost} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

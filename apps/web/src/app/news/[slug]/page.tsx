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
} from 'lucide-react';
import api from '@/lib/api';
import { formatDate, formatCategoryName } from '@/lib/utils';
import BlogPostCard from '@/components/BlogPostCard';
import type { BlogPost } from '@ilovefdl/shared';

export default function BlogPostPage({
  params,
}: {
  params: { slug: string };
}) {
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await api.getPost(params.slug);
        setPost(res.data);

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
        <nav className="flex items-center gap-2 text-sm text-primary/60 mb-8">
          <Link href="/news" className="hover:text-teal transition-colors">
            News
          </Link>
          <span>/</span>
          <Link
            href={`/news?category=${post.category}`}
            className="hover:text-teal transition-colors"
          >
            {formatCategoryName(post.category)}
          </Link>
          <span>/</span>
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
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none text-primary/80 leading-relaxed mb-12"
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

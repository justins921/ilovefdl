'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search, Newspaper, ChevronLeft, ChevronRight } from 'lucide-react';
import BlogPostCard from '@/components/BlogPostCard';
import api from '@/lib/api';
import { formatCategoryName } from '@/lib/utils';
import { PostCategory } from '@ilovefdl/shared';
import type { BlogPost, PaginatedResponse } from '@ilovefdl/shared';

const categories = [
  { label: 'All', value: 'ALL' },
  { label: 'The Fondy Frontline', value: PostCategory.THE_FONDY_FRONTLINE },
  { label: 'Faces of our Future', value: PostCategory.FACES_OF_OUR_FUTURE },
  { label: 'Finding Balance', value: PostCategory.FINDING_BALANCE },
  { label: 'Play. Explore. Repeat.', value: PostCategory.PLAY_EXPLORE_REPEAT },
  { label: 'Homegrown Heros', value: PostCategory.HOMEGROWN_HEROS },
  { label: 'The Creative Corner', value: PostCategory.THE_CREATIVE_CORNER },
  { label: 'Weekly Savings', value: PostCategory.WEEKLY_SAVINGS },
];

export default function NewsPage() {
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'ALL';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState(initialCategory);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        limit: 9,
        status: 'PUBLISHED',
      };
      if (search) params.search = search;
      if (category !== 'ALL') params.category = category;

      const res: PaginatedResponse<BlogPost> = await api.getPosts(params);
      setPosts(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchPosts();
  };

  return (
    <div className="min-h-screen bg-light">
      {/* Page Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            Community News
          </h1>
          <p className="text-primary/60 text-lg">
            Stories, profiles, and updates from the heart of Fond du Lac
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search */}
        <form onSubmit={handleSearch} className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search articles..."
              className="input-field pl-12"
            />
          </div>
        </form>

        {/* Category Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
          {categories.map((cat) => (
            <button
              key={cat.value}
              onClick={() => {
                setCategory(cat.value);
                setPage(1);
              }}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                category === cat.value
                  ? 'bg-teal text-white'
                  : 'bg-white text-primary/70 hover:bg-teal/10 border border-light'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-primary/60">
            {total > 0
              ? `${total} article${total !== 1 ? 's' : ''}`
              : 'No articles found'}
          </p>
        </div>

        {/* Blog Post Grid */}
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-[16/9] bg-white" />
                <div className="p-6 space-y-3">
                  <div className="h-3 bg-light rounded w-1/4" />
                  <div className="h-5 bg-light rounded w-3/4" />
                  <div className="h-3 bg-light rounded w-full" />
                  <div className="h-3 bg-light rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {posts.map((post) => (
              <BlogPostCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Newspaper className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">
              No Articles Found
            </h3>
            <p className="text-primary/60 mb-6">
              {search
                ? `No articles match "${search}". Try a different search.`
                : 'Check back soon for new stories from the community.'}
            </p>
            {(search || category !== 'ALL') && (
              <button
                onClick={() => {
                  setSearch('');
                  setCategory('ALL');
                  setPage(1);
                }}
                className="btn-secondary"
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-light hover:bg-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (p) =>
                  p === 1 ||
                  p === totalPages ||
                  (p >= page - 1 && p <= page + 1)
              )
              .map((p, i, arr) => (
                <span key={p} className="contents">
                  {i > 0 && arr[i - 1] !== p - 1 && (
                    <span className="px-2 text-primary/40">...</span>
                  )}
                  <button
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                      page === p
                        ? 'bg-teal text-white'
                        : 'border border-light hover:bg-light text-primary/70'
                    }`}
                  >
                    {p}
                  </button>
                </span>
              ))}
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-light hover:bg-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

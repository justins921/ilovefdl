'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, Beer, ChevronLeft, ChevronRight, Tag, Map, LayoutGrid } from 'lucide-react';
import BarCard from '@/components/BarCard';
import api from '@/lib/api';
import type { Bar, PaginatedResponse } from '@ilovefdl/shared';

const BarMap = dynamic(() => import('@/components/BarMap'), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-light bg-white animate-pulse" style={{ minHeight: 400 }} />
  ),
});

export default function BarsPage() {
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [view, setView] = useState<'grid' | 'map'>('grid');

  const fetchBars = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        limit: 12,
      };
      if (search) params.search = search;

      const res: PaginatedResponse<Bar> = await api.getBars(params);
      setBars(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      setBars([]);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchBars();
  }, [fetchBars]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchBars();
  };

  return (
    <div className="min-h-screen bg-light">
      {/* Page Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
                Bars & Restaurants
              </h1>
              <p className="text-primary/60 text-lg">
                Discover Fond du Lac&apos;s favorite watering holes and their daily specials
              </p>
            </div>
            <Link href="/specials" className="btn-primary whitespace-nowrap">
              <Tag className="w-4 h-4 mr-2" />
              Today&apos;s Specials
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search + View Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bars and restaurants..."
                className="input-field pl-12"
              />
            </div>
          </form>

          <div className="flex items-center gap-1 bg-white rounded-lg border border-light p-1">
            <button
              onClick={() => setView('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'grid'
                  ? 'bg-teal text-white'
                  : 'text-primary/60 hover:text-primary'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Grid
            </button>
            <button
              onClick={() => setView('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'map'
                  ? 'bg-teal text-white'
                  : 'text-primary/60 hover:text-primary'
              }`}
            >
              <Map className="w-4 h-4" />
              Map
            </button>
          </div>
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-primary/60">
            {total > 0
              ? `${total} establishment${total !== 1 ? 's' : ''}`
              : 'No bars found'}
          </p>
        </div>

        {/* Map View */}
        {view === 'map' && !loading && bars.length > 0 && (
          <div className="mb-8">
            <BarMap bars={bars} />
          </div>
        )}

        {/* Bar Grid */}
        {view === 'grid' && (
          <>
            {loading ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="aspect-[16/10] bg-white" />
                    <div className="p-5 space-y-3">
                      <div className="h-5 bg-light rounded w-1/2" />
                      <div className="h-3 bg-light rounded w-full" />
                      <div className="h-3 bg-light rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : bars.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {bars.map((bar) => (
                  <BarCard key={bar.id} bar={bar} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Beer className="w-16 h-16 text-primary/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">
                  No Bars Found
                </h3>
                <p className="text-primary/60 mb-6">
                  {search
                    ? `No results for "${search}". Try a different search.`
                    : 'Check back soon for new listings.'}
                </p>
                {search && (
                  <button
                    onClick={() => {
                      setSearch('');
                      setPage(1);
                    }}
                    className="btn-secondary"
                  >
                    Clear Search
                  </button>
                )}
              </div>
            )}
          </>
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

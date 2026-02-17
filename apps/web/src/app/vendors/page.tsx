'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Store, ChevronLeft, ChevronRight } from 'lucide-react';
import VendorCard from '@/components/VendorCard';
import api from '@/lib/api';
import type { Vendor, PaginatedResponse } from '@ilovefdl/shared';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res: PaginatedResponse<Vendor> = await api.getVendors({
        page,
        limit: 12,
        status: 'APPROVED',
      });
      setVendors(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);
    } catch {
      setVendors([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  return (
    <div className="min-h-screen bg-light">
      {/* Page Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            Local Vendors
          </h1>
          <p className="text-primary/60 text-lg">
            Discover the talented businesses and artisans that call Fond du Lac home
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-primary/60">
            {total > 0
              ? `${total} vendor${total !== 1 ? 's' : ''} in our community`
              : 'No vendors found'}
          </p>
        </div>

        {/* Vendor Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-[2/1] bg-white" />
                <div className="p-5 space-y-3">
                  <div className="h-5 bg-light rounded w-1/2" />
                  <div className="h-3 bg-light rounded w-full" />
                  <div className="h-3 bg-light rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : vendors.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {vendors.map((vendor) => (
              <VendorCard key={vendor.id} vendor={vendor} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Store className="w-16 h-16 text-primary/20 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-primary mb-2">
              No Vendors Yet
            </h3>
            <p className="text-primary/60">
              Local vendors will appear here soon. Check back!
            </p>
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

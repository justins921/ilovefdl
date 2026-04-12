'use client';

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ShoppingBag,
  ShoppingCart,
  Star,
  X,
  AlertTriangle,
  Filter,
} from 'lucide-react';
import api from '@/lib/api';
import { useCart } from '@/components/CartProvider';
import { formatPrice, resolveImageUrl } from '@/lib/utils';
import type { Product, Vendor, PaginatedResponse } from '@ilovefdl/shared';

// ─── Sort Options ────────────────────────────────────────

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'popular', label: 'Popular' },
] as const;

type SortValue = (typeof SORT_OPTIONS)[number]['value'];

const LOW_STOCK_THRESHOLD_DEFAULT = 5;

// ─── Star Rating Component ──────────────────────────────

function StarRating({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, i) => {
        const fill = rating - i;
        return (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              fill >= 1
                ? 'fill-amber-400 text-amber-400'
                : fill >= 0.5
                  ? 'fill-amber-400/50 text-amber-400'
                  : 'fill-none text-primary/20'
            }`}
          />
        );
      })}
      {count !== undefined && (
        <span className="text-xs text-primary/50 ml-1">({count})</span>
      )}
    </div>
  );
}

// ─── Enhanced Product Card ──────────────────────────────

function EnhancedProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const imageUrl = product.images?.[0];
  const isOnSale =
    product.compareAtPrice !== null &&
    product.compareAtPrice !== undefined &&
    product.compareAtPrice > product.price;
  const threshold = product.lowStockThreshold || LOW_STOCK_THRESHOLD_DEFAULT;
  const isLowStock = product.inventory > 0 && product.inventory <= threshold;
  const isOutOfStock = product.inventory <= 0;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: product.price,
      image: imageUrl || null,
      vendorId: product.vendorId,
      vendorName: product.vendor?.businessName || '',
      slug: product.slug,
    });
  };

  return (
    <Link href={`/marketplace/${product.slug}`} className="card group relative">
      {/* Image */}
      <div className="aspect-square bg-light relative overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl ? resolveImageUrl(imageUrl) : ''}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-light to-teal/10">
            <ShoppingBag className="w-12 h-12 text-primary/20" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {isOnSale && (
            <span className="badge bg-accent text-white text-xs px-2 py-0.5 rounded-md font-semibold">
              Sale
            </span>
          )}
          {isLowStock && (
            <span className="flex items-center gap-1 badge bg-amber-500 text-white text-xs px-2 py-0.5 rounded-md font-semibold">
              <AlertTriangle className="w-3 h-3" />
              Low Stock
            </span>
          )}
          {isOutOfStock && (
            <span className="badge bg-red-500 text-white text-xs px-2 py-0.5 rounded-md font-semibold">
              Sold Out
            </span>
          )}
        </div>

        {/* Quick Add to Cart */}
        {!isOutOfStock && (
          <button
            onClick={handleAddToCart}
            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm text-primary p-2.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 hover:bg-teal hover:text-white"
            aria-label="Add to cart"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        {product.vendor && (
          <p className="text-xs text-teal font-medium mb-1 truncate">
            {product.vendor.businessName}
          </p>
        )}
        <h3 className="font-semibold text-primary line-clamp-2 mb-2 group-hover:text-accent transition-colors">
          {product.name}
        </h3>

        {/* Rating */}
        {product.averageRating !== undefined && product.averageRating > 0 && (
          <div className="mb-2">
            <StarRating rating={product.averageRating} count={product.reviewCount} />
          </div>
        )}

        {/* Price */}
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary text-lg">
            {formatPrice(product.price)}
          </span>
          {isOnSale && product.compareAtPrice && (
            <span className="text-sm text-primary/40 line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          )}
          {isOnSale && product.compareAtPrice && (
            <span className="text-xs font-semibold text-accent">
              {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}% off
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── Active Filter Chip ─────────────────────────────────

function FilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-teal/10 text-teal text-sm font-medium">
      {label}
      <button
        onClick={onRemove}
        className="ml-0.5 hover:bg-teal/20 rounded-full p-0.5 transition-colors"
        aria-label={`Remove filter: ${label}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </span>
  );
}

// ─── Main Marketplace Content (uses useSearchParams) ────

function MarketplaceContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // ─── Derive initial state from URL search params ────
  const initialSearch = searchParams.get('search') || '';
  const initialCategory = searchParams.get('category') || '';
  const initialSort = (searchParams.get('sort') as SortValue) || 'newest';
  const initialPage = Number(searchParams.get('page')) || 1;
  const initialMinPrice = searchParams.get('minPrice') || '';
  const initialMaxPrice = searchParams.get('maxPrice') || '';
  const initialVendorId = searchParams.get('vendorId') || '';

  // ─── State ────────────────────────────────────────────
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search, setSearch] = useState(initialSearch);
  const [category, setCategory] = useState(initialCategory);
  const [sort, setSort] = useState<SortValue>(initialSort);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [minPrice, setMinPrice] = useState(initialMinPrice);
  const [maxPrice, setMaxPrice] = useState(initialMaxPrice);
  const [vendorId, setVendorId] = useState(initialVendorId);

  // Vendor list for filter dropdown
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(true);

  // Category tags collected from results
  const [allCategoryTags, setAllCategoryTags] = useState<string[]>([]);

  // Mobile filter sidebar
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // ─── Sync state to URL ────────────────────────────────
  const updateUrl = useCallback(
    (overrides: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams();
      const merged: Record<string, string | number | undefined> = {
        search,
        category,
        sort,
        page,
        minPrice: minPrice || undefined,
        maxPrice: maxPrice || undefined,
        vendorId: vendorId || undefined,
        ...overrides,
      };

      for (const [key, value] of Object.entries(merged)) {
        if (
          value !== undefined &&
          value !== '' &&
          !(key === 'page' && value === 1) &&
          !(key === 'sort' && value === 'newest')
        ) {
          params.set(key, String(value));
        }
      }

      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    },
    [search, category, sort, page, minPrice, maxPrice, vendorId, pathname, router],
  );

  // ─── Fetch Vendors ────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.getVendors({ limit: 100 });
        if (!cancelled) {
          setVendors(res.data);
        }
      } catch {
        // silently fail, vendor filter will just be empty
      } finally {
        if (!cancelled) setVendorsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Fetch Products ───────────────────────────────────
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number | boolean | undefined> = {
        page,
        limit: 12,
      };
      if (search) params.search = search;
      if (category) params.category = category;
      if (vendorId) params.vendorId = vendorId;
      if (sort) params.sort = sort;
      if (minPrice) params.minPrice = Number(minPrice);
      if (maxPrice) params.maxPrice = Number(maxPrice);

      const res: PaginatedResponse<Product> = await api.getProducts(params);
      setProducts(res.data);
      setTotalPages(res.totalPages);
      setTotal(res.total);

      // Collect unique category tags from this page's results for the chip filter.
      // We accumulate across fetches so all seen tags remain available.
      setAllCategoryTags((prev) => {
        const newTags = new Set(prev);
        for (const p of res.data) {
          for (const tag of p.categoryTags) {
            newTags.add(tag);
          }
        }
        return Array.from(newTags).sort();
      });
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [page, search, category, vendorId, sort, minPrice, maxPrice]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Sync URL whenever filter state changes (after initial mount)
  useEffect(() => {
    updateUrl({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, category, sort, page, minPrice, maxPrice, vendorId]);

  // ─── Handlers ─────────────────────────────────────────

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  };

  const handleCategorySelect = (tag: string) => {
    setCategory(tag === category ? '' : tag);
    setPage(1);
  };

  const handleSortChange = (value: SortValue) => {
    setSort(value);
    setPage(1);
  };

  const handleVendorChange = (id: string) => {
    setVendorId(id);
    setPage(1);
  };

  const handlePriceApply = () => {
    setPage(1);
    // fetchProducts will fire via effect
  };

  const clearAllFilters = () => {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setSort('newest');
    setMinPrice('');
    setMaxPrice('');
    setVendorId('');
    setPage(1);
  };

  // ─── Active filters ───────────────────────────────────

  const activeFilters = useMemo(() => {
    const filters: { key: string; label: string; onRemove: () => void }[] = [];
    if (search) {
      filters.push({
        key: 'search',
        label: `Search: "${search}"`,
        onRemove: () => {
          setSearch('');
          setSearchInput('');
          setPage(1);
        },
      });
    }
    if (category) {
      filters.push({
        key: 'category',
        label: `Category: ${category}`,
        onRemove: () => {
          setCategory('');
          setPage(1);
        },
      });
    }
    if (vendorId) {
      const vendorName =
        vendors.find((v) => v.id === vendorId)?.businessName || vendorId;
      filters.push({
        key: 'vendor',
        label: `Vendor: ${vendorName}`,
        onRemove: () => {
          setVendorId('');
          setPage(1);
        },
      });
    }
    if (minPrice || maxPrice) {
      const parts: string[] = [];
      if (minPrice) parts.push(`Min: ${formatPrice(Number(minPrice))}`);
      if (maxPrice) parts.push(`Max: ${formatPrice(Number(maxPrice))}`);
      filters.push({
        key: 'price',
        label: `Price: ${parts.join(' - ')}`,
        onRemove: () => {
          setMinPrice('');
          setMaxPrice('');
          setPage(1);
        },
      });
    }
    if (sort !== 'newest') {
      const sortLabel = SORT_OPTIONS.find((s) => s.value === sort)?.label || sort;
      filters.push({
        key: 'sort',
        label: `Sort: ${sortLabel}`,
        onRemove: () => {
          setSort('newest');
          setPage(1);
        },
      });
    }
    return filters;
  }, [search, category, vendorId, vendors, minPrice, maxPrice, sort]);

  const hasActiveFilters = activeFilters.length > 0;

  // ─── Compute page range for pagination ────────────────
  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= page - 1 && i <= page + 1)
      ) {
        pages.push(i);
      }
    }
    return pages;
  }, [totalPages, page]);

  // ─── Filter Sidebar Content (shared desktop/mobile) ───
  const filterSidebarContent = (
    <div className="space-y-6">
      {/* Sort */}
      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Sort By
        </label>
        <div className="relative">
          <select
            value={sort}
            onChange={(e) => handleSortChange(e.target.value as SortValue)}
            className="input-field appearance-none pr-10 text-sm"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 pointer-events-none" />
        </div>
      </div>

      {/* Price Range */}
      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Price Range
        </label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            placeholder="Min"
            min="0"
            step="0.01"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
            onBlur={handlePriceApply}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePriceApply();
            }}
            className="input-field text-sm w-full"
          />
          <span className="text-primary/40 text-sm shrink-0">to</span>
          <input
            type="number"
            placeholder="Max"
            min="0"
            step="0.01"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            onBlur={handlePriceApply}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handlePriceApply();
            }}
            className="input-field text-sm w-full"
          />
        </div>
      </div>

      {/* Vendor Filter */}
      <div>
        <label className="block text-sm font-semibold text-primary mb-2">
          Vendor
        </label>
        <div className="relative">
          <select
            value={vendorId}
            onChange={(e) => handleVendorChange(e.target.value)}
            disabled={vendorsLoading}
            className="input-field appearance-none pr-10 text-sm"
          >
            <option value="">All Vendors</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.businessName}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 pointer-events-none" />
        </div>
      </div>

      {/* Category Tags */}
      {allCategoryTags.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-primary mb-2">
            Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {allCategoryTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleCategorySelect(tag)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  category === tag
                    ? 'bg-teal text-white'
                    : 'bg-white text-primary/70 hover:bg-teal/10 border border-light'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Clear All (mobile) */}
      {hasActiveFilters && (
        <button
          onClick={() => {
            clearAllFilters();
            setMobileFiltersOpen(false);
          }}
          className="btn-outline w-full text-sm"
        >
          Clear All Filters
        </button>
      )}
    </div>
  );

  // ─── Results info string ──────────────────────────────
  const resultsStart = total > 0 ? (page - 1) * 12 + 1 : 0;
  const resultsEnd = Math.min(page * 12, total);

  return (
    <div className="min-h-screen bg-light">
      {/* Page Header */}
      <div className="bg-white border-b border-light">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">
            Local Marketplace
          </h1>
          <p className="text-primary/60 text-lg">
            Shop unique products from Fond du Lac&apos;s local artisans and businesses
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Bar */}
        <div className="flex gap-3 mb-6">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary/40" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="input-field pl-12 w-full"
            />
          </form>
          {/* Mobile filter toggle */}
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="lg:hidden flex items-center gap-2 px-4 py-2 rounded-lg border border-light bg-white text-primary/70 hover:bg-light transition-colors shrink-0"
            aria-label="Toggle filters"
          >
            <Filter className="w-5 h-5" />
            <span className="text-sm font-medium">Filters</span>
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-teal text-white text-xs flex items-center justify-center font-bold">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-sm text-primary/50 font-medium mr-1">Active filters:</span>
            {activeFilters.map((f) => (
              <FilterChip key={f.key} label={f.label} onRemove={f.onRemove} />
            ))}
            <button
              onClick={clearAllFilters}
              className="text-sm text-primary/50 hover:text-accent underline underline-offset-2 ml-2 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Main Layout: Sidebar + Grid */}
        <div className="flex gap-8">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block w-64 shrink-0">
            <div className="sticky top-24 bg-white rounded-xl border border-light p-5">
              <h2 className="text-sm font-bold text-primary uppercase tracking-wider mb-4 flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4" />
                Filters
              </h2>
              {filterSidebarContent}
            </div>
          </aside>

          {/* Mobile Filter Overlay */}
          {mobileFiltersOpen && (
            <div className="fixed inset-0 z-50 lg:hidden">
              {/* Backdrop */}
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setMobileFiltersOpen(false)}
              />
              {/* Panel */}
              <div className="absolute right-0 top-0 bottom-0 w-80 max-w-[85vw] bg-white shadow-2xl overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-light">
                  <h2 className="text-lg font-bold text-primary flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5" />
                    Filters
                  </h2>
                  <button
                    onClick={() => setMobileFiltersOpen(false)}
                    className="p-2 rounded-lg hover:bg-light transition-colors"
                    aria-label="Close filters"
                  >
                    <X className="w-5 h-5 text-primary/60" />
                  </button>
                </div>
                <div className="p-4">{filterSidebarContent}</div>
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="flex-1 min-w-0">
            {/* Results Count & Sort (desktop inline) */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-primary/60">
                {loading ? (
                  <span className="inline-block w-40 h-4 bg-light rounded animate-pulse" />
                ) : total > 0 ? (
                  <>
                    Showing{' '}
                    <span className="font-semibold text-primary">
                      {resultsStart}&ndash;{resultsEnd}
                    </span>{' '}
                    of{' '}
                    <span className="font-semibold text-primary">{total}</span>{' '}
                    products
                  </>
                ) : (
                  'No products found'
                )}
              </p>

              {/* Desktop sort (quick access) */}
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-sm text-primary/50">Sort:</span>
                <div className="relative">
                  <select
                    value={sort}
                    onChange={(e) => handleSortChange(e.target.value as SortValue)}
                    className="appearance-none bg-white border border-light rounded-lg px-3 py-1.5 pr-8 text-sm text-primary font-medium focus:outline-none focus:ring-2 focus:ring-teal/30 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/40 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="card animate-pulse">
                    <div className="aspect-square bg-light" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-light rounded w-1/3" />
                      <div className="h-4 bg-light rounded w-2/3" />
                      <div className="h-3 bg-light rounded w-1/2" />
                      <div className="h-5 bg-light rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {products.map((product) => (
                  <EnhancedProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <ShoppingBag className="w-16 h-16 text-primary/20 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-primary mb-2">
                  No Products Found
                </h3>
                <p className="text-primary/60 mb-6 max-w-md mx-auto">
                  {search
                    ? `No products match "${search}". Try adjusting your filters or search term.`
                    : hasActiveFilters
                      ? 'No products match your current filters. Try removing some filters.'
                      : 'Check back soon for new products from local vendors.'}
                </p>
                {hasActiveFilters && (
                  <button onClick={clearAllFilters} className="btn-primary">
                    Clear All Filters
                  </button>
                )}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && !loading && (
              <div className="flex items-center justify-center gap-2 mt-12">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-light hover:bg-light disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                {pageNumbers.map((p, i, arr) => (
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
      </div>
    </div>
  );
}

// ─── Page Export (Suspense boundary for useSearchParams) ─

export default function MarketplacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-light">
          <div className="bg-white border-b border-light">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="h-10 w-64 bg-light rounded animate-pulse mb-2" />
              <div className="h-6 w-96 bg-light rounded animate-pulse" />
            </div>
          </div>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="h-12 bg-light rounded animate-pulse mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="card animate-pulse">
                  <div className="aspect-square bg-light" />
                  <div className="p-4 space-y-3">
                    <div className="h-3 bg-light rounded w-1/3" />
                    <div className="h-4 bg-light rounded w-2/3" />
                    <div className="h-5 bg-light rounded w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      }
    >
      <MarketplaceContent />
    </Suspense>
  );
}
